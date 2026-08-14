# SeeDay API 接口文档

本文档描述 SeeDay 后端对外提供的 HTTP API。所有接口均返回 JSON，无需认证（公开接入），并已启用 CORS（`Access-Control-Allow-Origin: *`），可从任意前端 / 脚本 / 服务端直接调用。

Base URL：`http(s)://<你的服务器地址>[:PORT]`（默认端口 `3000`，见 `.env` 中的 `PORT`）

---

## 接口总览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard` | **结构化仪表盘数据** — 一次返回前端 UI 展示的全部原始/半加工信息 |
| GET | `/api/dashboard/view` | **渲染级视图数据（推荐第三方使用）** — 返回与前端展示完全一致的加工后数据（中文文案、格式化时间、颜色、分组、徽标），只需 HTML/CSS 即可复刻页面 |
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

## GET /api/dashboard/view

渲染级（视图模型）接口：输出与前端 UI **完全一致、已经过全部业务加工** 的展示数据。前端所做的处理（中文格式化时间、活动描述文案、动词、调色板颜色、设备/应用分组与排序、Top 6 图表、媒体聚合、徽标文案等）均已在服务端完成，第三方服务**只需编写 HTML/CSS 即可呈现与网站相同的信息**。

参数与 `/api/dashboard` 相同：`date`、`tz`、`device_id`。

### 请求示例

```bash
curl "https://example.com/api/dashboard/view?tz=-480"
```

### 响应结构

```jsonc
{
  // 页面级元信息（全部为可直接渲染的文案）
  "meta": {
    "api": "dashboard/view",
    "version": "1.0",
    "date": "2026-08-15",
    "date_display": "8月15日 周六",       // 时间线标题日期
    "prev_date": "2026-08-14",            // 前一天（日期导航）
    "next_date": "2026-08-16",
    "is_today": true,
    "site_title": "Monika Now",
    "greeting": "夜阑人静",               // 按时段问候语
    "refresh_hint": "每 10 秒自动刷新",
    "server_time": "2026-08-14T16:14:50.271Z",
    "server_time_display": "00:14",        // 顶栏时间（已按 tz 转换）
    "timezone_offset_minutes": -480,
    "device_filter": null,
    "viewer_count": 3,
    "viewer_text": "3 人在看"              // 无人时为 null（UI 不显示）
  },

  // 左栏"此刻在线"面板
  "presence": {
    "online": true,
    "status_label": "此刻在线",            // 离线时为 null
    "offline_poem": null,                  // 离线时为 ["月落乌啼","万籁俱寂，设备已入眠"]
    "hero": {                              // 离线时为 null
      "app_text": "正在用 Trae CN",
      "title_text": "写「root [SSH: ...] - TraeCode CN」",
      "description": "正在查看「...」喵~"  // 应用描述文案
    },
    "music": { "label": "正在听的音乐", "title": "歌名", "artist": "歌手", "via_text": "via Spotify" } // 无为 null
  },

  // 顶栏设备按钮
  "devices": [
    {
      "device_id": "my-pc",
      "device_name": "My PC",
      "platform": "windows",
      "is_online": true,
      "status_text": null,                 // 离线时为 "离线"
      "app_text": "Trae CN · xxx (前台)",   // 前台应用 + 标题
      "battery_text": "⚡100%"              // 无电量为 null
    }
  ],

  // 时间线顶部"此刻"置顶栏（仅今天且有在线设备）
  "now_summary": { "label": "此刻", "rows": [{ "device_name": "My PC", "app_text": "Trae CN · xxx (前台)" }] },

  // 今日使用 Top 6 图表（含配色与条宽百分比）
  "usage_chart": {
    "label": "今日使用 Top 6",
    "total_minutes": 315,
    "total_text": "5h15m",
    "max_minutes": 495,
    "bars": [
      { "app_name": "系统设置", "color": "#e8a0b4", "minutes": 495, "duration_text": "8h15m", "percent": 100 }
    ]
  },

  // 媒体区（今日歌单 / 今日视频）
  "media": {
    "visible": true,
    "label": "媒体使用",
    "summary_text": "音乐: 1h30m | 视频: 2h",
    "music": {
      "title": "🎵 今日歌单", "total_text": "1h30m",
      "playing": [{ "badge": "正在听", "title": "歌名", "app_name": "Spotify", "duration_text": "3m", "is_playing": true, "first_played_at": "..." }],
      "items": [{ "badge": null, "title": "歌名", "duration_text": "3m", "is_playing": false, "first_played_at": "..." }]
    },
    "video": null                          // 无视频记录时为 null
  },

  // AI 每日小结卡片
  "ai_summary": {
    "label": "今日小结",
    "text": "今天主要在...",               // 未生成时为 "每晚 21:00 自动生成"
    "time_text": "21:00 · AI 生成",        // 未生成时为 "等待生成..."
    "summary": "今天主要在...",
    "generated_at": "2026-08-15 21:00:00"
  },

  // 时间线（设备 → 应用两级分组，应用按时长降序）
  "timeline": {
    "title": "时间线",
    "date_display": "8月15日 周六",
    "empty": null,                         // 无数据时为 { "poem": "尚无足迹", "sub": "这一天还是一张白纸" }
    "groups": [
      {
        "device_id": "my-pc",
        "device_name": "My PC",
        "app_groups": [
          {
            "app_name": "系统设置",
            "color": "#e8a0b4",            // 与站点一致的调色板配色
            "verb": "操作",                 // 动作词（听/看/写/玩/浏览…）
            "description": "正在调系统设置喵~",
            "total_duration_text": "8h15m",
            "total_duration_minutes": 495,
            "is_current": true,
            "now_badge": "Now",            // 非当前为 null
            "items": [
              {
                "time_range_text": "00:00 – 现在",   // 进行中自动显示"现在"
                "started_at": "2026-08-15 00:00:00",
                "ended_at": null,
                "title_text": "浏览GitHub",         // = 动词 + 标题；无标题为 "-"
                "activity_description": "正在用Edge看「GitHub」喵~",
                "duration_minutes": 25,
                "duration_text": "25m"
              }
            ]
          }
        ]
      }
    ]
  },

  // 全局应用 → 颜色映射（自定义样式时可用）
  "app_colors": { "系统设置": "#e8a0b4", "Microsoft Edge": "#a0c4a8" }
}
```

### 与 `/api/dashboard` 的区别

| | `/api/dashboard` | `/api/dashboard/view` |
|---|---|---|
| 数据形态 | 结构化原始/半加工数据 | 前端渲染用的最终视图数据 |
| 时间 | 原始时间字符串 | 额外提供 `HH:MM`、`8月15日 周六`、`21:30 – 现在`、`2h30m` 等展示文本 |
| 文案 | 无 | 问候语、活动描述（"正在用Edge看「…」喵~"）、动词、徽标（Now/正在听/前台/离线） |
| 颜色/布局 | 无 | 应用配色、图表条宽百分比、设备→应用分组与排序 |
| 适用场景 | 数据分析、二次加工 | **直接重写 HTML/CSS 复刻站点信息** |

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
