import { cleanupOldActivities, cleanupOldSummaries, markOfflineDevices } from "../db";
import { generateDailySummary } from "./daily-summary-gen";

setInterval(() => {
  try {
    const result = cleanupOldActivities.run();
    if (result.changes > 0) {
      console.log(`[cleanup] Deleted ${result.changes} old activity records`);
    }
  } catch (e) {
    console.error("[cleanup] Activities cleanup failed:", e);
  }

  try {
    const result = cleanupOldSummaries.run();
    if (result.changes > 0) {
      console.log(`[cleanup] Deleted ${result.changes} old daily summaries`);
    }
  } catch (e) {
    console.error("[cleanup] Summaries cleanup failed:", e);
  }
}, 60 * 60 * 1000);

setInterval(() => {
  try {
    markOfflineDevices.run();
  } catch {
    // silent
  }
}, 60_000);

let lastSummary21Date = "";
let lastSummary0Date = "";

setInterval(() => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (hour === 21 && minute === 0) {
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (today !== lastSummary21Date) {
      lastSummary21Date = today;
      generateDailySummary(false).catch((e) => console.error("[cleanup] AI summary (21:00) failed:", e));
    }
  }

  if (hour === 0 && minute === 0) {
    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    if (yesterdayStr !== lastSummary0Date) {
      lastSummary0Date = yesterdayStr;
      generateDailySummary(true, yesterdayStr).catch((e) => console.error("[cleanup] AI summary (0:00) failed:", e));
    }
  }
}, 60_000);

console.log("[cleanup] Scheduled: hourly cleanup, 60s offline check, 21:00 AI summary (if absent), 0:00 AI summary (force overwrite)");
