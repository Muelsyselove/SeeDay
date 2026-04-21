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

const PALETTE = ["#e80000", "#ffffff", "#111111", "#ff3333", "#ff6666", "#cc0000", "#ff0033", "#990000", "#ff4444", "#cc1111", "#dd2222", "#ee3333"];

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
  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return `${m}.${d} ${weekdays[date.getDay()]}`;
}

function fmtTime(t?: string) {
  if (!t) return "--:--";
  const d = new Date(t);
  return isNaN(d.getTime()) ? "--:--" : d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function fmtTimeRange(s: string, e: string | null): string {
  const st = fmtTime(s);
  const en = e ? fmtTime(e) : "NOW";
  return `${st}–${en}`;
}

function HalftonePattern({ className }: { className?: string }) {
  return (
    <svg className={className || "p5-halftone"} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="halftone" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.5" fill="currentColor" opacity="0.15" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#halftone)" />
    </svg>
  );
}

function DiagonalStripe({ className }: { className?: string }) {
  return (
    <svg className={className || "p5-stripe"} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="8" fill="currentColor" opacity="0.08" />
        </pattern>
      </defs>
      <rect width="40" height="40" fill="url(#stripes)" />
    </svg>
  );
}

/* ═══ Usage Bar Chart ═══ */
function UsageChart({ data, maxMins }: { data: { name: string; mins: number; color: string }[]; maxMins: number }) {
  if (!data.length) return null;
  return (
    <div className="p5-usage-chart">
      {data.map((d, i) => (
        <div key={d.name} className="p5-usage-row" style={{ "--ci": i } as React.CSSProperties}>
          <span className="p5-usage-label">{d.name}</span>
          <div className="p5-usage-track">
            <div
              className="p5-usage-fill"
              style={{ width: `${Math.max(3, (d.mins / maxMins) * 100)}%`, background: d.color }}
            />
          </div>
          <span className="p5-usage-mins">{fmtDur(d.mins)}</span>
        </div>
      ))}
    </div>
  );
}

function PersonaLayoutInner({ themes, currentTheme, switchTheme }: LayoutProps) {
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
  const [heroHovered, setHeroHovered] = useState(false);
  const [isFirstMount, setIsFirstMount] = useState(true);

  useEffect(() => {
    const timer1 = setTimeout(() => setEntryPhase(1), 100);
    const timer2 = setTimeout(() => setEntryPhase(2), 400);
    const timer3 = setTimeout(() => setEntryPhase(3), 700);
    const timer4 = setTimeout(() => setIsFirstMount(false), 1200);
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
    <>
      {/* Animated background layers */}
      <div className="p5-bg-layer">
        <HalftonePattern className="p5-halftone-bg" />
        <DiagonalStripe className="p5-stripe-bg" />
      </div>

      {/* ═══ TOP BAR ═══ */}
      <header className={`p5-topbar${isFirstMount ? ` phase-${entryPhase}` : " phase-3"}`}>
        <div className="p5-topbar-inner">
          <div className="p5-topbar-left">
            <h1 className="p5-site-title">MONIKA</h1>
            <span className="p5-site-sub">NOW</span>
          </div>
          <div className="p5-topbar-center">
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
                  className={`p5-dev-btn ${isSel ? "p5-dev-active" : ""} ${isOn ? "" : "p5-dev-off"}`}
                  onClick={() => handleDevFilter(d.device_id)}
                >
                  <span className="p5-dev-name">{d.device_name}</span>
                  {isOn && <span className="p5-dev-app">{displayApp.app_name}</span>}
                  {!isOn && <span className="p5-dev-off-label">OFF</span>}
                  {isOn && d.extra && typeof d.extra.battery_percent === "number" && (
                    <span className="p5-dev-batt">{d.extra.battery_percent}%</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="p5-topbar-right">
            <span className="p5-time">{fmtTime(data?.server_time)}</span>
            {viewerCount > 0 && <span className="p5-viewers">{viewerCount}</span>}
            <ThemeSwitcher themes={themes} currentTheme={currentTheme} switchTheme={switchTheme} />
          </div>
        </div>
      </header>

      {/* ═══ HERO SECTION ═══ */}
      <section className={`p5-hero${isFirstMount ? ` phase-${entryPhase}` : " phase-2"}`}>
        <div className="p5-hero-accent" />
        {isOnline ? (
          <div className="p5-hero-content">
            <div className="p5-status-badge">
              <span className="p5-status-dot" />
              <span>ONLINE</span>
            </div>
            {active && (
              <div className="p5-hero-main"
                onMouseEnter={() => setHeroHovered(true)}
                onMouseLeave={() => setHeroHovered(false)}
              >
                {(() => {
                  const apps = currentAppsByDevice[active.device_id] || [];
                  const fg = apps.find(app => app.is_foreground === 1);
                  const displayApp = fg || active;
                  return (
                    <>
                      <p className="p5-hero-action">USING</p>
                      <h2 className="p5-hero-app">{displayApp.app_name}</h2>
                      {displayApp.display_title && (
                        <p className={`p5-hero-title${heroHovered ? " p5-hero-title-visible" : ""}`}>「{cleanTitle(displayApp.display_title)}」</p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            {music?.title && (
              <div className="p5-music-inline">
                <div className="p5-music-bars">
                  <span /><span /><span /><span /><span />
                </div>
                <span className="p5-music-text">{music.title}</span>
                {music.artist && <span className="p5-music-artist">— {music.artist}</span>}
              </div>
            )}
          </div>
        ) : (
          <div className="p5-hero-offline">
            <p className="p5-offline-text">ALL SYSTEMS OFFLINE</p>
            {loading && !data && <p className="p5-loading">Connecting...</p>}
            {error && !loading && <p className="p5-error">Connection Error</p>}
          </div>
        )}
      </section>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className={`p5-content${isFirstMount ? ` phase-${entryPhase}` : " phase-3"}`}>
        {/* LEFT: Stats & Media */}
        <div className="p5-panel p5-panel-left">
          {/* Usage Chart */}
          <div className="p5-section p5-section-chart">
            <div className="p5-section-header">
              <h3 className="p5-section-title">TODAY</h3>
              <span className="p5-section-value">{fmtDur(totalMins)}</span>
            </div>
            <UsageChart data={chartData} maxMins={maxChartMins} />
          </div>

          {/* Media */}
          {(totalMusicMins > 0 || totalVideoMins > 0) && (
            <div className="p5-section p5-section-media">
              <div className="p5-section-header">
                <h3 className="p5-section-title">MEDIA</h3>
                <span className="p5-section-value">
                  {totalMusicMins > 0 && `♪${fmtDur(totalMusicMins)}`}
                  {totalMusicMins > 0 && totalVideoMins > 0 && " / "}
                  {totalVideoMins > 0 && `▶${fmtDur(totalVideoMins)}`}
                </span>
              </div>
              {totalMusicMins > 0 && (
                <div className="p5-media-group">
                  <h4 className="p5-media-title" onClick={() => toggleApp("__music__")} style={{ cursor: "pointer" }}>
                    ♪ MUSIC
                    <span className="p5-toggle" style={{ transform: expandedApps.has("__music__") ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
                  </h4>
                  {musicVideoStats.aggregatedMedia.filter(m => m.type === 'music' && m.isPlaying).map(m => (
                    <div key={`mp-${m.title}`} className="p5-media-item p5-playing">
                      <span className="p5-media-item-name">{m.title}</span>
                      <span className="p5-media-item-dur">{fmtDur(m.duration)}</span>
                    </div>
                  ))}
                  <div ref={el => { if (el) itemRefs.current.set("__music__", el); }} className={`p5-media-list-wrap${expandedApps.has("__music__") ? " expanded" : ""}${noScrollbarApps.has("__music__") ? " no-scrollbar" : ""}`}>
                    <div className="p5-media-list">
                      {musicVideoStats.aggregatedMedia.filter(m => m.type === 'music' && !m.isPlaying).map(m => (
                        <div key={`m-${m.title}`} className="p5-media-item">
                          <span className="p5-media-item-name">{m.title}</span>
                          <span className="p5-media-item-dur">{fmtDur(m.duration)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {totalVideoMins > 0 && (
                <div className="p5-media-group">
                  <h4 className="p5-media-title" onClick={() => toggleApp("__video__")} style={{ cursor: "pointer" }}>
                    ▶ VIDEO
                    <span className="p5-toggle" style={{ transform: expandedApps.has("__video__") ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
                  </h4>
                  {musicVideoStats.aggregatedMedia.filter(m => m.type === 'video' && m.isPlaying).map(m => (
                    <div key={`vp-${m.title}`} className="p5-media-item p5-playing">
                      <span className="p5-media-item-name">{m.title}</span>
                      <span className="p5-media-item-dur">{fmtDur(m.duration)}</span>
                    </div>
                  ))}
                  <div ref={el => { if (el) itemRefs.current.set("__video__", el); }} className={`p5-media-list-wrap${expandedApps.has("__video__") ? " expanded" : ""}${noScrollbarApps.has("__video__") ? " no-scrollbar" : ""}`}>
                    <div className="p5-media-list">
                      {musicVideoStats.aggregatedMedia.filter(m => m.type === 'video' && !m.isPlaying).map(m => (
                        <div key={`v-${m.title}`} className="p5-media-item">
                          <span className="p5-media-item-name">{m.title}</span>
                          <span className="p5-media-item-dur">{fmtDur(m.duration)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Summary */}
          <div className="p5-section p5-section-summary">
            <div className="p5-section-header">
              <h3 className="p5-section-title">SUMMARY</h3>
              <button
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="p5-gen-btn"
              >
                {generatingSummary ? "..." : "GEN"}
              </button>
            </div>
            <p className="p5-summary-text">
              {generatingSummary ? "Generating..." : (dailySummary?.summary || "Auto-generated at 21:00")}
            </p>
          </div>
        </div>

        {/* RIGHT: Timeline */}
        <div className="p5-panel p5-panel-right">
          <div className="p5-tl-header">
            <span className="p5-tl-title">TIMELINE</span>
            {activeDevFilter && (
              <span className="p5-tl-filter">
                {(data?.devices ?? []).find((d) => d.device_id === activeDevFilter)?.device_name}
                <button className="p5-filter-x" onClick={() => setActiveDevFilter(null)}>×</button>
              </span>
            )}
            <div className="p5-tl-nav">
              <button className="p5-nav-btn" onClick={() => changeDate(offsetDate(selectedDate, -1))}>◀</button>
              <span className="p5-tl-date">{fmtDate(selectedDate)}</span>
              <button className="p5-nav-btn" onClick={() => changeDate(offsetDate(selectedDate, 1))} disabled={isToday}>▶</button>
              {!isToday && <button className="p5-today-btn" onClick={() => changeDate(todayStr())}>TODAY</button>}
            </div>
          </div>

          <div ref={tlScrollRef} className={`p5-tl-scroll${!tlHasOverflow ? " no-overflow" : ""}`}>
            {filteredGroups.length === 0 && !loading ? (
              <div className="p5-empty">
                <p className="p5-empty-text">NO DATA</p>
                <p className="p5-empty-sub">This day is blank</p>
              </div>
            ) : (
              <div style={{ opacity: loading && tlData ? 0.4 : 1, transition: "opacity 0.2s" }}>
                {/* Now summary */}
                {onlineDevices.length > 0 && isToday && (
                  <div className="p5-now-summary">
                    <span className="p5-now-label">NOW</span>
                    {onlineDevices.map((d) => {
                      const apps = currentAppsByDevice[d.device_id] || [];
                      const fg = apps.find(app => app.is_foreground === 1);
                      return (
                        <div key={d.device_id} className="p5-now-row">
                          <span className="p5-now-dev">{d.device_name}</span>
                          <span className="p5-now-app">{(fg || d).app_name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {filteredGroups.map(({ devId, name, appGroups }) => (
                  <div key={devId} className="p5-tl-device">
                    <p className="p5-tl-device-name">{name}</p>
                    {appGroups.map((ag) => {
                      const c = getColor(ag.appName);
                      const appKey = `${devId}-${ag.appName}`;
                      const expanded = expandedApps.has(appKey);
                      return (
                        <div key={ag.appName} className={`p5-tl-app${ag.isCurrent && isToday ? " p5-active" : ""}`}>
                          <div className="p5-tl-app-header" onClick={() => toggleApp(appKey)} style={{ cursor: "pointer" }}>
                            <span className="p5-tl-app-dot" style={{ background: c }} />
                            <span className="p5-tl-app-name">{ag.appName}</span>
                            {ag.isCurrent && isToday && <span className="p5-tl-app-now">NOW</span>}
                            <span className="p5-tl-app-total">{fmtDur(ag.totalDuration)}</span>
                            <span className="p5-tl-app-toggle" style={{ transform: expanded ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
                          </div>
                          <div ref={el => { if (el) itemRefs.current.set(appKey, el); }} className={`p5-tl-app-wrap${expanded ? " expanded" : ""}${noScrollbarApps.has(appKey) ? " no-scrollbar" : ""}`}>
                            <div className="p5-tl-app-items">
                              {ag.items.map((item) => (
                                <div key={`${item.started_at}-${item.device_id}`} className="p5-tl-item">
                                  <span className="p5-tl-item-time">{fmtTimeRange(item.started_at, item.ended_at)}</span>
                                  <span className="p5-tl-item-title">{item.display_title ? cleanTitle(item.display_title) : "-"}</span>
                                  <span className="p5-tl-item-dur">{fmtDur(item.ended_at === null ? Math.max(1, Math.round((now - new Date(item.started_at).getTime()) / 60000)) : item.duration_minutes)}</span>
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
    </>
  );
}

export function PersonaLayout(props: LayoutProps) {
  return <PersonaLayoutInner {...props} />;
}

registerLayout({
  id: 'persona',
  name: 'Persona',
  component: PersonaLayout,
});
