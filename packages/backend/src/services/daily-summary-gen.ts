import { getTimelineByDate, upsertDailySummary, getDailySummary } from "../db";
import { spawn } from "bun";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const AI_API_URL = process.env.AI_API_URL || "https://api.deepseek.com/chat/completions";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "deepseek-chat";

export const SYSTEM_PROMPT = `你是一个温暖的日记助手。根据用户今天在各设备上的应用使用记录，写一段约300字的中文日记。

要求：
- 像写日记一样，按时间顺序叙述这一天
- 语气温暖、自然，像朋友在记录生活
- 提及具体的应用和内容，让日记有画面感
- 可以适当加入感受和想象，但基于真实数据
- 不要使用 emoji
- 不要列清单，要写成连贯的段落
- 字数约300字`;

export interface ActivityRow {
  device_name: string;
  app_name: string;
  display_title: string;
  started_at: string;
}

function todayStr() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

const TIME_PERIODS = [
  { name: "凌晨", start: 0, end: 5 },
  { name: "早上", start: 5, end: 8 },
  { name: "上午", start: 8, end: 11 },
  { name: "中午", start: 11, end: 13 },
  { name: "下午", start: 13, end: 17 },
  { name: "傍晚", start: 17, end: 19 },
  { name: "夜晚", start: 19, end: 22 },
  { name: "深夜", start: 22, end: 24 },
];

function getPeriodName(hour: number): string {
  for (const p of TIME_PERIODS) {
    if (hour >= p.start && hour < p.end) return p.name;
  }
  return "深夜";
}

export function buildUserPrompt(rows: ActivityRow[], date?: string): string {
  const byDevice = new Map<string, ActivityRow[]>();
  for (const r of rows) {
    let dev = byDevice.get(r.device_name);
    if (!dev) { dev = []; byDevice.set(r.device_name, dev); }
    dev.push(r);
  }

  const lines: string[] = [`日期: ${date || todayStr()}`];
  for (const [dev, activities] of byDevice) {
    lines.push(`\n[${dev}]`);
    const sorted = [...activities].sort((a, b) => a.started_at.localeCompare(b.started_at));

    const byPeriod = new Map<string, Map<string, { startTime: string; count: number; titles: string[] }>>();
    for (const a of sorted) {
      const hour = parseInt(a.started_at.slice(11, 13), 10);
      const period = getPeriodName(hour);
      if (!byPeriod.has(period)) byPeriod.set(period, new Map());
      const periodMap = byPeriod.get(period)!;
      const key = a.app_name;
      if (!periodMap.has(key)) {
        periodMap.set(key, { startTime: a.started_at.slice(11, 16), count: 1, titles: [] });
      } else {
        periodMap.get(key)!.count++;
      }
      if (a.display_title && a.display_title.length <= 40) {
        const existing = periodMap.get(key)!;
        if (existing.titles.length < 5 && !existing.titles.includes(a.display_title)) {
          existing.titles.push(a.display_title);
        }
      }
    }

    for (const p of TIME_PERIODS) {
      const periodMap = byPeriod.get(p.name);
      if (!periodMap || periodMap.size === 0) continue;
      lines.push(`${p.name}:`);
      for (const [appName, info] of periodMap) {
        const countStr = info.count > 1 ? ` x${info.count}` : "";
        const titlesStr = info.titles.length > 0 ? ` - ${info.titles.join(", ")}` : "";
        lines.push(`  ${info.startTime} ${appName}${countStr}${titlesStr}`);
      }
    }
  }
  return lines.join("\n");
}

async function wgetRequest(url: string, options: { method: string; headers: Record<string, string>; body: string }, timeoutSecs: number): Promise<{ status: number; body: string }> {
  const tmpDir = mkdtempSync(join(tmpdir(), "ai-req-"));
  const bodyFile = join(tmpDir, "body.json");
  const outFile = join(tmpDir, "out.json");

  try {
    writeFileSync(bodyFile, options.body);

    const cmd = ["wget", "-q", "-O", outFile, `--timeout=${timeoutSecs}`];
    for (const [k, v] of Object.entries(options.headers)) {
      cmd.push("--header", `${k}: ${v}`);
    }
    cmd.push(`--post-file=${bodyFile}`, url);

    const proc = spawn({ cmd, stdout: "pipe", stderr: "pipe" });

    const exitCode = await proc.exited;
    let responseBody = "";
    try {
      const f = Bun.file(outFile);
      responseBody = await f.text();
    } catch {}

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      const httpStatusMatch = stderr.match(/HTTP.*?(\d{3})/);
      const status = httpStatusMatch ? parseInt(httpStatusMatch[1]) : 0;
      if (status === 200) {
        return { status: 200, body: responseBody };
      }
      return { status, body: responseBody || stderr };
    }

    return { status: 200, body: responseBody };
  } finally {
    try { unlinkSync(bodyFile); } catch {}
    try { unlinkSync(outFile); } catch {}
    try { unlinkSync(tmpDir); } catch {}
  }
}

export async function generateDailySummary(force: boolean = false, targetDate?: string): Promise<void> {
  console.log(`[ai-summary] generateDailySummary called, force=${force}, targetDate=${targetDate}`);

  if (!AI_API_KEY) {
    console.log("[ai-summary] AI_API_KEY not set, skipping");
    return;
  }

  const date = targetDate || todayStr();
  console.log(`[ai-summary] Processing date: ${date}`);

  if (!force) {
    const existing = getDailySummary.get(date) as { summary: string } | undefined;
    if (existing) {
      console.log(`[ai-summary] Summary for ${date} already exists, skipping`);
      return;
    }
  }

  const rawRows = getTimelineByDate.all(date) as ActivityRow[];
  const HIDDEN_APPS = new Set(["输入法", "文件资源管理器", "任务管理器", "记事本", "系统设置", "搜索", "桌面", "ShellHost"]);
  const rows = rawRows.filter(r => {
    const t = (r.display_title || "").toLowerCase();
    if (t.includes("桌面歌词") || t.includes("desktoplyric") || t === "program manager") return false;
    if (HIDDEN_APPS.has(r.app_name)) return false;
    return true;
  });
  console.log(`[ai-summary] Found ${rawRows.length} activity rows for ${date}, ${rows.length} after filtering`);

  if (rows.length === 0) {
    console.log(`[ai-summary] No activity data for ${date}, skipping`);
    return;
  }

  const userPrompt = buildUserPrompt(rows, date);
  console.log(`[ai-summary] Built prompt with ${userPrompt.length} chars`);

  try {
    const requestBody = JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 1.3,
      stream: false,
    });

    console.log(`[ai-summary] Calling wgetRequest to ${AI_API_URL}`);

    const res = await wgetRequest(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_API_KEY}`,
      },
      body: requestBody,
    }, 90);

    console.log(`[ai-summary] Response status: ${res.status}`);

    if (res.status !== 200) {
      console.error(`[ai-summary] API returned ${res.status}: ${res.body.slice(0, 200)}`);
      return;
    }

    const data = JSON.parse(res.body);
    const summary = data?.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      console.error("[ai-summary] Empty response from AI");
      console.error(`[ai-summary] Response: ${JSON.stringify(data).slice(0, 200)}`);
      return;
    }

    upsertDailySummary.run(date, summary);
    console.log(`[ai-summary] Generated summary for ${date}: ${summary.slice(0, 60)}...`);
  } catch (e: any) {
    console.error(`[ai-summary] Failed to generate: ${e.message}`);
    console.error(`[ai-summary] Stack: ${e.stack?.slice(0, 200)}`);
  }
}
