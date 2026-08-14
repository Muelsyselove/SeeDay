/**
 * GET /api/dashboard/view
 *
 * 渲染级（视图模型）数据接口：输出与前端 UI 完全一致的、已经过全部业务处理
 * 的展示信息（格式化时间、中文文案、动词、颜色、分组层级、徽标等）。
 * 第三方只需用 HTML/CSS 渲染本响应即可复刻网站信息，无需复制任何前端逻辑。
 *
 * 内部基于 GET /api/dashboard 的原始结构化数据加工，复刻 DefaultLayout 的
 * 客户端计算（分组、排序、时长合并、调色板分配、媒体聚合、文案模板等）。
 *
 * Query 参数与 /api/dashboard 相同：
 *   date / tz / device_id
 */

import { handleDashboard } from "./dashboard";
import { getAppVerb } from "../services/privacy-tiers";
// 复用前端的描述文案库（纯 TS 模块，无 React 依赖），保证文案与站点一致
import { getAppDescription } from "../../../frontend/src/lib/app-descriptions";

/* ═══ 与前端一致的格式化工具（DefaultLayout.tsx） ═══ */

const PALETTE = [
  "#e8a0b4", "#a0c4a8", "#d4b896", "#8fb8c8", "#c4a8d4", "#b8c8a0",
  "#d4a0a0", "#a0b8d4", "#c8c4a0", "#b4a0c4", "#a0d4c4", "#d4c4a0",
];

function fmtDur(m: number): string {
  if (!Number.isFinite(m) || m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${r}m` : `${h}h`;
}

/** "YYYY-MM-DD HH:MM:SS" → "HH:MM"（设备本地墙钟，直接截取即可） */
function hhmm(s: string): string {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? s.slice(11, 16) : "--:--";
}

function fmtTimeRange(s: string, e: string | null): string {
  return `${hhmm(s)} – ${e ? hhmm(e) : "现在"}`;
}

/** 解析墙钟字符串为可比较的毫秒值（统一按 UTC 解析，仅作差值运算） */
function parseLocal(s: string): number {
  const t = new Date(s.replace(" ", "T") + "Z").getTime();
  return isNaN(t) ? 0 : t;
}

function offsetDate(s: string, n: number): string {
  const d = new Date(s + "T00:00:00Z");
  if (isNaN(d.getTime())) return s;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtDateCN(s: string): string {
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return s;
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}月${d}日 ${weekdays[dow]}`;
}

function greeting(localHour: number): string {
  if (localHour >= 5 && localHour < 9) return "晨光微熹";
  if (localHour >= 9 && localHour < 12) return "日上花梢";
  if (localHour >= 12 && localHour < 14) return "午后小憩";
  if (localHour >= 14 && localHour < 18) return "斜阳渐长";
  if (localHour >= 18 && localHour < 22) return "暮色四合";
  return "夜阑人静";
}

function cleanTitle(title: string): string {
  return title.replace(/\s*\(゜-゜\)つロ\s*干杯~-bilibili\s*$/i, "");
}

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

export async function handleDashboardView(req: Request, url: URL): Promise<Response> {
  const raw = await (await handleDashboard(req, url)).json();

  const tz = raw.meta.timezone_offset_minutes ?? 0;
  const localNowMs = Date.now() - tz * 60_000;
  const localHour = new Date(localNowMs).getUTCHours();
  const isToday: boolean = raw.meta.is_today === true;
  const date: string = raw.meta.date;

  /* ── 设备与前台应用（顶部设备按钮 + "此刻"栏） ── */
  const devices = (raw.devices ?? []) as Array<Record<string, any>>;
  const runningByDev = (raw.running_apps_by_device ?? {}) as Record<string, Array<Record<string, any>>>;

  const onlineDevices = devices.filter((d) => d.is_online === 1);
  const isOnline = onlineDevices.length > 0;

  const foregroundByDev = new Map<string, Record<string, any>>();
  for (const [devId, apps] of Object.entries(runningByDev)) {
    const fg = apps.find((a) => a.is_foreground);
    if (fg) foregroundByDev.set(devId, fg);
  }

  const deviceButtons = devices.map((d) => {
    const isOn = d.is_online === 1;
    const fg = foregroundByDev.get(d.device_id);
    const displayApp = (fg || d) as Record<string, any>;
    let app_text: string | null = null;
    if (isOn) {
      app_text = displayApp.app_name
        + (displayApp.display_title ? ` · ${cleanTitle(displayApp.display_title)}` : "")
        + (fg ? " (前台)" : "");
    }
    let battery_text: string | null = null;
    if (isOn && d.extra && typeof d.extra.battery_percent === "number") {
      battery_text = `${d.extra.battery_charging ? "⚡" : ""}${d.extra.battery_percent}%`;
    }
    return {
      device_id: d.device_id,
      device_name: d.device_name,
      platform: d.platform,
      is_online: isOn,
      status_text: isOn ? null : "离线",
      app_text,
      battery_text,
    };
  });

  /* ── 时间线分组（按设备 → 按应用，时长降序） ── */
  const segments: Segment[] = raw.timeline?.segments ?? [];
  const byDev = new Map<string, { name: string; items: Segment[] }>();
  for (const s of segments) {
    let e = byDev.get(s.device_id);
    if (!e) { e = { name: s.device_name, items: [] }; byDev.set(s.device_id, e); }
    e.items.push(s);
  }

  // 调色板：按（设备分组 → 应用分组时长降序）首次出现顺序分配，与前端一致
  const colorMap = new Map<string, string>();
  const getColor = (app: string): string => {
    let c = colorMap.get(app);
    if (!c) { c = PALETTE[colorMap.size % PALETTE.length]; colorMap.set(app, c); }
    return c;
  };

  const timelineGroups = Array.from(byDev.entries()).map(([devId, { name, items }]) => {
    const sorted = [...items].sort((a, b) => parseLocal(a.started_at) - parseLocal(b.started_at));
    const runningNames = new Set((runningByDev[devId] ?? []).map((a) => a.app_name));

    const byApp = new Map<string, Segment[]>();
    for (const s of sorted) {
      let e = byApp.get(s.app_name);
      if (!e) { e = []; byApp.set(s.app_name, e); }
      e.push(s);
    }

    const app_groups = Array.from(byApp.entries()).map(([appName, appItems]) => {
      const total = appItems.reduce((sum, it) => {
        if (it.ended_at === null) {
          return sum + Math.max(1, Math.round((localNowMs - parseLocal(it.started_at)) / 60_000));
        }
        return sum + it.duration_minutes;
      }, 0);
      const isCurrent = appItems.some((it) => it.ended_at === null) || runningNames.has(appName);
      return {
        app_name: appName,
        total_duration_minutes: total,
        is_current: isCurrent,
        items: appItems,
      };
    }).sort((a, b) => b.total_duration_minutes - a.total_duration_minutes);

    // 分配颜色（时长降序顺序，与前端 chartData + 渲染顺序一致）
    for (const ag of app_groups) getColor(ag.app_name);

    return {
      device_id: devId,
      device_name: name,
      app_groups: app_groups.map((ag) => ({
        app_name: ag.app_name,
        color: colorMap.get(ag.app_name)!,
        verb: getAppVerb(ag.app_name),
        description: getAppDescription(ag.app_name),
        total_duration_text: fmtDur(ag.total_duration_minutes),
        total_duration_minutes: ag.total_duration_minutes,
        is_current: ag.is_current,
        now_badge: ag.is_current && isToday ? "Now" : null,
        items: ag.items.map((it) => {
          const liveMins = it.ended_at === null
            ? Math.max(1, Math.round((localNowMs - parseLocal(it.started_at)) / 60_000))
            : it.duration_minutes;
          const cleaned = cleanTitle(it.display_title || "");
          return {
            time_range_text: fmtTimeRange(it.started_at, it.ended_at),
            started_at: it.started_at,
            ended_at: it.ended_at,
            title_text: cleaned ? `${getAppVerb(ag.app_name)}${cleaned}` : "-",
            activity_description: getAppDescription(
              ag.app_name, it.display_title || undefined, undefined, it.is_foreground === 1
            ),
            duration_minutes: liveMins,
            duration_text: fmtDur(liveMins),
          };
        }),
      })),
    };
  });

  /* ── 使用图表 Top 6（跨设备累计） ── */
  const appMins = new Map<string, number>();
  for (const g of timelineGroups) {
    for (const ag of g.app_groups) {
      appMins.set(ag.app_name, (appMins.get(ag.app_name) || 0) + ag.total_duration_minutes);
    }
  }
  const chartSorted = Array.from(appMins.entries())
    .map(([name, mins]) => ({ app_name: name, minutes: mins, color: getColor(name) }))
    .sort((a, b) => b.minutes - a.minutes);
  const top6 = chartSorted.slice(0, 6);
  const maxChartMins = top6.length ? top6[0].minutes : 1;

  /* ── 媒体（音乐/视频）区块 ── */
  const mediaRaw = raw.stats?.media ?? {};
  const musicTotal: number = mediaRaw.music_total_minutes ?? 0;
  const videoTotal: number = mediaRaw.video_total_minutes ?? 0;
  const mediaItems: Array<Record<string, any>> = mediaRaw.items ?? [];
  const withText = (m: Record<string, any>) => ({
    badge: m.is_playing ? (m.type === "music" ? "正在听" : "正在看") : null,
    title: m.title,
    app_name: m.app_name,
    duration_minutes: m.duration_minutes,
    duration_text: fmtDur(m.duration_minutes),
    is_playing: m.is_playing,
    first_played_at: m.first_played_at,
  });

  const media = {
    visible: musicTotal > 0 || videoTotal > 0,
    label: "媒体使用",
    summary_text:
      [
        musicTotal > 0 ? `音乐: ${fmtDur(musicTotal)}` : null,
        videoTotal > 0 ? `视频: ${fmtDur(videoTotal)}` : null,
      ].filter(Boolean).join(" | ") || null,
    music: musicTotal > 0 ? {
      title: "🎵 今日歌单",
      total_text: fmtDur(musicTotal),
      playing: mediaItems.filter((m) => m.type === "music" && m.is_playing).map(withText),
      items: mediaItems.filter((m) => m.type === "music" && !m.is_playing).map(withText),
    } : null,
    video: videoTotal > 0 ? {
      title: "🎬 今日视频",
      total_text: fmtDur(videoTotal),
      playing: mediaItems.filter((m) => m.type === "video" && m.is_playing).map(withText),
      items: mediaItems.filter((m) => m.type === "video" && !m.is_playing).map(withText),
    } : null,
  };

  /* ── "此刻在线"面板（左栏 hero / 音乐 / 在线状态） ── */
  const active: Record<string, any> | null = raw.active_device ?? null;
  let hero: Record<string, unknown> | null = null;
  if (isOnline && active) {
    const fg = foregroundByDev.get(active.device_id);
    const displayApp = fg ?? {
      app_name: active.current_app,
      display_title: active.display_title,
    };
    const cleaned = displayApp.display_title ? cleanTitle(displayApp.display_title) : "";
    hero = {
      app_text: `正在用 ${displayApp.app_name ?? "未知应用"}`,
      title_text: cleaned ? `写「${cleaned}」` : null,
      description: getAppDescription(
        displayApp.app_name ?? "", displayApp.display_title || undefined,
        active.music ?? undefined, true
      ),
    };
  }
  const musicExtra = active?.music ?? null;

  /* ── "此刻"栏（时间线顶部置顶） ── */
  const nowSummary = isToday && onlineDevices.length > 0 ? {
    label: "此刻",
    rows: onlineDevices.map((d) => {
      const fg = foregroundByDev.get(d.device_id);
      if (fg) {
        return {
          device_name: d.device_name,
          app_text: `${fg.app_name}${fg.display_title ? ` · ${cleanTitle(fg.display_title)}` : ""} (前台)`,
        };
      }
      return {
        device_name: d.device_name,
        app_text: `${d.app_name}${d.display_title ? ` · ${d.display_title}` : ""}`,
      };
    }),
  } : null;

  /* ── AI 每日小结 ── */
  const ds = raw.daily_summary ?? null;
  const aiSummary = {
    label: "今日小结",
    text: ds?.summary || "每晚 21:00 自动生成",
    time_text: ds?.generated_at ? `${ds.generated_at.slice(11, 16)} · AI 生成` : "等待生成...",
    summary: ds?.summary ?? null,
    generated_at: ds?.generated_at ?? null,
  };

  const viewerCount: number = raw.meta.viewer_count ?? 0;
  const serverTimeMs = parseLocal(String(raw.meta.server_time ?? "").replace("T", " ").slice(0, 19).replace(/-/g, "-")) || Date.now();
  // server_time 为 UTC ISO，转换到请求时区后取 HH:MM
  const serverTimeDisplay = new Date(new Date(raw.meta.server_time).getTime() - tz * 60_000)
    .toISOString().slice(11, 16);

  const totalScreenMinutes: number = raw.stats?.total_screen_minutes ?? 0;

  return Response.json({
    meta: {
      api: "dashboard/view",
      version: "1.0",
      date,
      date_display: fmtDateCN(date),
      prev_date: offsetDate(date, -1),
      next_date: offsetDate(date, 1),
      is_today: isToday,
      site_title: "Monika Now",
      greeting: greeting(localHour),
      refresh_hint: "每 10 秒自动刷新",
      server_time: raw.meta.server_time,
      server_time_display: serverTimeDisplay,
      timezone_offset_minutes: tz,
      device_filter: raw.meta.device_filter ?? null,
      viewer_count: viewerCount,
      viewer_text: viewerCount > 0 ? `${viewerCount} 人在看` : null,
    },
    presence: {
      online: isOnline,
      status_label: isOnline ? "此刻在线" : null,
      offline_poem: isOnline ? null : ["月落乌啼", "万籁俱寂，设备已入眠"],
      hero,
      music: musicExtra?.title ? {
        label: "正在听的音乐",
        title: musicExtra.title,
        artist: musicExtra.artist ?? null,
        via_text: musicExtra.app ? `via ${musicExtra.app}` : null,
      } : null,
    },
    devices: deviceButtons,
    now_summary: nowSummary,
    usage_chart: {
      label: "今日使用 Top 6",
      total_minutes: totalScreenMinutes,
      total_text: fmtDur(totalScreenMinutes),
      max_minutes: maxChartMins,
      bars: top6.map((b) => ({
        app_name: b.app_name,
        color: b.color,
        minutes: b.minutes,
        duration_text: fmtDur(b.minutes),
        percent: Math.round(Math.max(3, (b.minutes / maxChartMins) * 100) * 10) / 10,
      })),
    },
    media,
    ai_summary: aiSummary,
    timeline: {
      title: "时间线",
      date_display: fmtDateCN(date),
      empty: timelineGroups.length === 0 ? { poem: "尚无足迹", sub: "这一天还是一张白纸" } : null,
      groups: timelineGroups,
    },
    app_colors: Object.fromEntries(colorMap),
  });
}
