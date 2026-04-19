# Tasks

- [ ] Task 1: 重构 AI 总结提示词构建逻辑
  - [ ] SubTask 1.1: 重写 buildUserPrompt 函数，按时段分组（凌晨/早上/上午/中午/下午/傍晚/夜晚/深夜）
  - [ ] SubTask 1.2: 每个时段内按时间顺序列出应用名和 display_title
  - [ ] SubTask 1.3: 同一应用允许在不同时段重复出现，也允许在同一时段内重复出现

- [ ] Task 2: 修改 AI 总结系统提示词和参数
  - [ ] SubTask 2.1: 修改 SYSTEM_PROMPT，要求日记风格、约 800 字、语气温暖自然
  - [ ] SubTask 2.2: 移除 max_tokens 限制或设为 2000
  - [ ] SubTask 2.3: 调整 temperature 为 0.8 以增加创意性

- [ ] Task 3: 修复后台运行应用 ended_at 判断
  - [ ] SubTask 3.1: 修改 timeline.ts 中 ended_at 判断逻辑，对在线设备今日的每个应用的最后一条记录设 ended_at=null
  - [ ] SubTask 3.2: 确保前端正确显示后台应用的"现在"标签

- [ ] Task 4: 修复设备离线判断问题
  - [ ] SubTask 4.1: 检查 report.ts 中 upsertDeviceState 是否对所有应用（含 idle）都更新 last_seen_at
  - [ ] SubTask 4.2: 增加后端离线阈值到 15 分钟
  - [ ] SubTask 4.3: 检查 agent.py 心跳逻辑确保心跳正常发送

- [ ] Task 5: 重新构建并部署 Docker
  - [ ] SubTask 5.1: docker compose build && docker compose up -d
  - [ ] SubTask 5.2: 验证服务正常运行

# Task Dependencies
- Task 1 和 Task 2 可并行执行
- Task 3 和 Task 4 可并行执行
- Task 5 依赖所有其他任务完成
