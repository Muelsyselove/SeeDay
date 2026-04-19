# 修复"现在"显示、歌单逻辑和前台判断 Spec

## Why
时间线中多个已结束的条目错误显示"现在"；前台应用判断错误（QQ 音乐占据了前台，但实际前台是 Trae）；标题显示应使用不同动词（听音乐、看视频、写代码等）；今日歌单缺少"正在听"标注、时长计算错误、同名歌曲未合并；QQ音乐桌面歌词需要屏蔽；输入法数据需要清理。

## What Changes
- 修复 timeline.ts 中 `isAppCurrentlyRunning` 在跨天段中的使用，只有 `isLastForApp` 为 true 时才设 ended_at=null
- 修复前台应用判断：确保只有 `is_foreground=1` 的应用被标记为前台
- 添加应用动词映射：不同类型应用使用不同动词（听、看、写、玩、读、运行等）
- 修改前端今日歌单：正在听的歌曲置顶标注、按时间排序、合并同名歌曲、修复时长计算
- 屏蔽 QQ 音乐桌面歌词子进程
- 清理输入法数据

## Impact
- Affected code:
  - `packages/backend/src/routes/timeline.ts` — ended_at 判断逻辑
  - `packages/backend/src/services/privacy-tiers.ts` — 添加动词映射
  - `packages/frontend/app/page.tsx` — 歌单显示逻辑、动词显示
  - `agents/windows/agent.py` — QQ 音乐桌面歌词屏蔽
  - 数据库 — 清理输入法记录

## ADDED Requirements

### Requirement: 只有最后一条记录显示"现在"
对于当前运行中的应用，只有该应用的最后一条时间线条目 SHALL 显示 ended_at=null（"现在"），之前的条目 SHALL 有正确的结束时间。

#### Scenario: 多条记录只有最后一条显示现在
- **WHEN** Trae CN 有 4 条时间线记录（23:35, 00:17, 01:03, 01:30），且 Trae CN 正在运行
- **THEN** 只有 01:30 的条目 ended_at=null，其他条目有正确的结束时间

### Requirement: 应用动词显示
不同类型的应用 SHALL 使用不同的动词来描述用户的活动。前端时间线条目标题格式为"正在{动词}{内容}"。

动词映射：
- 音乐应用 → "听"（如：正在听 晴天 - 周杰伦）
- 视频应用 → "看"（如：正在看 某某视频）
- IDE/编辑器 → "写"（如：正在写 page.tsx）
- 游戏 → "玩"（如：正在玩 原神）
- 浏览器 → "浏览"（如：正在浏览 Google）
- 阅读应用 → "读"（如：正在读 三体）
- 设计工具 → "设计"（如：正在设计 首页）
- 办公软件 → "编辑"（如：正在编辑 报告.docx）
- 终端/SSH → "操作"（如：正在操作 SSH: doinday.top）
- 未分类应用 → "运行"（如：正在运行 文件管理器）

#### Scenario: 音乐应用显示听
- **WHEN** 用户正在使用 QQ 音乐播放"晴天"
- **THEN** 显示"正在听 晴天 - 周杰伦"，而非"正在用QQ音乐写 晴天"

#### Scenario: IDE 显示写
- **WHEN** 用户正在 VS Code 编辑 page.tsx
- **THEN** 显示"正在写 page.tsx"

### Requirement: 正在听的歌曲置顶标注
今日歌单中正在播放的歌曲 SHALL 置顶并标注"正在听"。

#### Scenario: 正在听的歌曲置顶
- **WHEN** 用户正在听"晴天"，之前听过"七里香"和"稻香"
- **THEN** "晴天"显示在歌单最顶部，带"正在听"标注，其他歌曲按首次播放时间从早到晚排列

### Requirement: 同名歌曲合并
今日歌单中同一首歌的多次播放 SHALL 合并为一个条目，时长累计。

#### Scenario: 同一首歌多次播放
- **WHEN** 用户上午听了"晴天"10分钟，下午又听了"晴天"15分钟
- **THEN** 歌单中只有一个"晴天"条目，时长25分钟；如果正在播放则置顶

### Requirement: 歌曲时长正确计算
今日歌单中每首歌的时长 SHALL 基于该歌曲播放期间的时间线条目的实际时长累计。

#### Scenario: 歌曲时长计算
- **WHEN** 一首歌在 10:00-10:03 播放（3分钟）
- **THEN** 该歌曲时长显示为 3m，而非 <1m

## MODIFIED Requirements

### Requirement: 歌单排序
原：按时长降序排列
改：正在听的歌曲置顶，其他歌曲按首次播放时间从早到晚排列

### Requirement: 前台应用判断
原：基于 device_app_states 的 is_foreground 字段
改：确保只有 is_foreground=1 的应用被标记为前台，is_foreground=0 的应用为后台

## REMOVED Requirements
（无）

---

## 详细分析

### 问题 1：多条"现在"的根因

在 timeline.ts 的三个 segment push 块中，`isAppCurrentlyRunning` 没有与 `isLastForApp` 组合使用。所有该应用的条目都会被标记为"现在"。

**修复**：将所有 `isAppCurrentlyRunning` 替换为 `isAppCurrentlyRunning && isLastForApp`。

### 问题 2：前台应用判断错误

QQ 音乐被标记为前台应用，但实际前台是 Trae。这可能是因为 `upsertDeviceAppState` 使用 `MAX(excluded.is_foreground, device_app_states.is_foreground)` 导致 is_foreground 永远不会被重置为 0。

**修复**：在 report.ts 中，每次上报时先重置该设备所有应用的 is_foreground 为 0，然后只将当前前台应用设为 1。

### 问题 3：应用动词

需要在 privacy-tiers.ts 中添加动词映射，并在前端使用。映射关系：
- musicApps → "听"
- videoApps → "看"
- gamingApps → "玩"
- ideApps → "写"
- browserApps → "浏览"
- readingApps → "读"
- designApps → "设计"
- officeApps → "编辑"
- devTools → "操作"
- 其他 → "运行"

### 问题 4：歌曲时长 <1m

前端 `musicVideoStats` 使用 `item.duration_minutes` 累计时长。但 timeline segment 的 duration_minutes 对于短 segment 可能是 0 或 1。需要检查后端 segment 的 duration 计算。

实际上，问题可能在于 `item.duration_minutes` 在前端被重新计算时，对于 ended_at=null 的条目使用了 `now - startMs`，但 `musicVideoStats` 的 useMemo 中直接使用了 segment 的 `duration_minutes` 字段。如果后端返回的 duration_minutes 不正确，前端就会显示错误。

需要确保前端在计算歌单时长时，对于 ended_at=null 的条目使用 `now` 状态计算实时时长。
