# 修复 AI 总结、设备离线判断和后台应用显示 Spec

## Why
AI 总结功能长期无法正常运行，可能是提示词数据过多导致 API 调用失败；设备长时间不换页面时被错误判定为离线；后台运行的应用没有正确显示"现在"作为结束时间。

## What Changes
- 重构 AI 总结提示词构建逻辑，按时段分组（凌晨/早上/上午/中午/下午/傍晚/夜晚/深夜），精简数据量
- 修改系统提示词，要求 AI 像写日记一样完成总结，输出长度扩展到 800 字，取消 max_tokens 上限
- 修复设备离线判断逻辑：检查 agent 心跳上报是否正常，确认 10 分钟离线阈值是否合理
- 修复后台运行应用的 ended_at 判断：在线设备的最后一个后台应用条目也应显示 ended_at=null

## Impact
- Affected code:
  - `packages/backend/src/services/daily-summary-gen.ts` — 提示词构建和系统提示词
  - `packages/backend/src/routes/timeline.ts` — 后台应用 ended_at 判断逻辑
  - `agents/windows/agent.py` — 心跳上报逻辑检查

## ADDED Requirements

### Requirement: 按时段分组的 AI 总结提示词
系统 SHALL 将活动数据按时段分组后提交给 AI，而非按应用名聚合。

时段定义：
- 凌晨 (0:00-5:00)
- 早上 (5:00-8:00)
- 上午 (8:00-11:00)
- 中午 (11:00-13:00)
- 下午 (13:00-17:00)
- 傍晚 (17:00-19:00)
- 夜晚 (19:00-22:00)
- 深夜 (22:00-24:00)

每个时段内按时间顺序列出运行的应用（含 display_title），同一应用允许在不同时段重复出现，也允许在同一时段内重复出现。

#### Scenario: 按时段构建提示词
- **WHEN** 系统为某天生成 AI 总结
- **THEN** 提示词格式为"日期: YYYY-MM-DD"后跟各时段标题和该时段内按时间顺序的应用列表

### Requirement: 日记风格的 AI 总结
系统 SHALL 要求 AI 以日记风格撰写总结，输出长度约 800 字。

#### Scenario: 生成日记风格总结
- **WHEN** AI 生成每日总结
- **THEN** 输出为约 800 字的日记风格文本，不使用 emoji，语气温暖自然

### Requirement: 后台运行应用显示"现在"
在线设备的后台运行应用，如果是该应用的最后一个条目，其 ended_at SHALL 为 null，前端显示"现在"。

#### Scenario: 在线设备后台应用显示现在
- **WHEN** 设备在线且某个后台应用是时间线中该应用的最后一条记录
- **THEN** 该条目的 ended_at 为 null，前端显示"现在"

## MODIFIED Requirements

### Requirement: AI 总结提示词格式
原：按应用名聚合，每个应用显示记录数和前 3 个标题
改：按时段分组，每个时段内按时间顺序列出应用和标题

### Requirement: AI 总结输出长度
原：50-150 字
改：约 800 字，日记风格

### Requirement: 在线设备活动 ended_at 判断
原：仅 isLastActivity（整个设备最后一条活动）且 isDeviceOnline 且 isToday 时 ended_at=null
改：对于在线设备今日的每个应用的最后一条记录，如果该记录之后没有同应用的新记录，ended_at 应为 null

## REMOVED Requirements
（无）

---

## 详细分析

### 问题 1：AI 总结不工作

**根因分析**：当前 `buildUserPrompt` 按应用名聚合数据，每个设备最多显示 8 个应用。如果活动记录很多，提示词可能仍然很长。但更关键的问题是：
1. 系统提示词限制 50-150 字太短，AI 可能无法生成有意义的内容
2. `max_tokens: 800` 已经设置了，但系统提示词说"不要超过150字"，AI 会遵循系统提示词的限制
3. 提示词格式不够直观，AI 难以理解时间顺序

**修复方案**：
1. 重写 `buildUserPrompt`，按时段分组
2. 修改系统提示词，要求日记风格、约 800 字
3. 移除 `max_tokens` 限制（或设为更大值如 2000）
4. 每个时段内列出应用名和 display_title，按时间顺序

### 问题 2：设备被错误判定为离线

**根因分析**：查看 agent.py 的监控循环，心跳逻辑如下：
- 非空闲时：`heartbeat_due = (now - last_report_time) >= heartbeat_interval`，当应用切换或心跳到期时发送报告
- 空闲时：同样检查 `heartbeat_due`，发送 idle 状态
- `heartbeat_seconds` 默认值为 60 秒（第 542 行），而非用户说的 5 秒
- `interval_seconds`（上报间隔）默认值需要检查

关键问题：如果用户长时间不换页面，`changed` 为 False，只有 `heartbeat_due` 时才发送。`heartbeat_seconds` 默认 60 秒，所以每 60 秒发送一次心跳。后端的离线阈值是 10 分钟，60 秒心跳不应该触发离线。

但需要检查：
1. 用户设置的 `heartbeat_seconds` 是否被意外改大
2. 心跳发送是否因网络问题失败
3. 后端 `device_states.last_seen_at` 是否正确更新

**可能的真正原因**：后端 `report.ts` 中 `upsertDeviceState` 只在 `is_foreground === 1` 时更新 `last_seen_at`（需要确认）。如果用户长时间在同一应用，每次心跳都发送相同的前台应用，但 `device_states` 的 `last_seen_at` 可能没有更新。

让我检查 report.ts 的逻辑...

实际上，查看 report.ts 代码，`upsertDeviceState` 对每个应用都会调用，包括前台和后台应用。`last_seen_at` 应该会被更新。

另一个可能：agent 在空闲时发送 `"app_id": "idle"` 的心跳，但后端可能没有正确处理 idle 应用，导致 `device_states` 不更新。

**修复方案**：
1. 确认后端 `upsertDeviceState` 对所有应用（包括 idle）都更新 `last_seen_at`
2. 增加后端离线阈值到 15 分钟（给心跳更多容错空间）
3. 在 agent 端确保心跳间隔不会过长

### 问题 3：后台应用不显示"现在"

**根因分析**：在 `timeline.ts` 中，`isLastActivity` 判断的是 `i === finalActivities.length - 1`，即整个设备的最后一条活动记录。如果最后一条活动是前台应用，那么后台应用的条目不是 `isLastActivity`，其 `endedAt` 会被设为下一条活动的 `started_at`，而不是 null。

**修复方案**：对于在线设备今日的活动，需要判断每个应用（而非仅最后一条活动）是否仍在运行。具体来说：
- 对于在线设备今日的每个应用，如果该应用的最后一条记录之后没有更新的同应用记录，则 ended_at 为 null
- 这需要按应用分组判断，而非仅看全局最后一条
