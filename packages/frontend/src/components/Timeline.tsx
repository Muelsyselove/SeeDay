import type { TimelineSegment } from "@/lib/api";
import { getAppDescription } from "@/lib/app-descriptions";

const PALETTE = [
  "#ff6b9d", "#c084fc", "#67e8f9", "#fbbf24", "#6ee7b7",
  "#f97316", "#a78bfa", "#38bdf8", "#e879f9", "#4ade80",
];

function getColor(appName: string, colorMap: Map<string, string>): string {
  const existing = colorMap.get(appName);
  if (existing) return existing;
  const color = PALETTE[colorMap.size % PALETTE.length]!;
  colorMap.set(appName, color);
  return color;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTimeRange(startDateString: string, endDateString: string | null): string {
  const startDate = new Date(startDateString);
  if (isNaN(startDate.getTime())) return "";
  
  const startTime = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
  if (!endDateString) {
    return `${startTime} - 现在`;
  }
  
  const endDate = new Date(endDateString);
  if (isNaN(endDate.getTime())) return startTime;
  
  const endTime = endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${startTime} - ${endTime}`;
}

interface Props {
  segments: TimelineSegment[];
  summary: Record<string, Record<string, number>>;
  currentAppByDevice: Record<string, string>;
}

export default function Timeline({ segments, summary, currentAppByDevice }: Props) {
  const colorMap = new Map<string, string>();

  if (segments.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-2xl opacity-40 mb-3">( ^-ω-^ )</p>
        <p className="text-sm text-[var(--color-text-muted)]">No activity recorded yet</p>
      </div>
    );
  }

  // Group by device
  const byDevice = new Map<string, { name: string; segs: TimelineSegment[] }>();
  for (const seg of segments) {
    let entry = byDevice.get(seg.device_id);
    if (!entry) {
      entry = { name: seg.device_name, segs: [] };
      byDevice.set(seg.device_id, entry);
    }
    entry.segs.push(seg);
  }

  return (
    <div className="space-y-8">
      {Array.from(byDevice.entries()).map(([deviceId, { name, segs }]) => {
        // Sort segments by start time (already sorted by backend, but just in case)
        const sortedSegments = [...segs].sort((a, b) => 
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
        );

        // Merge consecutive same app activities
        const mergedSegments: TimelineSegment[] = [];
        let currentMerge: TimelineSegment | null = null;
        
        for (const seg of sortedSegments) {
          if (!currentMerge) {
            // Start a new merge group
            currentMerge = {
              ...seg
            };
          } else if (
            currentMerge.app_id === seg.app_id &&
            currentMerge.device_id === seg.device_id &&
            currentMerge.is_foreground === seg.is_foreground
          ) {
            // Merge with current group
            currentMerge.duration_minutes += seg.duration_minutes;
            currentMerge.ended_at = seg.ended_at;
            // Update display title to the latest one
            if (seg.display_title) {
              currentMerge.display_title = seg.display_title;
            }
          } else {
            // End current merge group and start a new one
            mergedSegments.push(currentMerge);
            currentMerge = {
              ...seg
            };
          }
        }
        
        // Add the last merge group
        if (currentMerge) {
          mergedSegments.push(currentMerge);
        }

        // Get total duration per app
        const appTotalDuration = new Map<string, number>();
        const deviceSummary = summary[deviceId];
        if (deviceSummary) {
          for (const [app, mins] of Object.entries(deviceSummary)) {
            appTotalDuration.set(app, mins);
          }
        }

        // Get current app
        const currentApp = currentAppByDevice[deviceId];

        return (
          <div key={deviceId}>
            <h3 className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.15em] mb-3">
              {name}
            </h3>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {mergedSegments.map((seg, index) => {
                const color = getColor(seg.app_name, colorMap);
                const isCurrent = currentApp === seg.app_name && index === mergedSegments.length - 1;
                const totalDuration = appTotalDuration.get(seg.app_name) || 0;

                return (
                  <div
                    key={`${seg.started_at}-${seg.device_id}-${seg.app_id}`}
                    className={`timeline-entry glass-sm flex items-center gap-3 px-4 py-2.5 group ${
                      isCurrent ? "timeline-active-glow" : ""
                    }`}
                  >
                    {/* Color accent bar */}
                    <div
                      className="w-1 self-stretch rounded-full flex-shrink-0 transition-opacity group-hover:opacity-100"
                      style={{ backgroundColor: color, opacity: isCurrent ? 1 : 0.5 }}
                    />

                    {/* Time */}
                    <div className="w-32 flex-shrink-0">
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                        {formatTimeRange(seg.started_at, seg.ended_at)}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm truncate block text-[var(--color-text)]">
                          {getAppDescription(seg.app_name, seg.display_title, undefined, seg.is_foreground === 1)}
                        </span>
                        {seg.is_foreground === 1 && (
                          <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                            正在查看
                          </span>
                        )}
                        {seg.is_foreground === 0 && (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                            正在运行
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {formatDuration(seg.duration_minutes)}
                      </span>
                    </div>

                    {/* Total duration */}
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums flex-shrink-0">
                      {formatDuration(totalDuration)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
