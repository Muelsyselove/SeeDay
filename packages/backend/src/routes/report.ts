import { authenticateToken } from "../middleware/auth";
import { resolveAppName } from "../services/app-mapper";
import { isNSFW } from "../services/nsfw-filter";
import { processDisplayTitle } from "../services/privacy-tiers";
import { insertActivity, upsertDeviceState, upsertDeviceAppState, hmacTitle, resetDeviceForeground, expireStaleAppStates } from "../db";

const MAX_TITLE_LENGTH = 256;

export async function handleReport(req: Request): Promise<Response> {
  const toLocalDatetimeStr = (d: Date) => {
    return `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

    // Auth
  const device = authenticateToken(req.headers.get("authorization"));
  if (!device) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Parse multiple apps from semicolon-separated format
  const appIds = typeof body.app_id === "string" ? body.app_id.split(";;") : [];
  const windowTitles = typeof body.window_title === "string" ? body.window_title.split(";;") : [];
  const isForegrounds = typeof body.is_foreground === "string" ? body.is_foreground.split(";;").map((s: string) => s.trim() === "1") : [];

  if (appIds.length === 0) {
    return Response.json({ error: "app_id required" }, { status: 400 });
  }

  if (appIds.length !== windowTitles.length || appIds.length !== isForegrounds.length) {
    return Response.json({ error: "Inconsistent array lengths" }, { status: 400 });
  }

  // Validate timestamp format: 年;月;日;xx:xx
  // Agent sends local time, we store it as local datetime string for SQLite
  // This avoids timezone conversion issues
  let startedAt: string;
  if (typeof body.timestamp === "string" && body.timestamp) {
    const parts = body.timestamp.split(";").map((s: string) => s.trim());
    if (parts.length === 4) {
      const [year, month, day, time] = parts;
      const timeParts = time.split(":");
      if (timeParts.length === 2) {
        const [hour, minute] = timeParts;
        const localTs = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        if (!isNaN(localTs.getTime())) {
          // Format as local datetime string for SQLite (YYYY-MM-DD HH:MM:SS)
          const localStr = `${String(localTs.getFullYear()).padStart(4, '0')}-${String(localTs.getMonth() + 1).padStart(2, '0')}-${String(localTs.getDate()).padStart(2, '0')} ${String(localTs.getHours()).padStart(2, '0')}:${String(localTs.getMinutes()).padStart(2, '0')}:${String(localTs.getSeconds()).padStart(2, '0')}`;
          startedAt = localStr;
        } else {
          startedAt = toLocalDatetimeStr(new Date());
        }
      } else {
        startedAt = toLocalDatetimeStr(new Date());
      }
    } else {
      startedAt = toLocalDatetimeStr(new Date());
    }
  } else {
    startedAt = toLocalDatetimeStr(new Date());
  }

  // Parse extra (battery, etc.) — whitelist fields first, then serialize
  let extraJson = "{}";
  if (body.extra && typeof body.extra === "object" && !Array.isArray(body.extra)) {
    const extra: Record<string, unknown> = {};
    if (typeof body.extra.battery_percent === "number" && Number.isFinite(body.extra.battery_percent)) {
      extra.battery_percent = Math.max(0, Math.min(100, Math.round(body.extra.battery_percent)));
    }
    if (typeof body.extra.battery_charging === "boolean") {
      extra.battery_charging = body.extra.battery_charging;
    }
    const rawMusic = body.extra.music;
    if (rawMusic != null && typeof rawMusic === "object" && !Array.isArray(rawMusic)) {
      const music: Record<string, string> = {};
      if (typeof rawMusic.title === "string") music.title = rawMusic.title.slice(0, 256);
      if (typeof rawMusic.artist === "string") music.artist = rawMusic.artist.slice(0, 256);
      if (typeof rawMusic.app === "string") music.app = rawMusic.app.slice(0, 64);
      if (Object.keys(music).length > 0) {
        extra.music = music;
      }
    }
    extraJson = JSON.stringify(extra);
  }

  // Process each app
  resetDeviceForeground.run(device.device_id);
  for (let i = 0; i < appIds.length; i++) {
    const appId = appIds[i].trim();
    if (!appId) continue;

    const windowTitle = windowTitles[i]?.slice(0, MAX_TITLE_LENGTH) || "";
    const isForeground = isForegrounds[i] || false;

    // NSFW filter - silently discard
    if (isNSFW(appId, windowTitle)) {
      continue;
    }

    // Resolve app name
    const appName = resolveAppName(appId, device.platform);

    // Privacy: generate display_title (safe for public), then discard raw window_title
    const displayTitle = processDisplayTitle(appName, windowTitle);

    // Dedup: HMAC hash of the original title (keyed, not reversible)
    const timeBucket = Math.floor(new Date(startedAt).getTime() / 10000);
    const titleHash = hmacTitle(windowTitle.toLowerCase().trim());

    // Insert activity — window_title is NEVER stored (privacy: empty string)
    try {
      insertActivity.run(
        device.device_id,
        device.device_name,
        device.platform,
        appId,
        appName,
        "",           // window_title: always empty for privacy
        displayTitle,
        titleHash,
        timeBucket,
        startedAt,
        isForeground ? 1 : 0
      );
    } catch (e: any) {
      // Log but don't expose internals
      if (!e.message?.includes("UNIQUE constraint")) {
        console.error("[report] DB insert error:", e.message);
      }
    }

    // Always update device state (even if activity was deduped)
    // Only update device state for the foreground app
    if (isForeground || i === 0) {
      try {
        upsertDeviceState.run(
          device.device_id,
          device.device_name,
          device.platform,
          appId,
          appName,
          "",           // window_title: always empty for privacy
          displayTitle,
          toLocalDatetimeStr(new Date()),
          extraJson,
          isForeground ? 1 : 0
        );
      } catch (e: any) {
        console.error("[report] Device state update error:", e.message);
        return Response.json({ error: "Internal error" }, { status: 500 });
      }
    }

    // Also update device app state (for multi-app tracking)
    try {
      upsertDeviceAppState.run(
        device.device_id,
        device.device_name,
        device.platform,
        appId,
        appName,
        "",           // window_title: always empty for privacy
        displayTitle,
        toLocalDatetimeStr(new Date()),
        extraJson,
        isForeground ? 1 : 0
      );
    } catch (e: any) {
      console.error("[report] Device app state update error:", e.message);
      // Continue even if device app state update fails
    }
  }

  const reportedAppIds = JSON.stringify(appIds.filter((id: string) => id.trim()));
  try {
    expireStaleAppStates.run(device.device_id, reportedAppIds);
  } catch (e: any) {
    console.error("[report] Expire stale app states error:", e.message);
  }

  return Response.json({ ok: true });
}
