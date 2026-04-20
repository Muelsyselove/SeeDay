import {
  getTimelineByDate,
  getTimelineByDateAndDevice,
} from "../db";
import type { ActivityRecord, TimelineSegment } from "../types";
import { musicApps, videoApps } from "../services/privacy-tiers";
import { db } from "../db";

export function handleTimeline(url: URL): Response {
  const toLocalDatetimeStr = (d: Date) => {
    return `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json(
      { error: "date parameter required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  // Accept timezone offset in minutes (e.g. -480 for UTC+8)
  const tzParam = url.searchParams.get("tz");
  const tzOffsetMinutes = tzParam ? parseInt(tzParam, 10) : 0;

  const deviceId = url.searchParams.get("device_id");

  let activities: ActivityRecord[];

  // For cross-day activities, we need to include activities from previous days that might continue into the target date
  // We'll handle this in the processing logic, not in the query
  // Query activities from a wider range to ensure we capture all relevant data
  const query = deviceId
    ? db.prepare(`SELECT *, is_foreground FROM activities WHERE started_at >= datetime(?, '-2 days') AND started_at <= datetime(?, '+1 day') AND device_id = ? ORDER BY started_at ASC`)
    : db.prepare(`SELECT *, is_foreground FROM activities WHERE started_at >= datetime(?, '-2 days') AND started_at <= datetime(?, '+1 day') ORDER BY started_at ASC`);

  activities = deviceId
    ? (query.all(date, date, deviceId) as ActivityRecord[])
    : (query.all(date, date) as ActivityRecord[]);

  const INPUT_METHOD_APPS = new Set([
    "textinputhost.exe", "shellhost.exe", "ctfmon.exe", "sogoucloud.exe",
    "sogoupy.exe", "sogoupy.ime", "mspy.exe", "inputmethodhost.exe",
    "imetool.exe", "chsunime.exe", "pfutime.exe", "msctf.exe",
    "inputpersonalization.exe", "searchindexer.exe", "searchhost.exe",
  ]);

  activities = activities.filter(a => {
    const t = (a.display_title || "").toLowerCase();
    const appId = (a.app_id || "").toLowerCase();
    if (t.includes("桌面歌词") || t.includes("desktoplyric") || t === "program manager") return false;
    if (INPUT_METHOD_APPS.has(appId)) return false;
    return true;
  });

  const deviceStates = db.prepare(`SELECT device_id, last_seen_at, is_online FROM device_states`).all() as Array<{ device_id: string; last_seen_at: string; is_online: number }>;
  const deviceOnlineMap = new Map<string, { lastSeenAt: Date; isOnline: boolean }>();
  const now = new Date();
  for (const ds of deviceStates) {
    const lastSeen = new Date(ds.last_seen_at);
    const offlineMinutes = (now.getTime() - lastSeen.getTime()) / 60000;
    deviceOnlineMap.set(ds.device_id, {
      lastSeenAt: lastSeen,
      isOnline: ds.is_online === 1 && offlineMinutes < 15
    });
  }

  const runningAppsByDevice = new Map<string, Set<string>>();
  const runningAppRows = db.prepare(`SELECT device_id, app_name FROM device_app_states WHERE last_seen_at > datetime('now', '-5 minutes')`).all() as Array<{ device_id: string; app_name: string }>;
  for (const row of runningAppRows) {
    if (!runningAppsByDevice.has(row.device_id)) {
      runningAppsByDevice.set(row.device_id, new Set());
    }
    runningAppsByDevice.get(row.device_id)!.add(row.app_name);
  }

  const GAP_THRESHOLD_MS = 2 * 60 * 1000;
  // Quick switch threshold: if time between two same app activities is within 10 minutes,
  // merge them into one entry even if there were other apps in between.
  const QUICK_SWITCH_THRESHOLD_MS = 10 * 60 * 1000;

  // Group activities by device
  const activitiesByDevice = new Map<string, ActivityRecord[]>();
  for (const activity of activities) {
    if (!activitiesByDevice.has(activity.device_id)) {
      activitiesByDevice.set(activity.device_id, []);
    }
    activitiesByDevice.get(activity.device_id)!.push(activity);
  }

  const segments: TimelineSegment[] = [];

  // Process each device's activities
  for (const [deviceId, deviceActivities] of activitiesByDevice) {
    if (deviceActivities.length === 0) continue;

    const deviceOnline = deviceOnlineMap.get(deviceId);
    const isDeviceOnline = deviceOnline ? deviceOnline.isOnline : false;
    const deviceLastSeen = deviceOnline ? deviceOnline.lastSeenAt : null;

    deviceActivities.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

    // First pass: merge consecutive same app activities
    const consecutiveMerged: Array<ActivityRecord & { _lastHeartbeatAt?: string }> = [];
    let currentConsecutive: (ActivityRecord & { _lastHeartbeatAt?: string }) | null = null;

    for (const activity of deviceActivities) {
      if (!currentConsecutive) {
        currentConsecutive = { ...activity, _lastHeartbeatAt: activity.started_at };
      } else if (
        currentConsecutive.app_id === activity.app_id
      ) {
        // Keep the original started_at, update other fields
        // Merge even if display_title or is_foreground changes, but keep the latest values
        currentConsecutive = {
          ...activity,
          started_at: currentConsecutive.started_at,
          _lastHeartbeatAt: activity.started_at,
        };
      } else {
        consecutiveMerged.push(currentConsecutive);
        currentConsecutive = { ...activity, _lastHeartbeatAt: activity.started_at };
      }
    }
    if (currentConsecutive) {
      consecutiveMerged.push(currentConsecutive);
    }

    // Sort merged activities by started_at to ensure correct order
    consecutiveMerged.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

    // Second pass: apply quick switch merging
    // Track app sessions with their start/end times
    const mergedSessions: Array<{
      appId: string;
      displayTitle: string;
      isForeground: number;
      startTime: number;
      endTime: number;
      startActivity: ActivityRecord;
      endActivity: ActivityRecord;
    }> = [];

    for (const activity of consecutiveMerged) {
      const appId = activity.app_id;
      const displayTitle = activity.display_title || "";
      const isForeground = activity.is_foreground;
      const currentTime = new Date(activity.started_at).getTime();
      const lastHeartbeatTime = activity._lastHeartbeatAt ? new Date(activity._lastHeartbeatAt).getTime() : currentTime;
      
      // Check if we can merge with any previous session of the same app
      let merged = false;
      
      for (let i = mergedSessions.length - 1; i >= 0; i--) {
        const session = mergedSessions[i];
        if (session.appId === appId && 
            session.displayTitle === displayTitle) {
          if (currentTime - session.endTime <= QUICK_SWITCH_THRESHOLD_MS) {
            // Merge this activity into the existing session
            mergedSessions[i] = {
              ...session,
              endTime: lastHeartbeatTime,
              endActivity: activity,
              isForeground: isForeground
            };
            merged = true;
            break;
          } else {
            // Too long ago, don't merge
            break;
          }
        }
      }
      
      if (!merged) {
        // Create a new session
        mergedSessions.push({
          appId: appId,
          displayTitle: displayTitle,
          isForeground: isForeground,
          startTime: currentTime,
          endTime: lastHeartbeatTime,
          startActivity: activity,
          endActivity: activity
        });
      }
    }

    // Convert merged sessions to final activities
    const finalActivities = mergedSessions.map(session => ({
      ...session.endActivity,
      started_at: session.startActivity.started_at,
      _endTime: session.endTime,
    }));

    const lastActivityByApp = new Map<string, number>();
    for (let i = 0; i < finalActivities.length; i++) {
      lastActivityByApp.set(finalActivities[i].app_name, i);
    }

    const runningApps = runningAppsByDevice.get(deviceId) || new Set<string>();

    // started_at is stored as device local time string (e.g. "2026-04-20 21:30:00")
    // new Date() on UTC server parses it as UTC, so we compare in UTC directly
    // The date param is the user's local date, we treat it as UTC for comparison
    let targetDateStart = new Date(date + 'T00:00:00');
    let targetDateEnd = new Date(date + 'T23:59:59');

    const loopNow = new Date();
    const isToday = loopNow >= targetDateStart && loopNow <= targetDateEnd;

    for (let i = 0; i < finalActivities.length; i++) {
      const a = finalActivities[i];
      const isLastActivity = i === finalActivities.length - 1;
      const isLastForApp = lastActivityByApp.get(a.app_name) === i;
      const isAppCurrentlyRunning = isDeviceOnline && isToday && runningApps.has(a.app_name);

      const startDate = new Date(a.started_at);
      const startMs = startDate.getTime();
      if (isNaN(startMs)) continue;

      let endedAt: string | null = null;
      if (isLastForApp) {
        if (isAppCurrentlyRunning) {
          endedAt = null;
        } else {
          const endTimeMs = a._endTime;
          if (endTimeMs != null && !isNaN(endTimeMs) && endTimeMs > startMs) {
            endedAt = toLocalDatetimeStr(new Date(endTimeMs));
          } else if (deviceLastSeen) {
            endedAt = toLocalDatetimeStr(deviceLastSeen);
          } else {
            endedAt = toLocalDatetimeStr(new Date(startMs + 60_000));
          }
        }
      } else {
        endedAt = finalActivities[i + 1].started_at;
      }

      let endDate = endedAt ? new Date(endedAt) : new Date();
      let endMs = endDate.getTime();
      if (isNaN(endMs)) endMs = startMs;

      if (endMs <= startMs) {
        endMs = startMs + 60_000;
        endDate = new Date(endMs);
        endedAt = toLocalDatetimeStr(endDate);
      }

      if (!isLastActivity && endedAt && endMs - startMs > GAP_THRESHOLD_MS) {
        let lastHeartbeatMs = (a._endTime != null && !isNaN(a._endTime)) ? a._endTime : startMs + 60_000;
        if (lastHeartbeatMs <= startMs) lastHeartbeatMs = startMs + 60_000;
        endMs = lastHeartbeatMs;
        endDate = new Date(endMs);
        endedAt = toLocalDatetimeStr(endDate);
      }

      const activityStart = new Date(a.started_at);
      const activityEnd = endedAt ? new Date(endedAt) : new Date();

      const shouldInclude = activityStart < targetDateEnd && activityEnd > targetDateStart;
      
      if (shouldInclude) {
        // Calculate the segment start and end times for the target date
        const segmentStart = new Date(Math.max(startMs, targetDateStart.getTime()));
        const segmentEnd = new Date(Math.min(endMs, targetDateEnd.getTime()));
        const segmentDurationMinutes = Math.max(0, Math.round((segmentEnd.getTime() - segmentStart.getTime()) / 60000));

        // Determine if this activity is currently running
        const isRunning = isLastActivity ? (isDeviceOnline && isToday) : false;

        // For activities that start before the target date and continue into it
        // we should show them as starting at the beginning of the target date
        if (startDate < targetDateStart && endDate > targetDateStart) {
          const adjustedStart = new Date(targetDateStart);
          segments.push({
            app_name: a.app_name,
            app_id: a.app_id,
            display_title: a.display_title || "",
            started_at: toLocalDatetimeStr(adjustedStart),
            ended_at: isAppCurrentlyRunning && isLastForApp && segmentEnd >= targetDateEnd ? null : toLocalDatetimeStr(segmentEnd),
            duration_minutes: isAppCurrentlyRunning && isLastForApp && segmentEnd >= targetDateEnd
              ? Math.max(0, Math.round((Date.now() - segmentStart.getTime()) / 60000))
              : segmentDurationMinutes,
            device_id: a.device_id,
            device_name: a.device_name,
            is_foreground: a.is_foreground === 1
          });
        } else if (startDate >= targetDateStart && endDate <= targetDateEnd) {
          segments.push({
            app_name: a.app_name,
            app_id: a.app_id,
            display_title: a.display_title || "",
            started_at: a.started_at,
            ended_at: isAppCurrentlyRunning && isLastForApp ? null : endedAt,
            duration_minutes: isAppCurrentlyRunning && isLastForApp
              ? Math.max(0, Math.round((Date.now() - startMs) / 60000))
              : segmentDurationMinutes,
            device_id: a.device_id,
            device_name: a.device_name,
            is_foreground: a.is_foreground === 1
          });
        } else if (startDate >= targetDateStart && endDate > targetDateEnd) {
          segments.push({
            app_name: a.app_name,
            app_id: a.app_id,
            display_title: a.display_title || "",
            started_at: a.started_at,
            ended_at: isAppCurrentlyRunning && isLastForApp ? null : toLocalDatetimeStr(targetDateEnd),
            duration_minutes: isAppCurrentlyRunning && isLastForApp
              ? Math.max(0, Math.round((Date.now() - startMs) / 60000))
              : segmentDurationMinutes,
            device_id: a.device_id,
            device_name: a.device_name,
            is_foreground: a.is_foreground === 1
          });
        }
      }
    }
  }

  // Build summary: total minutes per app per device
  const summary: Record<string, Record<string, number>> = {};
  for (const s of segments) {
    if (!summary[s.device_id]) {
      summary[s.device_id] = {};
    }
    if (!summary[s.device_id][s.app_name]) {
      summary[s.device_id][s.app_name] = 0;
    }
    summary[s.device_id][s.app_name] += s.duration_minutes;
  }

  return Response.json({ date, segments, summary });
}
