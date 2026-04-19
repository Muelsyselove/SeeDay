"use client";

import type React from "react";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { generateDailySummary } from "@/lib/api";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { getThemes } from "../../themes/types";
import { registerLayout, LayoutProps } from "./registry";

function cleanTitle(title: string): string {
  return title.replace(/\s*\(゜-゜\)つロ\s*干杯~-bilibili\s*$/i, "");
}

const PALETTE = [
  "#8b2500",
  "#2f5233",
  "#4a4a4a",
  "#6b3a2a",
  "#3a5f6f",
  "#5c4033",
  "#7a3b3b",
  "#3d5c4a",
  "#5a4a3a",
  "#4a5a3a",
  "#3a4a5a",
  "#5a3a4a",
];

const MUSIC_APPS = new Set(["Spotify", "网易云音乐", "QQ音乐", "酷狗音乐", "Apple Music", "foobar2000", "YouTube Music", "酷我音乐", "Amazon Music", "AIMP", "MusicBee", "Winamp", "MediaMonkey", "Tidal", "Deezer", "SoundCloud", "Pandora", "Clementine", "Strawberry", "Rhythmbox", "Audacious", "Quod Libet", "Music Player"]);
const VIDEO_APPS = new Set(["哔哩哔哩", "bilibili", "YouTube", "Netflix", "爱奇艺", "优酷", "腾讯视频", "VLC", "PotPlayer", "mpv", "Twitch", "Disney+", "芒果TV", "斗鱼", "虎牙", "Prime Video", "HBO", "MPC-HC", "MPC-BE", "KMPlayer", "GOM Player", "5KPlayer", "IINA", "Celluloid", "Parole", "Hulu", "Apple TV+", "Max", "Peacock", "Paramount+", "DAZN", "西瓜视频", "央视影音", "OBS Studio", "Windows Media Player"]);

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
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${m}月${d}日 · 周${weekdays[date.getDay()]}`;
}

function fmtTime(t?: string) {
  if (!t) return "--:--";
  const d = new Date(t);
  return isNaN(d.getTime()) ? "--:--" : d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function fmtTimeRange(s: string, e: string | null): string {
  const st = fmtTime(s);
  const en = e ? fmtTime(e) : "此刻";
  return `${st} – ${en}`;
}

function InkSplashSVG({ className }: { className?: string }) {
  return (
    <svg className={className || "ink-splash-deco"} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="40" fill="currentColor" opacity="0.04" />
      <circle cx="100" cy="100" r="60" fill="currentColor" opacity="0.02" />
      <circle cx="80" cy="90" r="15" fill="currentColor" opacity="0.06" />
      <circle cx="120" cy="110" r="12" fill="currentColor" opacity="0.05" />
      <circle cx="95" cy="120" r="8" fill="currentColor" opacity="0.07" />
    </svg>
  );
}

function MountainSVG({ className }: { className?: string }) {
  return (
    <svg className={className || "ink-mountain"} viewBox="0 0 1200 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,300 L0,200 Q100,80 200,180 Q280,100 350,160 Q420,60 500,140 Q560,90 620,150 Q700,40 800,130 Q860,80 920,160 Q980,100 1050,170 Q1100,120 1200,190 L1200,300 Z" fill="currentColor" opacity="0.03" />
      <path d="M0,300 L0,240 Q150,160 300,220 Q400,140 500,200 Q600,120 700,190 Q800,100 900,180 Q1000,140 1200,230 L1200,300 Z" fill="currentColor" opacity="0.02" />
    </svg>
  );
}

function InkUsageChart({ data, maxMins }: { data: { name: string; mins: number; color: string }[]; maxMins: number }) {
  if (!data.length) return null;
  return (
    <div className="ink-usage-chart">
      {data.map((d, i) => (
        <div key={d.name} className="ink-usage-row" style={{ "--ci": i } as React.CSSProperties}>
          <span className="ink-usage-label">{d.name}</span>
          <div className="ink-usage-track">
            <div
              className="ink-usage-fill"
              style={{ width: `${Math.max(3, (d.mins / maxMins) * 100)}%`, background: d.color }}
            />
          </div>
          <span className="ink-usage-mins">{fmtDur(d.mins)}</span>
        </div>
      ))}
    </div>
  );
}

function InkLayoutInner({ themes, currentTheme, switchTheme }: LayoutProps) {
  const { current, timeline, selectedDate, changeDate, loading, error, viewerCount } = useDashboard();
  const [activeDevFilter, setActiveDevFilter] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [noScrollbarApps, setNoScrollbarApps] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const tlScrollRef = useRef<HTMLDivElement>(null);
  const [tlHasOverflow, setTlHasOverflow] = useState(true);
  const [entryPhase, setEntryPhase] = useState(0);
  const [isFirstMount, setIsFirstMount] = useState(true);

  useEffect(() => {
    const timer1 = setTimeout(() => setEntryPhase(1), 150);
    const timer2 = setTimeout(() => setEntryPhase(2), 500);
    const timer3 = setTimeout(() => setEntryPhase(3), 900);
    const timer4 = setTimeout(() => setIsFirstMount(false), 1500);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4); };
  }, []);

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

  const toggleApp = useCallback((appName: string) => {
    setExpandedApps(prev => {
      const next = new Set(prev);
      if (next.has(appName)) {
        next.delete(appName);
        setNoScrollbarApps(sp => { const s = new Set(sp); s.delete(appName); return s; });
      } else {
        next.add(appName);
        setTimeout(() => {
          const wrapper = itemRefs.current.get(appName);
          if (wrapper) {
            const child = wrapper.firstElementChild as HTMLElement;
            if (child && child.scrollHeight <= child.clientHeight) {
              setNoScrollbarApps(sp => { const s = new Set(sp); s.add(appName); return s; });
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

  const onlineDevices = useMemo(() =>
    (data?.devices ?? []).filter((d) => d.is_online === 1),
    [data?.devices]);

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

  const currentAppsByDevice = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const d of data?.device_app_states ?? []) {
      if (!m[d.device_id]) { m[d.device_id] = []; }
      m[d.device_id].push(d);
    }
    for (const deviceId in m) {
      m[deviceId].sort((a, b) => {
        if (a.is_foreground !== b.is_foreground) return b.is_foreground - a.is_foreground;
        const aTime = new Date(a.last_seen_at || 0).getTime();
        const bTime = new Date(b.last_seen_at || 0).getTime();
        return bTime - aTime;
      });
    }
    return m;
  }, [data?.device_app_states]);

  useEffect(() => { colorRef.current.clear(); }, [tlData]);

  const isToday = selectedDate === todayStr();

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

  const filteredGroups = useMemo(() => {
    if (!activeDevFilter) return tlGroups;
    return tlGroups.filter((g) => g.devId === activeDevFilter);
  }, [tlGroups, activeDevFilter]);

  function getColor(app: string) {
    let c = colorRef.current.get(app);
    if (!c) { c = PALETTE[colorRef.current.size % PALETTE.length]!; colorRef.current.set(app, c); }
    return c;
  }

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
            mediaItems.set(key, { type: isMusic ? 'music' : 'video', title, duration: dur, isPlaying: playing, firstPlayedAt: item.started_at });
          }
        }
      }
    }
    const aggregatedMedia = Array.from(mediaItems.values()).sort((a, b) => {
      if (a.isPlaying && !b.isPlaying) return -1;
      if (!a.isPlaying && b.isPlaying) return 1;
      return a.firstPlayedAt.localeCompare(b.firstPlayedAt);
    });
    return { musicMins, videoMins, aggregatedMedia };
  }, [filteredGroups, now]);

  const totalMusicMins: number = Array.from(musicVideoStats.musicMins.values()).reduce((sum: number, mins: number) => sum + mins, 0);
  const totalVideoMins: number = Array.from(musicVideoStats.videoMins.values()).reduce((sum: number, mins: number) => sum + mins, 0);
  const maxChartMins = chartData.length ? chartData[0].mins : 1;

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
      if (intervals[i].start <= curEnd) { curEnd = Math.max(curEnd, intervals[i].end); }
      else { merged += curEnd - curStart; curStart = intervals[i].start; curEnd = intervals[i].end; }
    }
    merged += curEnd - curStart;
    return Math.round(merged / 60000);
  }, [filteredGroups, now]);

  const handleDevFilter = useCallback((devId: string) => {
    setActiveDevFilter((prev) => (prev === devId ? null : devId));
  }, []);

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
    } catch (e) { console.error('Failed:', e); }
    finally { setGeneratingSummary(false); }
  }, [generatingSummary, selectedDate]);

  return (
    <div className="ink-shell">
      <div className="ink-bg-layer">
        <MountainSVG className="ink-mountain-bg" />
        <div className="ink-mist ink-mist-1" />
        <div className="ink-mist ink-mist-2" />
        <div className="ink-mist ink-mist-3" />
      </div>

      <header className={`ink-topbar${isFirstMount ? ` phase-${entryPhase}` : " phase-3"}`}>
        <div className="ink-topbar-inner">
          <div className="ink-topbar-left">
            <h1 className="ink-site-title">墨韵</h1>
            <span className="ink-site-seal">观</span>
          </div>
          <div className="ink-topbar-center">
            {(data?.devices ?? []).map((d) => {
              const isSel = activeDevFilter === d.device_id;
              const isOn = d.is_online === 1;
              const apps = currentAppsByDevice[d.device_id] || [];
              const foregroundApp = apps.find(app => app.is_foreground === 1);
              const displayApp = foregroundApp || d;
              return (
                <button
                  key={d.device_id}
                  type="button"
                  className={`ink-dev-btn ${isSel ? "ink-dev-active" : ""} ${isOn ? "" : "ink-dev-off"}`}
                  onClick={() => handleDevFilter(d.device_id)}
                >
                  <span className="ink-dev-name">{d.device_name}</span>
                  {isOn && <span className="ink-dev-app">{displayApp.app_name}</span>}
                  {!isOn && <span className="ink-dev-off-label">离线</span>}
                  {isOn && d.extra && typeof d.extra.battery_percent === "number" && (
                    <span className="ink-dev-batt">{d.extra.battery_charging ? "\u26A1" : ""}{d.extra.battery_percent}%</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="ink-topbar-right">
            <span className="ink-time">{fmtTime(data?.server_time)}</span>
            {viewerCount > 0 && <span className="ink-viewers">{viewerCount} 人观</span>}
            <ThemeSwitcher themes={themes} currentTheme={currentTheme} switchTheme={switchTheme} />
          </div>
        </div>
      </header>

      <section className={`ink-hero${isFirstMount ? ` phase-${entryPhase}` : " phase-2"}`}>
        <InkSplashSVG className="ink-splash-hero" />
        {isOnline ? (
          <div className="ink-hero-content">
            <div className="ink-status-badge">
              <span className="ink-status-dot" />
              <span>在线</span>
            </div>
            {active && (
              <div className="ink-hero-main">
                {(() => {
                  const apps = currentAppsByDevice[active.device_id] || [];
                  const fg = apps.find(app => app.is_foreground === 1);
                  const displayApp = fg || active;
                  return (
                    <>
                      <p className="ink-hero-verb">正在使用</p>
                      <h2 className="ink-hero-app">{displayApp.app_name}</h2>
                      {displayApp.display_title && (
                        <p className="ink-hero-title">「{cleanTitle(displayApp.display_title)}」</p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            {music?.title && (
              <div className="ink-music-inline">
                <div className="ink-music-bars">
                  <span /><span /><span /><span /><span />
                </div>
                <div className="ink-music-info">
                  <span className="ink-music-text">{music.title}</span>
                  {music.artist && <span className="ink-music-artist">— {music.artist}</span>}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="ink-hero-offline">
            <p className="ink-offline-text">万籁俱寂</p>
            <p className="ink-offline-sub">山高月小，水落石出</p>
            {loading && !data && <p className="ink-loading">墨迹未干...</p>}
            {error && !loading && <p className="ink-error">信号微弱</p>}
          </div>
        )}
      </section>

      <div className={`ink-content${isFirstMount ? ` phase-${entryPhase}` : " phase-3"}`}>
        <div className="ink-panel ink-panel-left">
          <div className="ink-section ink-section-chart">
            <div className="ink-section-header">
              <h3 className="ink-section-title">今日</h3>
              <span className="ink-section-value">{fmtDur(totalMins)}</span>
            </div>
            <InkUsageChart data={chartData} maxMins={maxChartMins} />
          </div>

          {(totalMusicMins > 0 || totalVideoMins > 0) && (
            <div className="ink-section ink-section-media">
              <div className="ink-section-header">
                <h3 className="ink-section-title">雅音</h3>
                <span className="ink-section-value">
                  {totalMusicMins > 0 && `♪${fmtDur(totalMusicMins)}`}
                  {totalMusicMins > 0 && totalVideoMins > 0 && " · "}
                  {totalVideoMins > 0 && `▶${fmtDur(totalVideoMins)}`}
                </span>
              </div>
              {totalMusicMins > 0 && (
                <div className="ink-media-group">
                  <h4 className="ink-media-title" onClick={() => toggleApp("__music__")} style={{ cursor: "pointer" }}>
                    ♪ 曲目
                    <span className="ink-toggle" style={{ transform: expandedApps.has("__music__") ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
                  </h4>
                  {musicVideoStats.aggregatedMedia.filter(m => m.type === 'music' && m.isPlaying).map(m => (
                    <div key={`mp-${m.title}`} className="ink-media-item ink-playing">
                      <span className="ink-media-item-name">{m.title}</span>
                      <span className="ink-media-item-dur">{fmtDur(m.duration)}</span>
                    </div>
                  ))}
                  <div ref={el => { if (el) itemRefs.current.set("__music__", el); }} className={`ink-media-list-wrap${expandedApps.has("__music__") ? " expanded" : ""}${noScrollbarApps.has("__music__") ? " no-scrollbar" : ""}`}>
                    <div className="ink-media-list">
                      {musicVideoStats.aggregatedMedia.filter(m => m.type === 'music' && !m.isPlaying).map(m => (
                        <div key={`m-${m.title}`} className="ink-media-item">
                          <span className="ink-media-item-name">{m.title}</span>
                          <span className="ink-media-item-dur">{fmtDur(m.duration)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {totalVideoMins > 0 && (
                <div className="ink-media-group">
                  <h4 className="ink-media-title" onClick={() => toggleApp("__video__")} style={{ cursor: "pointer" }}>
                    ▶ 影画
                    <span className="ink-toggle" style={{ transform: expandedApps.has("__video__") ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
                  </h4>
                  {musicVideoStats.aggregatedMedia.filter(m => m.type === 'video' && m.isPlaying).map(m => (
                    <div key={`vp-${m.title}`} className="ink-media-item ink-playing">
                      <span className="ink-media-item-name">{m.title}</span>
                      <span className="ink-media-item-dur">{fmtDur(m.duration)}</span>
                    </div>
                  ))}
                  <div ref={el => { if (el) itemRefs.current.set("__video__", el); }} className={`ink-media-list-wrap${expandedApps.has("__video__") ? " expanded" : ""}${noScrollbarApps.has("__video__") ? " no-scrollbar" : ""}`}>
                    <div className="ink-media-list">
                      {musicVideoStats.aggregatedMedia.filter(m => m.type === 'video' && !m.isPlaying).map(m => (
                        <div key={`v-${m.title}`} className="ink-media-item">
                          <span className="ink-media-item-name">{m.title}</span>
                          <span className="ink-media-item-dur">{fmtDur(m.duration)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="ink-section ink-section-summary">
            <div className="ink-section-header">
              <h3 className="ink-section-title">日札</h3>
              <button
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="ink-gen-btn"
              >
                {generatingSummary ? "研墨中..." : "落笔"}
              </button>
            </div>
            <p className="ink-summary-text">
              {generatingSummary ? "研墨挥毫中..." : (dailySummary?.summary || "每晚亥时自动书写")}
            </p>
          </div>
        </div>

        <div className="ink-panel ink-panel-right">
          <div className="ink-tl-header">
            <span className="ink-tl-title">行迹</span>
            {activeDevFilter && (
              <span className="ink-tl-filter">
                {(data?.devices ?? []).find((d) => d.device_id === activeDevFilter)?.device_name}
                <button className="ink-filter-x" onClick={() => setActiveDevFilter(null)}>×</button>
              </span>
            )}
            <div className="ink-tl-nav">
              <button className="ink-nav-btn" onClick={() => changeDate(offsetDate(selectedDate, -1))}>◁</button>
              <span className="ink-tl-date">{fmtDate(selectedDate)}</span>
              <button className="ink-nav-btn" onClick={() => changeDate(offsetDate(selectedDate, 1))} disabled={isToday}>▷</button>
              {!isToday && <button className="ink-today-btn" onClick={() => changeDate(todayStr())}>今</button>}
            </div>
          </div>

          <div ref={tlScrollRef} className={`ink-tl-scroll${!tlHasOverflow ? " no-overflow" : ""}`}>
            {filteredGroups.length === 0 && !loading ? (
              <div className="ink-empty">
                <p className="ink-empty-text">无迹可寻</p>
                <p className="ink-empty-sub">此日如白纸一张</p>
              </div>
            ) : (
              <div style={{ opacity: loading && tlData ? 0.4 : 1, transition: "opacity 0.2s" }}>
                {onlineDevices.length > 0 && isToday && (
                  <div className="ink-now-summary">
                    <span className="ink-now-label">此刻</span>
                    {onlineDevices.map((d) => {
                      const apps = currentAppsByDevice[d.device_id] || [];
                      const fg = apps.find(app => app.is_foreground === 1);
                      return (
                        <div key={d.device_id} className="ink-now-row">
                          <span className="ink-now-dev">{d.device_name}</span>
                          <span className="ink-now-app">{(fg || d).app_name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {filteredGroups.map(({ devId, name, appGroups }) => (
                  <div key={devId} className="ink-tl-device">
                    <p className="ink-tl-device-name">{name}</p>
                    {appGroups.map((ag) => {
                      const c = getColor(ag.appName);
                      const expanded = expandedApps.has(ag.appName);
                      return (
                        <div key={ag.appName} className={`ink-tl-app${ag.isCurrent && isToday ? " ink-active" : ""}`}>
                          <div className="ink-tl-app-header" onClick={() => toggleApp(ag.appName)} style={{ cursor: "pointer" }}>
                            <span className="ink-tl-app-dot" style={{ background: c }} />
                            <span className="ink-tl-app-name">{ag.appName}</span>
                            {ag.isCurrent && isToday && <span className="ink-tl-app-now">今</span>}
                            <span className="ink-tl-app-total">{fmtDur(ag.totalDuration)}</span>
                            <span className="ink-tl-app-toggle" style={{ transform: expanded ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
                          </div>
                          <div ref={el => { if (el) itemRefs.current.set(ag.appName, el); }} className={`ink-tl-app-wrap${expanded ? " expanded" : ""}${noScrollbarApps.has(ag.appName) ? " no-scrollbar" : ""}`}>
                            <div className="ink-tl-app-items">
                              {ag.items.map((item) => (
                                <div key={`${item.started_at}-${item.device_id}`} className="ink-tl-item">
                                  <span className="ink-tl-item-time">{fmtTimeRange(item.started_at, item.ended_at)}</span>
                                  <span className="ink-tl-item-title">{item.display_title ? cleanTitle(item.display_title) : "—"}</span>
                                  <span className="ink-tl-item-dur">{fmtDur(item.ended_at === null ? Math.max(1, Math.round((now - new Date(item.started_at).getTime()) / 60000)) : item.duration_minutes)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function InkLayout(props: LayoutProps) {
  return <InkLayoutInner {...props} />;
}

registerLayout({
  id: 'inkwash',
  name: '水墨',
  component: InkLayout,
});
