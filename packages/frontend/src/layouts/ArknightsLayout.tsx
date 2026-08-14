"use client";

import type React from "react";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { generateDailySummary } from "@/lib/api";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { registerLayout, LayoutProps } from "./registry";

/* ═══ Utilities ═══ */
function cleanTitle(title: string): string {
  return title.replace(/\s*\(゜-゜\)つロ\s*干杯~-bilibili\s*$/i, "");
}

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
  return `${fmtTime(s)}–${e ? fmtTime(e) : "NOW"}`;
}

/* ═══ Canvas Background ═══ */
function BackgroundEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationId: number;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }> = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const createParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 40000);
      for (let i = 0; i < count; i++) {
        particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15, size: Math.random() * 1.2 + 0.3, opacity: Math.random() * 0.3 + 0.05 });
      }
    };
    const drawGrid = () => {
      const gridSize = 100;
      ctx.strokeStyle = "rgba(0, 140, 200, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = 0; y < canvas.height; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    };
    const drawParticles = () => {
      particles.forEach((p) => { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0; if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = `rgba(0, 140, 200, ${p.opacity})`; ctx.fill(); });
    };
    const drawConnections = () => {
      const maxDistance = 100;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y; const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < maxDistance) { const opacity = (1 - distance / maxDistance) * 0.06; ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = `rgba(0, 140, 200, ${opacity})`; ctx.lineWidth = 0.5; ctx.stroke(); }
        }
      }
    };
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid(); drawParticles(); drawConnections();
      animationId = requestAnimationFrame(animate);
    };
    resize(); createParticles(); animate();
    window.addEventListener("resize", () => { resize(); createParticles(); });
    return () => { cancelAnimationFrame(animationId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />;
}

/* ═══ Icons ═══ */
const OverviewIcon = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
const DevicesIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
const AppsIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const MediaIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const TimelineIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const StatsIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const SummaryIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const MusicIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
const VideoIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const DeviceIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
const ActivityIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const ClockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const BackIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const ChevronLeft = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevronRight = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>;
const OnlineIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const OfflineIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;

const PALETTE = ["#00a8e8", "#ff6b35", "#ffc107", "#4ade80", "#a78bfa", "#f472b6", "#60a5fa", "#34d399", "#fb923c", "#ef4444", "#8b5cf6", "#10b981"];

/* ═══ Secondary Panel ═══ */
function SecondaryPanel({ type, onClose, data, timeline, selectedDate, changeDate, now, currentAppsByDevice }: {
  type: string | null;
  onClose: () => void;
  data: any;
  timeline: any;
  selectedDate: string;
  changeDate: (d: string) => void;
  now: number;
  currentAppsByDevice: Record<string, any[]>;
}) {
  const isToday = selectedDate === todayStr();
  const colorRef = useRef(new Map<string, string>());
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [noScrollbarApps, setNoScrollbarApps] = useState<Set<string>>(new Set());
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  function getColor(app: string) {
    let c = colorRef.current.get(app);
    if (!c) { c = PALETTE[colorRef.current.size % PALETTE.length]!; colorRef.current.set(app, c); }
    return c;
  }

  const toggleApp = useCallback((key: string) => {
    setExpandedApps(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); setNoScrollbarApps(s => { const ns = new Set(s); ns.delete(key); return ns; }); }
      else {
        next.add(key);
        setTimeout(() => {
          const wrapper = itemRefs.current.get(key);
          if (wrapper) { const child = wrapper.firstElementChild as HTMLElement; if (child && child.scrollHeight <= child.clientHeight) { setNoScrollbarApps(s => { const ns = new Set(s); ns.add(key); return ns; }); } }
        }, 350);
      }
      return next;
    });
  }, []);

  const tlGroups = useMemo(() => {
    const segs = timeline?.segments ?? [];
    if (!segs.length) return [];
    const byDev = new Map<string, { name: string; items: typeof segs }>();
    for (const s of segs) { let e = byDev.get(s.device_id); if (!e) { e = { name: s.device_name, items: [] }; byDev.set(s.device_id, e); } e.items.push(s); }
    return Array.from(byDev.entries()).map(([devId, { name, items }]) => {
      const sortedItems = [...items].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
      const currentApps = currentAppsByDevice[devId] || [];
      const currentAppNames = new Set(currentApps.map((a: any) => a.app_name));
      const byApp = new Map<string, typeof sortedItems>();
      for (const s of sortedItems) { let e = byApp.get(s.app_name); if (!e) { e = []; byApp.set(s.app_name, e); } e.push(s); }
      const appGroups = Array.from(byApp.entries()).map(([appName, appItems]) => {
        const totalDuration = appItems.reduce((sum, item) => { if (item.ended_at === null) return sum + Math.max(1, Math.round((now - new Date(item.started_at).getTime()) / 60000)); return sum + item.duration_minutes; }, 0);
        const isCurrent = appItems.some(item => item.ended_at === null) || currentAppNames.has(appName);
        return { appName, totalDuration, items: appItems, isCurrent };
      }).sort((a, b) => b.totalDuration - a.totalDuration);
      return { devId, name, appGroups };
    });
  }, [timeline, currentAppsByDevice, now]);

  const chartData = useMemo(() => {
    const appMins = new Map<string, number>();
    for (const g of tlGroups) { for (const ag of g.appGroups) { appMins.set(ag.appName, (appMins.get(ag.appName) || 0) + ag.totalDuration); } }
    return Array.from(appMins.entries()).map(([name, mins]) => ({ name, mins, color: getColor(name) })).sort((a, b) => b.mins - a.mins).slice(0, 10);
  }, [tlGroups]);

  const maxChartMins = chartData.length ? chartData[0].mins : 1;

  const musicVideoStats = useMemo(() => {
    const musicMins = new Map<string, number>();
    const videoMins = new Map<string, number>();
    const mediaItems = new Map<string, { type: 'music' | 'video'; title: string; duration: number; isPlaying: boolean; firstPlayedAt: string }>();
    for (const g of tlGroups) {
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
          const dur = item.ended_at === null ? Math.max(1, Math.round((now - new Date(item.started_at).getTime()) / 60000)) : item.duration_minutes;
          const playing = item.ended_at === null;
          if (mediaItems.has(key)) { const existing = mediaItems.get(key)!; existing.duration += dur; if (playing) existing.isPlaying = true; }
          else { mediaItems.set(key, { type: isMusic ? 'music' : 'video', title, duration: dur, isPlaying: playing, firstPlayedAt: item.started_at }); }
        }
      }
    }
    const aggregatedMedia = Array.from(mediaItems.values()).sort((a, b) => { if (a.isPlaying && !b.isPlaying) return -1; if (!a.isPlaying && b.isPlaying) return 1; return a.firstPlayedAt.localeCompare(b.firstPlayedAt); });
    return { musicMins, videoMins, aggregatedMedia };
  }, [tlGroups, now]);

  const totalMusicMins = Array.from(musicVideoStats.musicMins.values()).reduce((sum, mins) => sum + mins, 0);
  const totalVideoMins = Array.from(musicVideoStats.videoMins.values()).reduce((sum, mins) => sum + mins, 0);

  const totalMins = useMemo(() => {
    const intervals: { start: number; end: number }[] = [];
    for (const g of tlGroups) { for (const ag of g.appGroups) { for (const item of ag.items) { const start = new Date(item.started_at).getTime(); const end = item.ended_at ? new Date(item.ended_at).getTime() : now; intervals.push({ start, end }); } } }
    if (!intervals.length) return 0;
    intervals.sort((a, b) => a.start - b.start);
    let merged = 0; let curStart = intervals[0].start; let curEnd = intervals[0].end;
    for (let i = 1; i < intervals.length; i++) { if (intervals[i].start <= curEnd) curEnd = Math.max(curEnd, intervals[i].end); else { merged += curEnd - curStart; curStart = intervals[i].start; curEnd = intervals[i].end; } }
    merged += curEnd - curStart;
    return Math.round(merged / 60000);
  }, [tlGroups, now]);

  const onlineCount = (data?.devices ?? []).filter((d: any) => d.is_online === 1).length;
  const totalDevices = (data?.devices ?? []).length;

  if (!type) return null;

  const titles: Record<string, { zh: string; en: string; icon: React.ReactNode }> = {
    overview: { zh: "总览", en: "OVERVIEW", icon: <OverviewIcon /> },
    devices: { zh: "设备", en: "DEVICES", icon: <DevicesIcon /> },
    apps: { zh: "应用", en: "APPLICATIONS", icon: <AppsIcon /> },
    media: { zh: "媒体", en: "MEDIA", icon: <MediaIcon /> },
    timeline: { zh: "时间线", en: "TIMELINE", icon: <TimelineIcon /> },
    stats: { zh: "统计", en: "STATISTICS", icon: <StatsIcon /> },
    summary: { zh: "小结", en: "SUMMARY", icon: <SummaryIcon /> },
  };

  const t = titles[type] || { zh: type, en: type.toUpperCase(), icon: <OverviewIcon /> };

  return (
    <div className="ark-secondary-panel">
      <div className="ark-secondary-header">
        <button className="ark-back-btn" onClick={onClose}><BackIcon /></button>
        <div className="ark-secondary-title">
          <span className="ark-sec-title-icon">{t.icon}</span>
          <span className="ark-sec-title-zh">{t.zh}</span>
          <span className="ark-sec-title-en">{t.en}</span>
        </div>
        <div className="ark-sec-date-nav">
          <button className="ark-sec-nav-btn" onClick={() => changeDate(offsetDate(selectedDate, -1))}>◀</button>
          <span className="ark-sec-date">{fmtDate(selectedDate)}</span>
          <button className="ark-sec-nav-btn" onClick={() => changeDate(offsetDate(selectedDate, 1))} disabled={isToday}>▶</button>
          {!isToday && <button className="ark-sec-today" onClick={() => changeDate(todayStr())}>TODAY</button>}
        </div>
      </div>

      <div className="ark-secondary-content">
        {/* OVERVIEW: Dashboard summary */}
        {type === "overview" && (
          <div className="ark-sec-view">
            <div className="ark-sec-stats-row">
              <div className="ark-sec-stat-box">
                <ClockIcon />
                <div>
                  <span className="ark-sec-stat-label">TOTAL TIME</span>
                  <span className="ark-sec-stat-value">{fmtDur(totalMins)}</span>
                </div>
              </div>
              <div className="ark-sec-stat-box">
                <DeviceIcon />
                <div>
                  <span className="ark-sec-stat-label">DEVICES</span>
                  <span className="ark-sec-stat-value">{onlineCount}/{totalDevices}</span>
                </div>
              </div>
              <div className="ark-sec-stat-box">
                <ActivityIcon />
                <div>
                  <span className="ark-sec-stat-label">APPS</span>
                  <span className="ark-sec-stat-value">{chartData.length}</span>
                </div>
              </div>
            </div>
            <div className="ark-sec-chart">
              {chartData.map((d) => (
                <div key={d.name} className="ark-sec-chart-row">
                  <span className="ark-sec-chart-label">{d.name}</span>
                  <div className="ark-sec-chart-track"><div className="ark-sec-chart-fill" style={{ width: `${Math.max(3, (d.mins / maxChartMins) * 100)}%`, background: d.color }} /></div>
                  <span className="ark-sec-chart-mins">{fmtDur(d.mins)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DEVICES: Device List */}
        {type === "devices" && (
          <div className="ark-sec-devices">
            {(data?.devices ?? []).map((d: any) => {
              const apps = currentAppsByDevice[d.device_id] || [];
              const fg = apps.find((app: any) => app.is_foreground === 1);
              return (
                <div key={d.device_id} className={`ark-sec-device-card${d.is_online === 1 ? " online" : ""}`}>
                  <div className="ark-sec-device-header">
                    <span className="ark-sec-device-name">{d.device_name}</span>
                    <span className={`ark-sec-device-status${d.is_online === 1 ? " online" : ""}`}>{d.is_online === 1 ? "ONLINE" : "OFFLINE"}</span>
                  </div>
                  {d.is_online === 1 && (
                    <div className="ark-sec-device-info">
                      <span className="ark-sec-device-app">{(fg || d).app_name}</span>
                      {d.extra?.battery_percent !== undefined && <span className="ark-sec-device-batt">{d.extra.battery_percent}%</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* APPS: App Stats */}
        {type === "apps" && (
          <div className="ark-sec-view">
            <div className="ark-sec-chart">
              {chartData.map((d, i) => (
                <div key={d.name} className="ark-sec-chart-row">
                  <span className="ark-sec-chart-rank">#{i + 1}</span>
                  <span className="ark-sec-chart-label">{d.name}</span>
                  <div className="ark-sec-chart-track"><div className="ark-sec-chart-fill" style={{ width: `${Math.max(3, (d.mins / maxChartMins) * 100)}%`, background: d.color }} /></div>
                  <span className="ark-sec-chart-mins">{fmtDur(d.mins)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEDIA: Music & Video */}
        {type === "media" && (
          <div className="ark-sec-view">
            {(totalMusicMins > 0 || totalVideoMins > 0) ? (
              <>
                {totalMusicMins > 0 && (
                  <div className="ark-sec-media-group">
                    <h4 className="ark-sec-media-title"><MusicIcon /> MUSIC <span className="ark-sec-media-total">{fmtDur(totalMusicMins)}</span></h4>
                    {musicVideoStats.aggregatedMedia.filter((m: any) => m.type === 'music').map((m: any) => (
                      <div key={m.title} className={`ark-sec-media-item${m.isPlaying ? " playing" : ""}`}>
                        <span className="ark-sec-media-name">{m.title}</span>
                        <span className="ark-sec-media-dur">{fmtDur(m.duration)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {totalVideoMins > 0 && (
                  <div className="ark-sec-media-group">
                    <h4 className="ark-sec-media-title"><VideoIcon /> VIDEO <span className="ark-sec-media-total">{fmtDur(totalVideoMins)}</span></h4>
                    {musicVideoStats.aggregatedMedia.filter((m: any) => m.type === 'video').map((m: any) => (
                      <div key={m.title} className={`ark-sec-media-item${m.isPlaying ? " playing" : ""}`}>
                        <span className="ark-sec-media-name">{m.title}</span>
                        <span className="ark-sec-media-dur">{fmtDur(m.duration)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="ark-sec-empty"><p>NO MEDIA</p><span>No music or video activity today</span></div>
            )}
          </div>
        )}

        {/* TIMELINE: Full Timeline */}
        {type === "timeline" && (
          <div className="ark-sec-timeline">
            {tlGroups.length === 0 ? (
              <div className="ark-sec-empty"><p>NO DATA</p><span>This day is blank</span></div>
            ) : (
              tlGroups.map(({ devId, name, appGroups }) => (
                <div key={devId} className="ark-sec-tl-device">
                  <p className="ark-sec-tl-devname">{name}</p>
                  {appGroups.map((ag) => {
                    const c = getColor(ag.appName);
                    const key = `${devId}-${ag.appName}`;
                    const expanded = expandedApps.has(key);
                    return (
                      <div key={ag.appName} className={`ark-sec-tl-app${ag.isCurrent && isToday ? " active" : ""}`}>
                        <div className="ark-sec-tl-appheader" onClick={() => toggleApp(key)}>
                          <span className="ark-sec-tl-dot" style={{ background: c }} />
                          <span className="ark-sec-tl-appname">{ag.appName}</span>
                          {ag.isCurrent && isToday && <span className="ark-sec-tl-now">NOW</span>}
                          <span className="ark-sec-tl-total">{fmtDur(ag.totalDuration)}</span>
                          <span className="ark-sec-tl-toggle" style={{ transform: expanded ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
                        </div>
                        <div ref={el => { if (el) itemRefs.current.set(key, el); }} className={`ark-sec-tl-wrap${expanded ? " expanded" : ""}${noScrollbarApps.has(key) ? " no-scrollbar" : ""}`}>
                          <div className="ark-sec-tl-items">
                            {ag.items.map((item) => (
                              <div key={`${item.started_at}-${item.device_id}`} className="ark-sec-tl-item">
                                <span className="ark-sec-tl-time">{fmtTimeRange(item.started_at, item.ended_at)}</span>
                                <span className="ark-sec-tl-itemtitle">{item.display_title ? cleanTitle(item.display_title) : "-"}</span>
                                <span className="ark-sec-tl-itemdur">{fmtDur(item.ended_at === null ? Math.max(1, Math.round((now - new Date(item.started_at).getTime()) / 60000)) : item.duration_minutes)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {/* STATS: Category Stats */}
        {type === "stats" && (
          <div className="ark-sec-view">
            <div className="ark-sec-stats-row">
              <div className="ark-sec-stat-box">
                <div>
                  <span className="ark-sec-stat-label">SCREEN TIME</span>
                  <span className="ark-sec-stat-value">{fmtDur(totalMins)}</span>
                </div>
              </div>
              <div className="ark-sec-stat-box">
                <div>
                  <span className="ark-sec-stat-label">MUSIC TIME</span>
                  <span className="ark-sec-stat-value" style={{ color: "#ff6b35" }}>{fmtDur(totalMusicMins)}</span>
                </div>
              </div>
              <div className="ark-sec-stat-box">
                <div>
                  <span className="ark-sec-stat-label">VIDEO TIME</span>
                  <span className="ark-sec-stat-value" style={{ color: "#00a8e8" }}>{fmtDur(totalVideoMins)}</span>
                </div>
              </div>
            </div>
            <div className="ark-sec-chart">
              {chartData.slice(0, 6).map((d, i) => (
                <div key={d.name} className="ark-sec-chart-row">
                  <span className="ark-sec-chart-rank">#{i + 1}</span>
                  <span className="ark-sec-chart-label">{d.name}</span>
                  <div className="ark-sec-chart-track"><div className="ark-sec-chart-fill" style={{ width: `${Math.max(3, (d.mins / maxChartMins) * 100)}%`, background: d.color }} /></div>
                  <span className="ark-sec-chart-mins">{fmtDur(d.mins)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUMMARY: AI Daily Summary */}
        {type === "summary" && (
          <div className="ark-sec-view">
            <SummaryPanel selectedDate={selectedDate} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ AI Summary Sub-component ═══ */
function SummaryPanel({ selectedDate }: { selectedDate: string }) {
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
    <div className="ark-summary-panel">
      <div className="ark-summary-header">
        <span className="ark-summary-label">AI DAILY SUMMARY</span>
        <button
          className="ark-summary-btn"
          onClick={handleGenerateSummary}
          disabled={generatingSummary}
        >
          {generatingSummary ? "生成中..." : "立即生成"}
        </button>
      </div>
      <div className="ark-summary-content">
        {generatingSummary ? (
          <p className="ark-summary-text">正在请 AI 撰写小结...</p>
        ) : dailySummary?.summary ? (
          <div className="ark-summary-text" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{dailySummary.summary}</div>
        ) : (
          <p className="ark-summary-text ark-summary-placeholder">每晚 21:00 自动生成今日小结</p>
        )}
      </div>
      {dailySummary?.generated_at && (
        <span className="ark-summary-time">{dailySummary.generated_at.slice(11, 16)} · AI 生成</span>
      )}
    </div>
  );
}

/* ═══ Main Layout ═══ */
function ArknightsLayoutInner({ themes, currentTheme, switchTheme }: LayoutProps) {
  const { current, timeline, selectedDate, changeDate, loading, error, viewerCount } = useDashboard();
  const [now, setNow] = useState(Date.now());
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [entryPhase, setEntryPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setEntryPhase(1), 100);
    const t2 = setTimeout(() => setEntryPhase(2), 400);
    const t3 = setTimeout(() => setEntryPhase(3), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const data = current;
  const onlineDevices = useMemo(() => (data?.devices ?? []).filter((d) => d.is_online === 1), [data?.devices]);
  const active = useMemo(() => {
    if (!onlineDevices.length) return undefined;
    let best = onlineDevices[0];
    for (const d of onlineDevices) { const t = d.last_seen_at ? new Date(d.last_seen_at).getTime() : 0; const bt = best.last_seen_at ? new Date(best.last_seen_at).getTime() : 0; if (t > bt) best = d; }
    return best;
  }, [onlineDevices]);
  const isOnline = !!active;

  const currentAppsByDevice = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const d of data?.device_app_states ?? []) { if (!m[d.device_id]) m[d.device_id] = []; m[d.device_id].push(d); }
    for (const deviceId in m) { m[deviceId].sort((a, b) => { if (a.is_foreground !== b.is_foreground) return b.is_foreground - a.is_foreground; return new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime(); }); }
    return m;
  }, [data?.device_app_states]);

  const currentDate = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  const currentTime = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  const tlData = timeline;
  const totalMins = useMemo(() => {
    const segs = tlData?.segments ?? [];
    const intervals = segs.map((s: any) => ({ start: new Date(s.started_at).getTime(), end: s.ended_at ? new Date(s.ended_at).getTime() : now }));
    if (!intervals.length) return 0;
    intervals.sort((a: any, b: any) => a.start - b.start);
    let merged = 0, curStart = intervals[0].start, curEnd = intervals[0].end;
    for (let i = 1; i < intervals.length; i++) { if (intervals[i].start <= curEnd) curEnd = Math.max(curEnd, intervals[i].end); else { merged += curEnd - curStart; curStart = intervals[i].start; curEnd = intervals[i].end; } }
    merged += curEnd - curStart;
    return Math.round(merged / 60000);
  }, [tlData, now]);

  const appCount = useMemo(() => {
    const segs = tlData?.segments ?? [];
    return new Set(segs.map((s: any) => s.app_name)).size;
  }, [tlData]);

  const music = active?.extra?.music;

  // Module definitions with real data bindings - all functional
  const mainModules = [
    {
      id: "overview",
      zh: "总览",
      en: "OVERVIEW",
      icon: <OverviewIcon />,
      accent: "#00a8e8",
      large: true,
      extra: { primary: fmtDur(totalMins), secondary: "今日时长", sub: `${onlineDevices.length} 设备在线` }
    },
    {
      id: "devices",
      zh: "设备",
      en: "DEVICES",
      icon: <DevicesIcon />,
      accent: "#ff6b35",
      extra: { primary: `${onlineDevices.length}`, secondary: "在线设备", sub: `${(data?.devices ?? []).length} 总计` }
    },
    {
      id: "apps",
      zh: "应用",
      en: "APPS",
      icon: <AppsIcon />,
      accent: "#ffc107",
      extra: { primary: `${appCount}`, secondary: "应用数", sub: "今日活跃" }
    },
  ];

  const bottomModules = [
    {
      id: "media",
      zh: "媒体",
      en: "MEDIA",
      icon: <MediaIcon />,
      accent: "#00a8e8",
      badge: null,
    },
    {
      id: "timeline",
      zh: "时间线",
      en: "TIMELINE",
      icon: <TimelineIcon />,
      accent: "#ff6b35",
      badge: (tlData?.segments ?? []).length > 0 ? `${(tlData?.segments ?? []).length}` : null,
    },
    {
      id: "stats",
      zh: "统计",
      en: "STATS",
      icon: <StatsIcon />,
      accent: "#ffc107",
      badge: null,
    },
    {
      id: "summary",
      zh: "小结",
      en: "SUMMARY",
      icon: <SummaryIcon />,
      accent: "#a0a0a0",
      badge: null,
    },
  ];

  return (
    <>
      <BackgroundEffect />

      {/* ═══ TOP BAR ═══ */}
      <header className={`ark-topbar${entryPhase >= 1 ? " active" : ""}`}>
        <div className="ark-topbar-inner">
          <div className="ark-topbar-left">
            <span className="ark-logo">◆ RHODES ISLAND</span>
          </div>
          <div className="ark-topbar-center">
            <span className="ark-system-status">
              {isOnline ? <><span className="ark-status-indicator online" /> SYSTEM ONLINE</> : <><span className="ark-status-indicator offline" /> STANDBY</>}
            </span>
          </div>
          <div className="ark-topbar-right">
            <span className="ark-datetime">{currentDate} <span className="ark-time-highlight">{currentTime}</span></span>
            <ThemeSwitcher themes={themes} currentTheme={currentTheme} switchTheme={switchTheme} />
          </div>
        </div>
      </header>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className={`ark-main${entryPhase >= 2 ? " active" : ""}${activePanel ? " panel-open" : ""}`}>
        {/* LEFT: Status Panel */}
        <div className="ark-left">
          <div className="ark-status-card">
            <div className="ark-status-header">
              <span className="ark-status-badge">OPERATOR</span>
              <span className="ark-status-id">ID: 92530365</span>
            </div>
            <h2 className="ark-operator-name">时间的蓝色斩击</h2>
            <div className="ark-status-divider" />
            <div className="ark-status-row">
              <span className="ark-status-label">当前状态</span>
              <span className={`ark-status-value${isOnline ? " online" : ""}`}>
                {isOnline ? <><OnlineIcon /> ONLINE</> : <><OfflineIcon /> OFFLINE</>}
              </span>
            </div>
            {isOnline && active && (
              <>
                <div className="ark-status-row">
                  <span className="ark-status-label">活跃设备</span>
                  <span className="ark-status-value">{active.device_name}</span>
                </div>
                <div className="ark-status-row">
                  <span className="ark-status-label">前台应用</span>
                  <span className="ark-status-value highlight">{active.app_name}</span>
                </div>
                {active.display_title && (
                  <div className="ark-status-row">
                    <span className="ark-status-label">窗口标题</span>
                    <span className="ark-status-value">{cleanTitle(active.display_title)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Music Card */}
          {music?.title && (
            <div className="ark-music-card">
              <div className="ark-music-header">
                <MusicIcon />
                <span>NOW PLAYING</span>
              </div>
              <div className="ark-music-info">
                <span className="ark-music-title">{music.title}</span>
                {music.artist && <span className="ark-music-artist">{music.artist}</span>}
              </div>
              <div className="ark-music-bars">
                <div className="ark-mbar" /><div className="ark-mbar" /><div className="ark-mbar" /><div className="ark-mbar" />
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="ark-quick-stats">
            <div className="ark-qstat">
              <span className="ark-qstat-value">{fmtDur(totalMins)}</span>
              <span className="ark-qstat-label">今日时长</span>
            </div>
            <div className="ark-qstat">
              <span className="ark-qstat-value">{onlineDevices.length}</span>
              <span className="ark-qstat-label">在线设备</span>
            </div>
            <div className="ark-qstat">
              <span className="ark-qstat-value">{appCount}</span>
              <span className="ark-qstat-label">应用数</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Module Grid */}
        <div className="ark-right">
          {/* Large Overview Card */}
          <button className="ark-module ark-module-large" onClick={() => setActivePanel("overview")}>
            <div className="ark-mod-main">
              <div className="ark-mod-icon-wrap" style={{ color: mainModules[0].accent }}>{mainModules[0].icon}</div>
              <div className="ark-mod-data">
                <span className="ark-mod-primary">{mainModules[0].extra!.primary}</span>
                <span className="ark-mod-secondary">{mainModules[0].extra!.secondary}</span>
              </div>
            </div>
            <div className="ark-mod-text">
              <span className="ark-mod-zh">{mainModules[0].zh}</span>
              <span className="ark-mod-en">{mainModules[0].en}</span>
              <span className="ark-mod-subtitle">{mainModules[0].extra!.sub}</span>
            </div>
          </button>

          {/* Two medium cards */}
          <div className="ark-grid-2">
            {mainModules.slice(1).map((m) => (
              <button key={m.id} className="ark-module ark-module-medium" onClick={() => setActivePanel(m.id)}>
                <div className="ark-mod-icon-wrap" style={{ color: m.accent }}>{m.icon}</div>
                <div className="ark-mod-data">
                  <span className="ark-mod-primary">{m.extra!.primary}</span>
                  <span className="ark-mod-secondary">{m.extra!.secondary}</span>
                </div>
                <div className="ark-mod-text">
                  <span className="ark-mod-zh">{m.zh}</span>
                  <span className="ark-mod-en">{m.en}</span>
                  <span className="ark-mod-subtitle">{m.extra!.sub}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Bottom 4 modules */}
          <div className="ark-grid-4">
            {bottomModules.map((m) => (
              <button key={m.id} className="ark-module ark-module-small" onClick={() => setActivePanel(m.id)}>
                <div className="ark-mod-icon-wrap" style={{ color: m.accent }}>{m.icon}</div>
                <div className="ark-mod-text">
                  <span className="ark-mod-zh">{m.zh}</span>
                  <span className="ark-mod-en">{m.en}</span>
                </div>
                {m.badge && <span className="ark-mod-badge">{m.badge}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM: Activity Banner ═══ */}
      <div className={`ark-bottom${entryPhase >= 3 ? " active" : ""}`}>
        <div className="ark-activity">
          <span className="ark-act-tag">LIVE</span>
          <div className="ark-act-content">
            <span className="ark-act-title">{isOnline ? (active?.app_name || "在线中") : "等待连接"}</span>
            <span className="ark-act-desc">{selectedDate} 记录已更新</span>
          </div>
        </div>
        <div className="ark-act-side">
          <div className="ark-act-item">
            <span className="ark-act-icon"><ClockIcon /></span>
            <div><span className="ark-act-label">今日时长</span><span className="ark-act-value">{fmtDur(totalMins)}</span></div>
          </div>
          <div className="ark-act-item">
            <span className="ark-act-icon"><DeviceIcon /></span>
            <div><span className="ark-act-label">在线设备</span><span className="ark-act-value">{onlineDevices.length}</span></div>
          </div>
        </div>
      </div>

      {/* ═══ SECONDARY PANEL ═══ */}
      {activePanel && (
        <SecondaryPanel
          type={activePanel}
          onClose={() => setActivePanel(null)}
          data={data}
          timeline={timeline}
          selectedDate={selectedDate}
          changeDate={changeDate}
          now={now}
          currentAppsByDevice={currentAppsByDevice}
        />
      )}
    </>
  );
}

export function ArknightsLayout(props: LayoutProps) {
  return <ArknightsLayoutInner {...props} />;
}

registerLayout({
  id: 'arknights',
  name: '明日方舟',
  component: ArknightsLayout,
});
