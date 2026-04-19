# Tasks

- [x] Task 1: 后端添加设备在线状态查询
  - [x] 在 timeline.ts 中查询 device_states 表获取每个设备的 last_seen_at 和 is_online 状态
  - [x] 判断设备是否离线超过 10 分钟：`now - last_seen_at > 10min` 则视为离线

- [x] Task 2: 后端修复 ended_at 逻辑（设备在线状态）
  - [x] 对于离线超过 10 分钟的设备，所有 segments 的 ended_at 都应有值
  - [x] 对于在线设备，正在运行的程序 ended_at 为 null

- [x] Task 3: 前端活跃状态背景色调整
  - [x] 将 .tl-app-active 的背景色从 --sakura-bg 改为 --sage-bg
  - [x] 将 .tl-app-active 的左边框颜色从 --sakura 改为 --sage
  - [x] 将 .tl-app-now 的颜色从 --sakura 改为 --sage

- [x] Task 4: 后端修复单次心跳应用的 ended_at
  - [x] GAP 处理时，如果 _endTime 等于 startMs（单次心跳），将 ended_at 设为 startMs + 60000
  - [x] 对于最后一个活动且设备离线的情况，如果 _endTime 等于 startMs，使用 deviceLastSeen 或 startMs + 60000
  - [x] 修复 startMs 变量在 endedAt 逻辑之前未定义的 bug
  - [x] 添加 endMs <= startMs 时的兜底逻辑（设为 startMs + 60000）

- [x] Task 5: 后端修复正在运行应用的 duration_minutes
  - [x] 当 ended_at 为 null 时，duration_minutes 基于 Date.now() 计算
  - [x] 三个 segment push 分支均已修复

- [x] Task 6: 前端实时更新正在运行应用的 duration
  - [x] 添加 now 状态，每 30 秒更新
  - [x] appGroups 构建中对 ended_at === null 的条目实时计算 duration
  - [x] 渲染中对运行中条目实时计算 duration
  - [x] 将 now 加入 tlGroups useMemo 依赖数组

- [x] Task 7: 重新构建并部署
  - [x] 运行 docker compose up -d --build
  - [x] 验证单次心跳应用的 ended_at 不再等于 started_at（0 个 same start/end）
  - [x] 验证正在运行应用的 duration 实时更新
  - [x] 验证已结束应用的 ended_at 正确

# Task Dependencies
- Task 4 depends on Task 1, Task 2
- Task 5 depends on Task 4
- Task 6 depends on Task 5
- Task 7 depends on Task 4, Task 5, Task 6
