# 修复时间轴结束时间和实时更新 Spec

## Why
时间轴中大量应用的 ended_at 等于 started_at（duration=0），原因是只有一次心跳的后台应用在 GAP 处理时 ended_at 被截断为 _endTime（等于 started_at）。此外，正在运行的应用需要实时更新显示。

## What Changes
- 后端：对于只有一次心跳且非最后一个的活动，GAP 处理时应将 ended_at 设为 started_at + 1分钟（而非 _endTime），表示该应用至少运行了1分钟
- 后端：对于在线设备正在运行的应用，ended_at 应为 null，前端实时计算 duration
- 前端：正在运行的应用（ended_at 为 null）的 duration 应实时更新，而非使用后端返回的固定值
- 前端：每 10 秒刷新时，正在运行的应用的 duration 应重新计算

## Impact
- Affected code: `packages/backend/src/routes/timeline.ts` — GAP 处理和 ended_at 逻辑
- Affected code: `packages/frontend/app/page.tsx` — 实时 duration 计算

## MODIFIED Requirements

### Requirement: 单次心跳应用的结束时间
对于只有一次心跳记录的应用，系统 SHALL 将其 ended_at 设为 started_at 之后至少 1 分钟，而非等于 started_at。

#### Scenario: 单次心跳后台应用
- **WHEN** 某个应用只有一次心跳记录（_endTime == started_at）
- **AND** 该应用不是最后一个活动
- **AND** 到下一个活动的间隔超过 GAP_THRESHOLD_MS
- **THEN** ended_at 应为 started_at + 1分钟，而非 started_at

### Requirement: 正在运行应用的实时 duration
系统 SHALL 实时计算正在运行应用的 duration，而非使用后端返回的固定值。

#### Scenario: 在线设备正在运行的应用
- **WHEN** 某个应用的 ended_at 为 null（正在运行）
- **THEN** 前端应实时计算 duration（当前时间 - started_at）
- **AND** duration 应在每次数据刷新时更新

#### Scenario: 后端返回的 duration_minutes
- **WHEN** 某个应用的 ended_at 为 null
- **THEN** 后端返回的 duration_minutes 应基于当前时间计算（而非 started_at 到 started_at）
