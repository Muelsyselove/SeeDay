"use client";

import type React from "react";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { getAppDescription } from "@/lib/app-descriptions";
import { generateDailySummary } from "@/lib/api";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { getThemes } from "../../themes/types";
import { registerLayout, LayoutProps } from "./registry";

/** Strip trailing "喵~" from descriptions */
function cleanDesc(appName: string, title?: string): string {
  return getAppDescription(appName, title).replace(/喵~$/, "").trim();
}

function cleanTitle(title: string): string {
  return title.replace(/\s*\(゜-゜\)つロ\s*干杯~-bilibili\s*$/i, "");
}

/* ═══ Helpers ═══ */
const PALETTE = [
  "#e8a0b4",
  "#a0c4a8",
  "#d4b896",
  "#8fb8c8",
  "#c4a8d4",
  "#b8c8a0",
  "#d4a0a0",
  "#a0b8d4",
  "#c8c4a0",
  "#b4a0c4",
  "#a0d4c4",
  "#d4c4a0",
];

// Music and video app names
const MUSIC_APPS = new Set(["Spotify", "网易云音乐", "QQ音乐", "酷狗音乐", "Apple Music", "foobar2000", "YouTube Music", "酷我音乐", "Amazon Music", "AIMP", "MusicBee", "Winamp", "MediaMonkey", "Tidal", "Deezer", "SoundCloud", "Pandora", "Clementine", "Strawberry", "Rhythmbox", "Audacious", "Quod Libet", "Music Player"]);
const VIDEO_APPS = new Set(["哔哩哔哩", "bilibili", "YouTube", "Netflix", "爱奇艺", "优酷", "腾讯视频", "VLC", "PotPlayer", "mpv", "Twitch", "Disney+", "芒果TV", "斗鱼", "虎牙", "Prime Video", "HBO", "MPC-HC", "MPC-BE", "KMPlayer", "GOM Player", "5KPlayer", "IINA", "Celluloid", "Parole", "Hulu", "Apple TV+", "Max", "Peacock", "Paramount+", "DAZN", "西瓜视频", "央视影音", "OBS Studio", "Windows Media Player"]);
const IDE_APPS = new Set(["VS Code", "Visual Studio Code", "Visual Studio", "IntelliJ IDEA", "PyCharm", "WebStorm", "GoLand", "JetBrains Rider", "DataGrip", "Android Studio", "Cursor", "Sublime Text", "Windsurf", "Zed", "CLion", "RustRover", "HBuilderX", "Vim", "Neovim", "Emacs", "Notepad++"]);
const GAMING_APPS = new Set(["Steam", "Epic Games", "Genshin Impact", "原神", "League of Legends", "英雄联盟", "Minecraft", "VALORANT", "Counter-Strike 2", "Overwatch", "Apex Legends", "Roblox"]);
const BROWSER_APPS = new Set(["Google Chrome", "Chrome", "Microsoft Edge", "Firefox", "Safari", "Opera", "Arc", "Brave", "Vivaldi"]);
const READING_APPS = new Set(["Kindle", "微信读书", "多看阅读", "Calibre"]);
const DESIGN_APPS = new Set(["Figma", "Sketch", "Photoshop", "Illustrator", "Premiere Pro", "After Effects", "Blender", "Canva", "DaVinci Resolve", "剪映", "GIMP"]);
const OFFICE_APPS = new Set(["Word", "Microsoft Word", "Excel", "Microsoft Excel", "PowerPoint", "Microsoft PowerPoint", "OneNote", "Notion", "Obsidian", "Typora", "WPS Office"]);
const TERMINAL_APPS = new Set(["Windows Terminal", "Terminal", "PowerShell", "Git Bash", "PuTTY", "MobaXterm", "Xshell", "Trae CN", "Trae", "Warp", "Hyper"]);

function getAppVerb(appName: string): string {
  if (MUSIC_APPS.has(appName)) return "听";
  if (VIDEO_APPS.has(appName)) return "看";
  if (IDE_APPS.has(appName)) return "写";
  if (GAMING_APPS.has(appName)) return "玩";
  if (BROWSER_APPS.has(appName)) return "浏览";
  if (READING_APPS.has(appName)) return "读";
  if (DESIGN_APPS.has(appName)) return "设计";
  if (OFFICE_APPS.has(appName)) return "编辑";
  if (TERMINAL_APPS.has(appName)) return "操作";
  return "运行";
}

function fmtDur(m: number): string {
  if (!Number.isFinite(m) || m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${r}m` : `${h}h`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function offsetDate(s: string, n: number) {
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return s;
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(s: string) {
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return s;
  const date = new Date(y, m - 1, d);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${m}月${d}日 ${weekdays[date.getDay()]}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 9) return "晨光微熹";
  if (h >= 9 && h < 12) return "日上花梢";
  if (h >= 12 && h < 14) return "午后小憩";
  if (h >= 14 && h < 18) return "斜阳渐长";
  if (h >= 18 && h < 22) return "暮色四合";
  return "夜阑人静";
}

function fmtTime(t?: string) {
  if (!t) return "--:--";
  const d = new Date(t);
  return isNaN(d.getTime()) ? "--:--" : d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function fmtTimeRange(s: string, e: string | null): string {
  const st = fmtTime(s);
  const en = e ? fmtTime(e) : "现在";
  return `${st} – ${en}`;
}

/* ═══ Decorative Blossom ═══ */
function BlossomSVG({ className }: { className?: string }) {
  return (
    <svg className={className || "blossom-deco"} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="100" cy="100" rx="28" ry="48" fill="currentColor" transform={`rotate(${r} 100 100) translate(0 -30)`} opacity="0.7" />
      ))}
      <circle cx="100" cy="100" r="12" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

/* ═══ Usage Bar Chart ═══ */
function UsageChart({ data, maxMins }: { data: { name: string; mins: number; color: string }[]; maxMins: number }) {
  if (!data.length) return null;
  return (
    <div className="usage-chart">
      {data.map((d, i) => (
        <div key={d.name} className="usage-row" style={{ "--ci": i } as React.CSSProperties}>
          <span className="usage-label">{d.name}</span>
          <div className="usage-track">
            <div
              className="usage-fill"
              style={{ width: `${Math.max(3, (d.mins / maxMins) * 100)}%`, background: d.color }}
            />
          </div>
          <span className="usage-mins">{fmtDur(d.mins)}</span>
        </div>
      ))}
    </div>
  );
}

function DefaultLayoutInner({ themes, currentTheme, switchTheme }: LayoutProps) {
  const { current, timeline, selectedDate, changeDate, loading, error, viewerCount } = useDashboard();
  const [activeDevFilter, setActiveDevFilter] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [noScrollbarApps, setNoScrollbarApps] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const tlScrollRef = useRef<HTMLDivElement>(null);
  const [tlHasOverflow, setTlHasOverflow] = useState(true);
  
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => {
    const el = tlScrollRef.current;
    if (!el) return;
    const check = () => setTlHasOverflow(el.scrollHeight > el.clientHeight);
    check();
    const observer = new MutationObserver(check);
    observer.observe(el, { childList: true, subtree: true });
    window.addEventListener("resize", check);
    return () => { observer.disconnect(); window.removeEventListener("resize", check); };
  }, [timeline]);
  const toggleApp = useCallback((key: string) => {
    setExpandedApps(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setNoScrollbarApps(sp => { const s = new Set(sp); s.delete(key); return s; });
      } else {
        next.add(key);
        setTimeout(() => {
          const wrapper = itemRefs.current.get(key);
          if (wrapper) {
            const child = wrapper.firstElementChild as HTMLElement;
            if (child && child.scrollHeight <= child.clientHeight) {
              setNoScrollbarApps(sp => { const s = new Set(sp); s.add(key); return s; });
            }
          }
        }, 350);
      }
      return next;
    });
  }, []);
  const colorRef = useRef(new Map<string, string>());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const data = current;
  const tlData = timeline;

  // All online devices
  const onlineDevices = useMemo(() =>
    (data?.devices ?? []).filter((d) => d.is_online === 1),
  [data?.devices]);

  // Primary active device (most recently seen)
  const active = useMemo(() => {
    if (!onlineDevices.length) return undefined;
    let best = onlineDevices[0];
    for (const d of onlineDevices) {
      const t = d.last_seen_at ? new Date(d.last_seen_at).getTime() : 0;
      const bt = best.last_seen_at ? new Date(best.last_seen_at).getTime() : 0;
      if (t > bt) best = d;
    }
    return best;
  }, [onlineDevices]);

  const isOnline = !!active;
  const music = active?.extra?.music;

  const allOffline = useMemo(() => {
    if (!data?.devices || data.devices.length === 0) return true;
    return data.devices.every((d) => d.is_online !== 1);
  }, [data?.devices]);

  useEffect(() => {
    document.body.classList.toggle("night-mode", allOffline);
    return () => { document.body.classList.remove("night-mode"); };
  }, [allOffline]);

  // Current apps by device, with foreground app prioritized
  const currentAppsByDevice = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const d of data?.device_app_states ?? []) {
      if (!m[d.device_id]) {
        m[d.device_id] = [];
      }
      m[d.device_id].push(d);
    }
    // Sort apps by is_foreground (foreground first), then by last_seen_at (most recent first)
    for (const deviceId in m) {
      m[deviceId].sort((a, b) => {
        // Foreground apps first
        if (a.is_foreground !== b.is_foreground) {
          return b.is_foreground - a.is_foreground;
        }
        // Then most recent first
        const aTime = new Date(a.last_seen_at || 0).getTime();
        const bTime = new Date(b.last_seen_at || 0).getTime();
        return bTime - aTime;
      });
    }
    return m;
  }, [data?.device_app_states]);

  useEffect(() => { colorRef.current.clear(); }, [tlData]);

  const isToday = selectedDate === todayStr();

  // Build timeline groups
  const tlGroups = useMemo(() => {
    const segs = tlData?.segments ?? [];
    if (!segs.length) return [];

    const byDev = new Map<string, { name: string; items: typeof segs }>();
    for (const s of segs) {
      let e = byDev.get(s.device_id);
      if (!e) { e = { name: s.device_name, items: [] }; byDev.set(s.device_id, e); }
      e.items.push(s);
    }

    return Array.from(byDev.entries()).map(([devId, { name, items }]) => {
      const sortedItems = [...items].sort((a, b) => 
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      );
      
      const currentApps = currentAppsByDevice[devId] || [];
      const currentAppNames = new Set(currentApps.map(a => a.app_name));

      const byApp = new Map<string, typeof sortedItems>();
      for (const s of sortedItems) {
        let e = byApp.get(s.app_name);
        if (!e) { e = []; byApp.set(s.app_name, e); }
        e.push(s);
      }

      const appGroups = Array.from(byApp.entries()).map(([appName, appItems]) => {
        const totalDuration = appItems.reduce((sum, item) => {
          if (item.ended_at === null) {
            return sum + Math.max(1, Math.round((now - new Date(item.started_at).getTime()) / 60000));
          }
          return sum + item.duration_minutes;
        }, 0);
        const isCurrent = appItems.some(item => item.ended_at === null) || currentAppNames.has(appName);
        return { appName, totalDuration, items: appItems, isCurrent };
      }).sort((a, b) => b.totalDuration - a.totalDuration);

      return { devId, name, appGroups, currentApps };
    });
  }, [tlData, currentAppsByDevice, now]);

  // Filtered timeline groups
  const filteredGroups = useMemo(() => {
    if (!activeDevFilter) return tlGroups;
    return tlGroups.filter((g) => g.devId === activeDevFilter);
  }, [tlGroups, activeDevFilter]);

  function getColor(app: string) {
    let c = colorRef.current.get(app);
    if (!c) { c = PALETTE[colorRef.current.size % PALETTE.length]!; colorRef.current.set(app, c); }
    return c;
  }

  // Top apps for chart (from filtered or all groups)
  const chartData = useMemo(() => {
    const appMins = new Map<string, number>();
    for (const g of filteredGroups) {
      for (const ag of g.appGroups) {
        appMins.set(ag.appName, (appMins.get(ag.appName) || 0) + ag.totalDuration);
      }
    }
    const sorted = Array.from(appMins.entries())
      .map(([name, mins]) => ({ name, mins, color: getColor(name) }))
      .sort((a, b) => b.mins - a.mins)
      .slice(0, 6);
    return sorted;
  }, [filteredGroups]);

  // Music and video stats
  const musicVideoStats = useMemo(() => {
    const musicMins = new Map<string, number>();
    const videoMins = new Map<string, number>();
    const mediaItems = new Map<string, { type: 'music' | 'video'; title: string; duration: number; isPlaying: boolean; firstPlayedAt: string }>();
    
    for (const g of filteredGroups) {
      for (const ag of g.appGroups) {
        for (const item of ag.items) {
          const isMusic = MUSIC_APPS.has(item.app_name);
          const isVideo = VIDEO_APPS.has(item.app_name);
          if (!isMusic && !isVideo) continue;

          const title = cleanTitle(item.display_title || "");
          if (!title || title === "桌面歌词") continue;

          if (isMusic) musicMins.set(item.app_name, (musicMins.get(item.app_name) || 0) + item.duration_minutes);
          if (isVideo) videoMins.set(item.app_name, (videoMins.get(item.app_name) || 0) + item.duration_minutes);

          const key = `${isMusic ? 'music' : 'video'}-${title}`;
          const dur = item.ended_at === null
            ? Math.max(1, Math.round((now - new Date(item.started_at).getTime()) / 60000))
            : item.duration_minutes;
          const playing = item.ended_at === null;

          if (mediaItems.has(key)) {
            const existing = mediaItems.get(key)!;
            existing.duration += dur;
            if (playing) existing.isPlaying = true;
          } else {
            mediaItems.set(key, {
              type: isMusic ? 'music' : 'video',
              title,
              duration: dur,
              isPlaying: playing,
              firstPlayedAt: item.started_at,
            });
          }
        }
      }
    }
    
    const aggregatedMedia = Array.from(mediaItems.values()).sort((a, b) => {
      if (a.isPlaying && !b.isPlaying) return -1;
      if (!a.isPlaying && b.isPlaying) return 1;
      return a.firstPlayedAt.localeCompare(b.firstPlayedAt);
    });
    
    return {
      musicMins,
      videoMins,
      aggregatedMedia
    };
  }, [filteredGroups, now]);

  // Total music and video time
  const totalMusicMins: number = Array.from(musicVideoStats.musicMins.values()).reduce((sum: number, mins: number) => sum + mins, 0);
  const totalVideoMins: number = Array.from(musicVideoStats.videoMins.values()).reduce((sum: number, mins: number) => sum + mins, 0);

  const maxChartMins = chartData.length ? chartData[0].mins : 1;

  // Total screen time — merge overlapping intervals to avoid double-counting
  const totalMins = useMemo(() => {
    const intervals: { start: number; end: number }[] = [];
    for (const g of filteredGroups) {
      for (const ag of g.appGroups) {
        for (const item of ag.items) {
          const start = new Date(item.started_at).getTime();
          const end = item.ended_at ? new Date(item.ended_at).getTime() : now;
          intervals.push({ start, end });
        }
      }
    }
    if (!intervals.length) return 0;
    intervals.sort((a, b) => a.start - b.start);
    let merged = 0;
    let curStart = intervals[0].start;
    let curEnd = intervals[0].end;
    for (let i = 1; i < intervals.length; i++) {
      if (intervals[i].start <= curEnd) {
        curEnd = Math.max(curEnd, intervals[i].end);
      } else {
        merged += curEnd - curStart;
        curStart = intervals[i].start;
        curEnd = intervals[i].end;
      }
    }
    merged += curEnd - curStart;
    return Math.round(merged / 60000);
  }, [filteredGroups, now]);

  const handleDevFilter = useCallback((devId: string) => {
    setActiveDevFilter((prev) => (prev === devId ? null : devId));
  }, []);

  // Fetch AI daily summary from backend
  const [dailySummary, setDailySummary] = useState<{ summary: string | null; generated_at: string | null } | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setDailySummary(null);
    fetch(`/api/daily-summary?date=${selectedDate}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setDailySummary(d); })
      .catch(() => {});
    return () => controller.abort();
  }, [selectedDate]);

  const handleGenerateSummary = useCallback(async () => {
    if (generatingSummary) return;
    setGeneratingSummary(true);
    try {
      const d = await generateDailySummary(selectedDate);
      if (d) setDailySummary(d);
    } catch (e) {
      console.error('Failed to generate summary:', e);
    } finally {
      setGeneratingSummary(false);
    }
  }, [generatingSummary, selectedDate]);

  return (
    <>
      {/* Fireflies — visible only in night mode */}
      <div className="firefly-container" aria-hidden="true">
        <div className="firefly" /><div className="firefly" /><div className="firefly" />
        <div className="firefly" /><div className="firefly" /><div className="firefly" />
        <div className="firefly" /><div className="firefly" />
      </div>

      {/* ── Header ── */}
      <header className="top-bar reveal">
        <div className="top-bar-inner">
          {/* Left: title */}
          <div className="top-bar-left">
            <h1 className="site-title">Monika Now</h1>
            <span className="site-greeting">{greeting()}</span>
          </div>

          {/* Center: devices as clickable buttons showing current app */}
          <div className="top-bar-center reveal reveal-d2">
            {(data?.devices ?? []).map((d) => {
              const isSel = activeDevFilter === d.device_id;
              const isOn = d.is_online === 1;
              // Get the foreground app for this device
              const apps = currentAppsByDevice[d.device_id] || [];
              const foregroundApp = apps.find(app => app.is_foreground === 1);
              const displayApp = foregroundApp || d;
              return (
                <button
                  key={d.device_id}
                  type="button"
                  className={`dev-btn ${isSel ? "dev-btn-active" : ""} ${isOn ? "" : "dev-btn-off"}`}
                  onClick={() => handleDevFilter(d.device_id)}
                >
                  <span className="dev-btn-name">{d.device_name}</span>
                  {isOn && (
                    <span className="dev-btn-app">
                      {displayApp.app_name}{displayApp.display_title ? ` · ${cleanTitle(displayApp.display_title)}` : ""}
                      {foregroundApp && <span className="dev-btn-foreground"> (前台)</span>}
                    </span>
                  )}
                  {!isOn && <span className="dev-btn-off-label">离线</span>}
                  {isOn && d.extra && typeof d.extra.battery_percent === "number" && (
                    <span className="dev-btn-batt">{d.extra.battery_charging ? "\u26A1" : ""}{d.extra.battery_percent}%</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: time + viewers */}
          <div className="top-bar-right">
            <span className="top-time">{fmtTime(data?.server_time)}</span>
            {viewerCount > 0 && <span className="top-viewers">{viewerCount} 人在看</span>}
            <ThemeSwitcher
              themes={themes}
              currentTheme={currentTheme}
              switchTheme={switchTheme}
            />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="panels">
        {/* ═══ LEFT ═══ */}
        <div className="panel-left">
          <BlossomSVG />
          <div className="petal-container">
            <div className="petal" /><div className="petal" /><div className="petal" /><div className="petal" />
            <div className="petal" /><div className="petal" /><div className="petal" /><div className="petal" />
            <div className="petal" /><div className="petal" /><div className="petal" /><div className="petal" />
          </div>

          {isOnline ? (
            <div className="presence-content">
              {/* Poetic online indicator */}
              <p className="status-line reveal reveal-d2">
                <span className="status-dot" />
                此刻在线
              </p>

              {/* Hero: split into app + what */}
              <div className="hero-block reveal reveal-d3">
                {active && (
                  <> 
                    {/* Get the foreground app for the active device */}
                    {(() => {
                      const apps = currentAppsByDevice[active.device_id] || [];
                      const foregroundApp = apps.find(app => app.is_foreground === 1);
                      const displayApp = foregroundApp || active;
                      return (
                        <>
                          <p className="hero-app hero-alive">正在用 {displayApp.app_name}</p>
                          {displayApp.display_title && (
                            <p className="hero-title">写「{cleanTitle(displayApp.display_title)}」</p>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Music — detailed */}
              {music?.title && (
                <div className="music-block reveal reveal-d4">
                  <p className="music-label">正在听的音乐</p>
                  <div className="music-row">
                    <div className="music-bars">
                      <div className="m-bar" /><div className="m-bar" /><div className="m-bar" /><div className="m-bar" />
                    </div>
                    <div className="music-info">
                      <span className="music-title-text">{music.title}</span>
                      {music.artist && <span className="music-artist">{music.artist}</span>}
                      {music.app && <span className="music-app">via {music.app}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Separator */}
              <div className="orn-sep reveal reveal-d4"><span className="orn-sep-dot" /></div>

              {/* Usage chart */}
              <div className="chart-section reveal reveal-d5">
                <div className="chart-header">
                  <span className="chart-label">今日使用 Top 6</span>
                  <span className="chart-total">{fmtDur(totalMins)}</span>
                </div>
                <UsageChart data={chartData} maxMins={maxChartMins} />
              </div>

              {/* Music and Video Stats */}
              {(totalMusicMins > 0 || totalVideoMins > 0) && (
                <div className="media-section reveal reveal-d5">
                  <div className="chart-header">
                    <span className="chart-label">媒体使用</span>
                    <span className="chart-total">
                      {totalMusicMins > 0 && `音乐: ${fmtDur(totalMusicMins)}`}
                      {totalMusicMins > 0 && totalVideoMins > 0 && " | "}
                      {totalVideoMins > 0 && `视频: ${fmtDur(totalVideoMins)}`}
                    </span>
                  </div>
                  
                  {totalMusicMins > 0 && (
                    <div className="media-apps">
                      <h4 className="media-apps-title" onClick={() => toggleApp("__music__")} style={{ cursor: "pointer" }}>
                        🎵 今日歌单
                        <span className="tl-app-toggle" style={{ transform: expandedApps.has("__music__") ? "rotate(0deg)" : "rotate(-90deg)", marginLeft: 6 }}>▼</span>
                      </h4>
                      {musicVideoStats.aggregatedMedia.filter(m => m.type === 'music' && m.isPlaying).map(m => (
                        <div key={`music-playing-${m.title}`} className="media-app-item">
                          <span className="media-app-name"><span className="now-badge">正在听</span>{m.title}</span>
                          <span className="media-app-duration">{fmtDur(m.duration)}</span>
                        </div>
                      ))}
                      <div ref={el => { if (el) itemRefs.current.set("__music__", el); }} className={`tl-app-items-wrapper${isMobile ? " mobile" : ""}${expandedApps.has("__music__") ? " expanded" : ""}${noScrollbarApps.has("__music__") ? " no-scrollbar" : ""}`}>
                        <div className="media-apps-list">
                          {musicVideoStats.aggregatedMedia
                            .filter(m => m.type === 'music' && !m.isPlaying)
                            .map(m => (
                              <div key={`music-${m.title}`} className="media-app-item">
                                <span className="media-app-name">{m.title}</span>
                                <span className="media-app-duration">{fmtDur(m.duration)}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {totalVideoMins > 0 && (
                    <div className="media-apps">
                      <h4 className="media-apps-title" onClick={() => toggleApp("__video__")} style={{ cursor: "pointer" }}>
                        🎬 今日视频
                        <span className="tl-app-toggle" style={{ transform: expandedApps.has("__video__") ? "rotate(0deg)" : "rotate(-90deg)", marginLeft: 6 }}>▼</span>
                      </h4>
                      {musicVideoStats.aggregatedMedia.filter(m => m.type === 'video' && m.isPlaying).map(m => (
                        <div key={`video-playing-${m.title}`} className="media-app-item">
                          <span className="media-app-name"><span className="now-badge">正在看</span>{m.title}</span>
                          <span className="media-app-duration">{fmtDur(m.duration)}</span>
                        </div>
                      ))}
                      <div ref={el => { if (el) itemRefs.current.set("__video__", el); }} className={`tl-app-items-wrapper${isMobile ? " mobile" : ""}${expandedApps.has("__video__") ? " expanded" : ""}${noScrollbarApps.has("__video__") ? " no-scrollbar" : ""}`}>
                        <div className="media-apps-list">
                          {musicVideoStats.aggregatedMedia
                            .filter(m => m.type === 'video' && !m.isPlaying)
                            .map(m => (
                              <div key={`video-${m.title}`} className="media-app-item">
                                <span className="media-app-name">{m.title}</span>
                                <span className="media-app-duration">{fmtDur(m.duration)}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Daily Summary */}
              <div className="ai-summary reveal reveal-d5">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p className="ai-summary-label">今日小结</p>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    style={{
                      background: "none",
                      border: "1px solid var(--ink)",
                      borderRadius: "6px",
                      padding: "2px 10px",
                      fontSize: "12px",
                      color: "var(--ink)",
                      cursor: generatingSummary ? "wait" : "pointer",
                      opacity: generatingSummary ? 0.5 : 0.7,
                      transition: "opacity 0.2s",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = generatingSummary ? "0.5" : "0.7"; }}
                  >
                    {generatingSummary ? "生成中..." : "立即生成"}
                  </button>
                </div>
                <p className="ai-summary-text">
                  {generatingSummary ? "正在请 AI 撰写小结..." : (dailySummary?.summary || "每晚 21:00 自动生成")}
                </p>
                <span className="ai-summary-time">
                  {dailySummary?.generated_at ? `${dailySummary.generated_at.slice(11, 16)} · AI 生成` : "等待生成..."}
                </span>
              </div>
            </div>
          ) : (
            <div className="presence-content presence-offline reveal reveal-d2">
              <p className="offline-poem-line">月落乌啼</p>
              <p className="offline-poem-line offline-poem-dim">万籁俱寂，设备已入眠</p>
              {loading && !data && <p className="offline-loading">轻叩数据之门...</p>}
              {error && !loading && <p className="offline-loading">信号微弱，尝试重连中</p>}
            </div>
          )}

          <p className="bottom-quote">&ldquo;每一刻都值得被记录&rdquo;</p>
        </div>

        {/* ═══ RIGHT: Timeline ═══ */}
        <div className="panel-right">
          {/* Date nav */}
          <div className="tl-header reveal reveal-d3">
            <span className="tl-title">
              时间线
              {activeDevFilter && (
                <span className="tl-filter-badge">
                  {(data?.devices ?? []).find((d) => d.device_id === activeDevFilter)?.device_name}
                  <button type="button" className="tl-filter-clear" onClick={() => setActiveDevFilter(null)}>&times;</button>
                </span>
              )}
            </span>
            <div className="tl-nav">
              <button type="button" className="btn-subtle" onClick={() => changeDate(offsetDate(selectedDate, -1))} aria-label="前一天">&larr;</button>
              <span className="tl-date" suppressHydrationWarning>{fmtDate(selectedDate)}</span>
              <button type="button" className="btn-subtle" onClick={() => changeDate(offsetDate(selectedDate, 1))} disabled={isToday} aria-label="后一天">&rarr;</button>
              {!isToday && <button type="button" className="btn-subtle btn-today" onClick={() => changeDate(todayStr())}>今天</button>}
            </div>
          </div>

          {/* Timeline scroll */}
          <div ref={tlScrollRef} className={`tl-scroll reveal reveal-d4${!tlHasOverflow ? " no-overflow" : ""}`}>
            {filteredGroups.length === 0 && !loading ? (
              <div className="tl-empty">
                <p className="tl-empty-poem">尚无足迹</p>
                <p className="tl-empty-sub">这一天还是一张白纸</p>
              </div>
            ) : (
              <div style={{ opacity: loading && tlData ? 0.4 : 1, transition: "opacity 0.3s" }}>
                {/* Current activities per device — pinned at top */}
                {onlineDevices.length > 0 && isToday && (
                  <div className="now-summary">
                    <p className="now-summary-label">此刻</p>
                    {onlineDevices.map((d) => {
                      const apps = currentAppsByDevice[d.device_id] || [];
                      const foregroundApp = apps.find(app => app.is_foreground === 1);
                      return foregroundApp ? (
                        <div key={`${d.device_id}-${foregroundApp.app_id}`} className="now-summary-row">
                          <span className="now-summary-dev">{d.device_name}</span>
                          <span className="now-summary-app">
                            {foregroundApp.app_name}{foregroundApp.display_title ? ` · ${cleanTitle(foregroundApp.display_title)}` : ""}
                            <span className="now-summary-foreground"> (前台)</span>
                          </span>
                        </div>
                      ) : (
                        <div key={d.device_id} className="now-summary-row">
                          <span className="now-summary-dev">{d.device_name}</span>
                          <span className="now-summary-app">{d.app_name}{d.display_title ? ` · ${d.display_title}` : ""}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {filteredGroups.map(({ devId, name, appGroups }) => {
                  return (
                    <div key={devId} className="tl-device-group">
                      <p className="tl-device-name">{name}</p>
                      {appGroups.map((ag) => {
                        const c = getColor(ag.appName);
                        const appKey = `${devId}-${ag.appName}`;
                        const expanded = expandedApps.has(appKey);
                        return (
                          <div key={ag.appName} className={`tl-app-group ${ag.isCurrent && isToday ? "tl-app-active" : ""}`}>
                            <div className="tl-app-header" onClick={() => toggleApp(appKey)} style={{ cursor: "pointer" }}>
                              <span className="tl-app-dot" style={{ background: c }} />
                              <span className="tl-app-name">{ag.appName}</span>
                              {ag.isCurrent && isToday && <span className="tl-app-now">Now</span>}
                              <span className="tl-app-total">{fmtDur(ag.totalDuration)}</span>
                              <span className="tl-app-toggle" style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}>▼</span>
                            </div>
                            <div ref={el => { if (el) itemRefs.current.set(appKey, el); }} className={`tl-app-items-wrapper${isMobile ? " mobile" : ""}${expanded ? " expanded" : ""}${noScrollbarApps.has(appKey) ? " no-scrollbar" : ""}`}>
                            <div className="tl-app-items">
                              {ag.items.map((item) => (
                                <div key={`${item.started_at}-${item.device_id}`} className="tl-app-item">
                                  <span className="tl-app-item-time">{fmtTimeRange(item.started_at, item.ended_at)}</span>
                                  <span className="tl-app-item-title">{item.display_title ? `${getAppVerb(ag.appName)}${cleanTitle(item.display_title)}` : "-"}</span>
                                  <span className="tl-app-item-dur">{fmtDur(item.ended_at === null ? Math.max(1, Math.round((now - new Date(item.started_at).getTime()) / 60000)) : item.duration_minutes)}</span>
                                </div>
                              ))}
                            </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="tl-footer" suppressHydrationWarning>
            <span suppressHydrationWarning>每 10 秒自动刷新</span><span suppressHydrationWarning>Monika Now</span>
          </div>
        </div>
      </div>
    </>
  );
}

export function DefaultLayout(props: LayoutProps) {
  return <DefaultLayoutInner {...props} />;
}

// Register the default layout
registerLayout({
  id: 'default',
  name: '默认布局',
  component: DefaultLayout,
});
