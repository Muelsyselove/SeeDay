/**
 * GET /api/dashboard
 *
 * Structured, UI-independent view of everything the frontend dashboard renders.
 * Reuses the existing /api/current, /api/timeline and /api/daily-summary logic
 * so this endpoint always stays consistent with what the UI displays.
 *
 * Query params:
 *   date      - YYYY-MM-DD (default: today in the caller's timezone)
 *   tz        - timezone offset in minutes, same convention as JS
 *               getTimezoneOffset() (e.g. -480 for UTC+8, default 0)
 *   device_id - optional, filter timeline & stats to a single device
 */

import { handleCurrent } from "./current";
import { handleTimeline } from "./timeline";
import { handleDailySummary } from "./daily-summary";
import { musicApps, videoApps, getAppVerb } from "../services/privacy-tiers";

type Segment = {
  app_name: string;
  app_id: string;
  display_title?: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  device_id: string;
  device_name: string;
  is_foreground?: number | boolean;
};

/** Parse "YYYY-MM-DD HH:MM:SS" consistently as UTC-based epoch (format is device-local wall time). */
function parseLocal(s: string): number {
  const t = new Date(s.replace(" ", "T") + "Z").getTime();
  return isNaN(t) ? 0 : t;
}

function stripBiliSuffix(title: string): string {
  return title.replace(/\s*\(゜-゜\)つロ\s*干杯~-bilibili\s*$/i, "");
}

export async function handleDashboard(req: Request, url: URL): Promise<Response> {
  // ── params ──
  const tzParam = url.searchParams.get("tz");
  let tzOffsetMinutes = tzParam !== null && !isNaN(parseInt(tzParam, 10)) ? parseInt(tzParam, 10) : 0;
  const deviceId = url.searchParams.get("device_id") || undefined;

  const nowMs = Date.now();
  const localNowMs = nowMs - tzOffsetMinutes * 60_000;

  let date = url.searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // Default: caller-local "today"
    date = new Date(localNowMs).toISOString().slice(0, 10);
  }

  // ── reuse existing handlers ──
  const clientIp =
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "";
  const currentData = await (handleCurrent(clientIp, req.headers.get("user-agent") || undefined) as Response).json();

  const timelineUrl = new URL("http://localhost/api/timeline");
  timelineUrl.searchParams.set("date", date);
  timelineUrl.searchParams.set("tz", String(tzOffsetMinutes));
  if (deviceId) timelineUrl.searchParams.set("device_id", deviceId);
  const timelineRes = handleTimeline(timelineUrl);
  const timelineData = timelineRes.status === 200 ? await timelineRes.json() : { date, segments: [], summary: {} };

  const summaryUrl = new URL("http://localhost/api/daily-summary");
  summaryUrl.searchParams.set("date", date);
  const summaryRes = handleDailySummary(summaryUrl);
  const dailySummary = summaryRes.status === 200 ? await summaryRes.json() : null;

  const segments: Segment[] = timelineData.segments ?? [];

  // ── derived stats (mirror the frontend's client-side computations) ──

  // Total screen time — merge overlapping intervals to avoid double-counting
  const intervals: { start: number; end: number }[] = [];
  for (const s of segments) {
    const start = parseLocal(s.started_at);
    const end = s.ended_at ? parseLocal(s.ended_at) : localNowMs;
    if (end > start) intervals.push({ start, end });
  }
  intervals.sort((a, b) => a.start - b.start);
  let mergedMs = 0;
  if (intervals.length) {
    let curStart = intervals[0].start;
    let curEnd = intervals[0].end;
    for (let i = 1; i < intervals.length; i++) {
      if (intervals[i].start <= curEnd) {
        curEnd = Math.max(curEnd, intervals[i].end);
      } else {
        mergedMs += curEnd - curStart;
        curStart = intervals[i].start;
        curEnd = intervals[i].end;
      }
    }
    mergedMs += curEnd - curStart;
  }
  const totalScreenMinutes = Math.round(mergedMs / 60_000);

  // Top apps by usage (chart data)
  const appMinutes = new Map<string, number>();
  for (const s of segments) {
    const mins = s.ended_at === null
      ? Math.max(1, Math.round((localNowMs - parseLocal(s.started_at)) / 60_000))
      : s.duration_minutes;
    appMinutes.set(s.app_name, (appMinutes.get(s.app_name) || 0) + mins);
  }
  const topApps = Array.from(appMinutes.entries())
    .map(([app_name, minutes]) => ({ app_name, minutes, verb: getAppVerb(app_name) }))
    .sort((a, b) => b.minutes - a.minutes);

  // Music / video stats
  const musicAppMins = new Map<string, number>();
  const videoAppMins = new Map<string, number>();
  const mediaItems = new Map<string, { type: "music" | "video"; app_name: string; title: string; duration_minutes: number; is_playing: boolean; first_played_at: string }>();

  for (const s of segments) {
    const lower = s.app_name.toLowerCase();
    const isMusic = musicApps.has(lower) || musicApps.has(s.app_name);
    const isVideo = videoApps.has(lower) || videoApps.has(s.app_name);
    if (!isMusic && !isVideo) continue;

    const title = stripBiliSuffix(s.display_title || "");
    if (!title || title === "桌面歌词") continue;

    const dur = s.ended_at === null
      ? Math.max(1, Math.round((localNowMs - parseLocal(s.started_at)) / 60_000))
      : s.duration_minutes;
    const playing = s.ended_at === null;

    if (isMusic) musicAppMins.set(s.app_name, (musicAppMins.get(s.app_name) || 0) + dur);
    if (isVideo) videoAppMins.set(s.app_name, (videoAppMins.get(s.app_name) || 0) + dur);

    const key = `${isMusic ? "music" : "video"}-${title}`;
    const existing = mediaItems.get(key);
    if (existing) {
      existing.duration_minutes += dur;
      if (playing) existing.is_playing = true;
    } else {
      mediaItems.set(key, {
        type: isMusic ? "music" : "video",
        app_name: s.app_name,
        title,
        duration_minutes: dur,
        is_playing: playing,
        first_played_at: s.started_at,
      });
    }
  }

  const mediaList = Array.from(mediaItems.values()).sort((a, b) => {
    if (a.is_playing && !b.is_playing) return -1;
    if (!a.is_playing && b.is_playing) return 1;
    return a.first_played_at.localeCompare(b.first_played_at);
  });

  // ── active device (the one the "此刻在线" panel highlights) ──
  const onlineDevices = (currentData.devices ?? []).filter((d: any) => d.is_online === 1);
  let activeDevice: Record<string, unknown> | null = null;
  if (onlineDevices.length) {
    const best = onlineDevices.reduce((a: any, b: any) =>
      new Date(b.last_seen_at || 0).getTime() > new Date(a.last_seen_at || 0).getTime() ? b : a
    );
    activeDevice = {
      device_id: best.device_id,
      device_name: best.device_name,
      platform: best.platform,
      last_seen_at: best.last_seen_at,
      current_app: best.app_name ?? null,
      display_title: best.display_title ?? null,
      activity_verb: best.app_name ? getAppVerb(best.app_name) : null,
      battery: best.extra?.battery_percent ?? null,
      battery_charging: best.extra?.battery_charging ?? null,
      music: best.extra?.music ?? null,
    };
  }

  // ── running apps grouped by device (foreground first) ──
  const runningAppsByDevice: Record<string, Array<Record<string, unknown>>> = {};
  for (const d of currentData.device_app_states ?? []) {
    if (!runningAppsByDevice[d.device_id]) runningAppsByDevice[d.device_id] = [];
    runningAppsByDevice[d.device_id].push({
      app_name: d.app_name,
      app_id: d.app_id,
      display_title: d.display_title ?? "",
      is_foreground: d.is_foreground === 1,
      last_seen_at: d.last_seen_at,
    });
  }
  for (const list of Object.values(runningAppsByDevice)) {
    list.sort((a, b) => (Number(b.is_foreground) - Number(a.is_foreground)) || (String(b.last_seen_at).localeCompare(String(a.last_seen_at))));
  }

  return Response.json({
    meta: {
      api: "dashboard",
      version: "1.0",
      date,
      timezone_offset_minutes: tzOffsetMinutes,
      device_filter: deviceId ?? null,
      server_time: currentData.server_time,
      viewer_count: currentData.viewer_count ?? 0,
      is_today: new Date(localNowMs).toISOString().slice(0, 10) === date,
    },
    devices: currentData.devices ?? [],
    active_device: activeDevice,
    running_apps_by_device: runningAppsByDevice,
    recent_activities: currentData.recent_activities ?? [],
    timeline: {
      date: timelineData.date ?? date,
      segments,
      summary: timelineData.summary ?? {},
    },
    daily_summary: dailySummary,
    stats: {
      total_screen_minutes: totalScreenMinutes,
      top_apps: topApps,
      media: {
        music_total_minutes: Array.from(musicAppMins.values()).reduce((a, b) => a + b, 0),
        video_total_minutes: Array.from(videoAppMins.values()).reduce((a, b) => a + b, 0),
        music_by_app: Object.fromEntries(musicAppMins),
        video_by_app: Object.fromEntries(videoAppMins),
        items: mediaList,
      },
    },
  });
}
