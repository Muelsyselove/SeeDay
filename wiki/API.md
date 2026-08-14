# SeeDay API 接口文档

本文档描述 SeeDay 后端对外提供的 HTTP API。所有接口均返回 JSON，无需认证（公开接入），并已启用 CORS（`Access-Control-Allow-Origin: *`），可从任意前端 / 脚本 / 服务端直接调用。

Base URL：`http(s)://<你的服务器地址>[:PORT]`（默认端口 `3000`，见 `.env` 中的 `PORT`）

---

## 接口总览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard` | **结构化仪表盘数据（推荐）** — 一次返回前端 UI 展示的全部信息 |
| GET | `/api/current` | 实时状态：设备、正在运行的应用、最近活动、在线人数 |
| GET | `/api/timeline` | 某一天的活动时间线（分段 + 按设备/应用汇总） |
| GET | `/api/daily-summary` | 获取某天的 AI 每日总结 |
| POST | `/api/daily-summary/generate` | 立即生成某天的 AI 每日总结 |
| GET | `/api/daily-summary/debug` | 调试：查看 AI 总结的 Prompt 构造 |
| GET | `/api/health` | 健康检查 |
| POST | `/api/report` | Agent 上报入口（需设备 Token，见 Agent 配置指南） |
| POST | `/api/report/offline` | Agent 离线上报 |

---

## GET /api/dashboard

一次性返回前端仪表盘 UI 所展示的**全部结构化信息**（不含任何 UI），适合第三方集成、数据可视化、自动化脚本等场景。内部复用 `/api/current`、`/api/timeline`、`/api/daily-summary` 的逻辑，保证与页面展示内容一致。

### 请求参数（Query）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | 否 | 查询日期 `YYYY-MM-DD`。缺省时取 `tz` 时区的"今天" |
| `tz` | int | 否 | 时区偏移（分钟），与 JS `getTimezoneOffset()` 同号。如 UTC+8 传 `-480`，默认 `0` |
| `device_id` | string | 否 | 仅返回该设备的时间线与统计；缺省返回全部设备 |

### 请求示例

```bash
# 今天（UTC+8）
curl "https://example.com/api/dashboard?tz=-480"

# 指定日期 + 指定设备
curl "https://example.com/api/dashboard?date=2026-08-14&tz=-480&device_id=my-pc"
```

### 响应结构

```jsonc
{
  // 元信息
  "meta": {
    "api": "dashboard",
    "version": "1.0",
    "date": "2026-08-14",              // 本次查询的日期
    "timezone_offset_minutes": -480,
    "device_filter": null,             // device_id 参数，未传为 null
    "server_time": "2026-08-14T15:22:44.921Z",
    "viewer_count": 3,                 // 当前在线访客数（UI 中"N 人在看"）
    "is_today": true                   // 查询日期是否为今天
  },

  // 全部设备状态（UI 侧边栏设备列表）
  "devices": [
    {
      "device_id": "my-pc",
      "device_name": "My PC",
      "platform": "windows",
      "app_id": "Trae CN.exe",         // 当前前台应用
      "app_name": "Trae CN",
      "display_title": "root [SSH: ...] - TraeCode CN", // 已过隐私过滤的标题
      "last_seen_at": "2026-08-14 23:22:07",
      "is_online": 1,
      "screen_on": 1,
      "is_foreground": 1,
      "extra": {                       // 移动端附加信息
        "battery_percent": 100,
        "battery_charging": true,
        "music": { "title": "...", "artist": "...", "app": "..." }
      }
    }
  ],

  // "此刻在线"面板聚焦的设备（最近活跃的在线设备）
  "active_device": {
    "device_id": "my-pc",
    "device_name": "My PC",
    "platform": "windows",
    "last_seen_at": "2026-08-14 23:22:07",
    "current_app": "Trae CN",
    "display_title": "root [SSH: ...] - TraeCode CN",
    "activity_verb": "操作",           // 动作词：听/看/写/玩/浏览/读/设计/编辑/操作/运行
    "battery": 100,
    "battery_charging": true,
    "music": null                      // 正在听的音乐（无则 null）
  },

  // 各设备正在运行的应用（前台优先排序；UI "正在运行"区域）
  "running_apps_by_device": {
    "my-pc": [
      { "app_name": "Trae CN", "app_id": "Trae CN.exe", "display_title": "...", "is_foreground": true, "last_seen_at": "..." }
    ]
  },

  // 最近活动记录（不含 window_title，隐私安全）
  "recent_activities": [
    { "id": 1, "device_id": "my-pc", "device_name": "My PC", "platform": "windows", "app_id": "...", "app_name": "...", "started_at": "...", "is_foreground": 1 }
  ],

  // 当日时间线（UI 时间轴）
  "timeline": {
    "date": "2026-08-14",
    "segments": [                      // 已合并的活动分段
      {
        "app_name": "Microsoft Edge",
        "app_id": "msedge.exe",
        "display_title": "GitHub",
        "started_at": "2026-08-14 21:30:00", // 设备本地时间
        "ended_at": "2026-08-14 21:45:00",   // null 表示进行中
        "duration_minutes": 15,
        "device_id": "my-pc",
        "device_name": "My PC",
        "is_foreground": true
      }
    ],
    "summary": {                       // 按设备 → 应用 的总分钟数
      "my-pc": { "Microsoft Edge": 113, "Trae CN": 14 }
    }
  },

  // AI 每日总结（未生成时 summary 为 null）
  "daily_summary": { "date": "2026-08-14", "summary": "今天主要在...", "generated_at": "..." },

  // 统计信息（与 UI 图表/汇总一致）
  "stats": {
    "total_screen_minutes": 302,       // 总屏幕时间（重叠区间已合并去重）
    "top_apps": [                      // 按时长降序
      { "app_name": "TRAE SOLO CN", "minutes": 118, "verb": "运行" }
    ],
    "media": {                         // 音乐/视频统计（UI 媒体区）
      "music_total_minutes": 0,
      "video_total_minutes": 62,
      "music_by_app": { "Spotify": 30 },
      "video_by_app": { "哔哩哔哩": 62 },
      "items": [
        { "type": "video", "app_name": "哔哩哔哩", "title": "某个视频", "duration_minutes": 25, "is_playing": false, "first_played_at": "2026-08-14 20:10:00" }
      ]
    }
  }
}
```

### 说明

- **隐私**：所有标题均经过后端隐私分级处理（show/browser/hide），`window_title` 不会出现在任何公开接口中。
- **进行中的活动**：`ended_at` 为 `null` 且 `duration_minutes` 随时间增长。
- **时间格式**：`started_at` / `ended_at` 为设备本地时间字符串（`YYYY-MM-DD HH:MM:SS`）；`server_time` 为 UTC ISO 字符串。
- **调用频率建议**：数据粒度为 Agent 心跳级，建议 10 秒以上轮询一次（与前端一致）。

---

## GET /api/current

实时状态。参数：无。

```bash
curl "https://example.com/api/current"
```

返回：`devices`（设备状态）、`device_app_states`（运行中应用）、`recent_activities`（最近活动）、`server_time`、`viewer_count`。结构同 `/api/dashboard` 对应字段。

## GET /api/timeline

| 参数 | 必填 | 说明 |
|------|------|------|
| `date` | 是 | `YYYY-MM-DD` |
| `tz` | 否 | 时区偏移分钟数（默认 0） |
| `device_id` | 否 | 按设备过滤 |

返回：`{ date, segments[], summary }`，结构同 `/api/dashboard` 的 `timeline` 字段。

## GET /api/daily-summary

| 参数 | 必填 | 说明 |
|------|------|------|
| `date` | 是 | `YYYY-MM-DD` |

返回：`{ date, summary, generated_at }`。

## POST /api/daily-summary/generate

Body：`{ "date": "YYYY-MM-DD" }`（缺省为当天）。需在 `.env` 中配置 `AI_API_URL` / `AI_API_KEY` / `AI_MODEL`。同步生成并返回总结。

## GET /api/health

返回：`{ status, uptime, timestamp }`。

---

## 错误格式

```json
{ "error": "date parameter required (YYYY-MM-DD)" }
```

| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 404 | 路径不存在 |
| 500 | 服务器内部错误 |
