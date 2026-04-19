# Tasks

- [x] Task 1: AI总结字数限制改为300字
  - [x] 修改SYSTEM_PROMPT中"约800字"为"约300字"
  - [x] 修改max_tokens从2000降为800

- [x] Task 2: 修复generated_at时区问题
  - [x] 修改db.ts中upsertDailySummary，将`datetime('now')`改为`datetime('now', '+8 hours')`
  - [x] 修改daily_summaries建表语句中DEFAULT值

- [x] Task 3: 折叠展开逻辑优化（桌面端5条限制+滚动，手机端全展开）
  - [x] globals.css: 添加.tl-app-items-wrapper.expanded桌面端max-height:180px和overflow-y:auto
  - [x] globals.css: 添加expanded > *的overflow:visible
  - [x] globals.css: 添加滚动条样式
  - [x] globals.css: 添加.media-apps-list桌面端max-height和overflow
  - [x] globals.css: 手机端媒体查询中覆盖为max-height:none和overflow-y:visible

# Task Dependencies
- Task 2 独立
- Task 1 独立
- Task 3 依赖CSS修改
