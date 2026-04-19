# 修复空闲状态、隐私模式和结束时间 Spec

## Why
空闲状态显示名称不直观且未正确结束其他应用、缺少隐私模式、已结束应用错误显示"现在"、输入法进程无需记录。

## What Changes
- 将 idle 应用重命名为"用户离开"，窗口标题改为"挂机中"
- 空闲触发时结束其他应用的时间条目（不沿用旧条目，新建条目）
- 空闲判断排除全屏应用和音视频应用运行状态
- Agent 添加隐私模式（右键托盘启动），只提交设备在线和电量信息
- 隐私模式下时间轴显示"设备运行"/"你猜"
- 修复已结束应用错误显示"现在"的问题
- 屏蔽输入法进程

## Impact
- Affected code:
  - `agents/windows/agent.py` — 空闲逻辑、隐私模式、输入法屏蔽
  - `packages/backend/src/data/app-names.json` — idle → 用户离开
  - `packages/backend/src/services/privacy-tiers.ts` — 隐私模式应用处理
  - `packages/backend/src/routes/timeline.ts` — 已结束应用 ended_at 修复
  - `packages/backend/src/routes/report.ts` — 隐私模式数据处理

## ADDED Requirements

### Requirement: 空闲状态命名和显示
空闲状态 SHALL 显示为应用名"用户离开"，窗口标题"挂机中"。

#### Scenario: 空闲状态显示
- **WHEN** 用户长时间未操作设备触发空闲
- **THEN** 时间轴显示应用名"用户离开"，条目标题为"挂机中"

### Requirement: 空闲触发时结束其他应用
当空闲状态触发时，所有其他正在运行的应用 SHALL 被判定为运行结束。用户返回后，应用的新活动 SHALL 创建新的时间条目，而非沿用旧条目。

#### Scenario: 空闲触发结束应用
- **WHEN** 用户进入空闲状态
- **THEN** 之前运行的所有应用（音视频除外）的当前时间条目结束

#### Scenario: 用户返回后新建条目
- **WHEN** 用户从空闲状态返回并继续使用某应用
- **THEN** 该应用创建新的时间条目，起始时间为返回时间

### Requirement: 空闲判断排除全屏和音视频
空闲判断 SHALL 排除全屏应用运行状态和音视频应用运行状态。当用户正在使用全屏应用或音视频应用时，即使没有键鼠输入，也不应触发空闲。

#### Scenario: 全屏应用不触发空闲
- **WHEN** 用户正在使用全屏应用且没有键鼠输入
- **THEN** 不触发空闲状态，继续正常上报应用信息

#### Scenario: 音视频应用不触发空闲
- **WHEN** 用户正在使用音视频应用且没有键鼠输入
- **THEN** 不触发空闲状态，继续正常上报应用信息

### Requirement: 隐私模式
Agent SHALL 提供隐私模式，通过右键托盘菜单切换。隐私模式下只提交设备在线信息和笔记本电量信息，不提交正在运行的应用信息。时间轴中显示为应用名"设备运行"，条目标题"你猜"。

#### Scenario: 启用隐私模式
- **WHEN** 用户通过托盘菜单启用隐私模式
- **THEN** Agent 只向服务器提交设备在线和电量信息，时间轴显示"设备运行"/"你猜"

#### Scenario: 关闭隐私模式
- **WHEN** 用户通过托盘菜单关闭隐私模式
- **THEN** Agent 恢复正常上报，时间轴正常显示应用信息

### Requirement: 屏蔽输入法进程
输入法进程 SHALL 被屏蔽，不上报其窗口信息。

#### Scenario: 输入法进程不上报
- **WHEN** 搜狗输入法、微软输入法等输入法进程存在窗口
- **THEN** 不上报该应用信息

## MODIFIED Requirements

### Requirement: 已结束应用的 ended_at
已结束的应用 SHALL 正确显示结束时间，而非"现在"。只有当前确实仍在运行的应用才显示"现在"。

#### Scenario: 已结束应用显示正确结束时间
- **WHEN** 某应用已不再运行（设备仍在线，但该应用不在当前运行列表中）
- **THEN** 该应用的 ended_at 显示具体的结束时间，而非"现在"

## REMOVED Requirements
（无）

---

## 详细分析

### 问题 1：空闲状态

**当前行为**：agent 在用户空闲时发送 `app_id: "idle"`, `window_title: "User is away"`。后端 `resolveAppName("idle")` 返回 "idle"（因为 app-names.json 中没有 idle 的映射）。

**需要修改**：
1. agent.py：将 `app_id` 从 `"idle"` 改为 `"用户离开"`，`window_title` 从 `"User is away"` 改为 `"挂机中"`
2. app-names.json：添加 `"用户离开.exe": "用户离开"` 映射（虽然 app_id 不是 .exe，但 resolveAppName 会原样返回"用户离开"）
3. agent.py：空闲触发时，先发送一次所有应用的最终状态（标记结束），再发送空闲状态
4. agent.py：用户返回时，重置 `prev_app` 和 `prev_title`，确保新活动创建新条目
5. agent.py：添加全屏检测和音视频检测，排除这些情况下的空闲判断

### 问题 2：隐私模式

**实现方案**：
1. agent.py：添加全局变量 `_privacy_mode = False`
2. agent.py：在托盘菜单添加"隐私模式"选项（可切换）
3. agent.py：隐私模式下，上报时只发送 `app_id: "设备运行"`, `window_title: "你猜"`，附带电量和设备在线信息
4. app-names.json：添加 `"设备运行.exe": "设备运行"` 映射

### 问题 3：已结束应用显示"现在"

**根因分析**：上一轮修改中，`isLastForApp` 逻辑对在线设备今日的每个应用的最后一条记录都设 `endedAt = null`。但这导致一个问题：如果某个应用已经不再运行（比如 2 小时前关闭了），但它是该应用在 `finalActivities` 中的最后一条记录，且设备仍在线且是今天，那么它的 `endedAt` 也会被设为 null。

**正确逻辑**：只有当前确实仍在运行的应用才应该 `endedAt = null`。需要结合 `device_app_states` 表来判断哪些应用仍在运行。

**修复方案**：在 timeline.ts 中查询 `device_app_states`，获取每个设备当前正在运行的应用列表。只有在该列表中的应用，其最后一条记录才设 `endedAt = null`。

### 问题 4：输入法进程

**常见输入法进程**：
- `sogoucloud.exe`（搜狗输入法云服务）
- `sogoupy.ime` / `sogoupy.exe`（搜狗拼音）
- `mspy.exe`（微软拼音旧版）
- `inputmethodhost.exe`（输入法宿主）
- `imetool.exe`（输入法工具）
- `chsunime.exe`（华宇拼音）
- `pfutime.exe`（万能五笔）

将这些添加到 `_BACKGROUND_APP_BLACKLIST`。
