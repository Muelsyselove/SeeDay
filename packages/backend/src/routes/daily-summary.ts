import { getDailySummary, getTimelineByDate } from "../db";
import { generateDailySummary, buildUserPrompt, SYSTEM_PROMPT } from "../services/daily-summary-gen";

export function handleDailySummary(url: URL): Response {
  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Missing or invalid date param (YYYY-MM-DD)" }, { status: 400 });
  }

  const row = getDailySummary.get(date) as { date: string; summary: string; generated_at: string } | null;

  if (!row) {
    return Response.json({ date, summary: null, generated_at: null });
  }

  return Response.json(row);
}

export async function handleGenerateDailySummary(req: Request): Promise<Response> {
  let date: string | undefined;
  
  try {
    const body = await req.json();
    if (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      date = body.date;
    }
  } catch {}
  
  const targetDate = date || new Date().toISOString().slice(0, 10);
  
  try {
    // Wait for the summary to be generated
    await generateDailySummary(true, targetDate);
    
    // Get the generated summary
    const row = getDailySummary.get(targetDate) as { date: string; summary: string; generated_at: string } | null;
    
    if (row) {
      return Response.json(row);
    } else {
      return Response.json({ error: "Failed to generate summary" }, { status: 500 });
    }
  } catch (e) {
    console.error(`[ai-summary] Generation failed: ${(e as Error).message}`);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}

export function handleDailySummaryDebug(url: URL): Response {
  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Missing or invalid date param (YYYY-MM-DD)" }, { status: 400 });
  }

  const rawRows = getTimelineByDate.all(date) as import("../services/daily-summary-gen").ActivityRow[];
  const HIDDEN_APPS = new Set(["输入法", "文件资源管理器", "任务管理器", "记事本", "系统设置", "搜索", "桌面", "ShellHost"]);
  const rows = rawRows.filter(r => {
    const t = (r.display_title || "").toLowerCase();
    if (t.includes("桌面歌词") || t.includes("desktoplyric") || t === "program manager") return false;
    if (HIDDEN_APPS.has(r.app_name)) return false;
    return true;
  });
  const userPrompt = buildUserPrompt(rows, date);

  return Response.json({
    date,
    model: process.env.AI_MODEL || "deepseek-chat",
    api_url: process.env.AI_API_URL || "https://api.deepseek.com/chat/completions",
    api_key_set: !!process.env.AI_API_KEY,
    system_prompt: SYSTEM_PROMPT,
    user_prompt: userPrompt,
    user_prompt_length: userPrompt.length,
    activity_count: rawRows.length,
    filtered_activity_count: rows.length,
  });
}
