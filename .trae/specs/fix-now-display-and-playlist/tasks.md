# Tasks

- [x] Task 1: 修复多条"现在"显示
  - [x] SubTask 1.1: timeline.ts 将三个 segment push 块中的 isAppCurrentlyRunning 替换为 (isAppCurrentlyRunning && isLastForApp)

- [x] Task 2: 修复前台应用判断
  - [x] SubTask 2.1: report.ts 每次上报时先重置该设备所有应用的 is_foreground 为 0，再设置当前前台应用为 1
  - [x] SubTask 2.2: db.ts 将 upsertDeviceAppState 的 is_foreground 改回 excluded.is_foreground（不再用 MAX）

- [x] Task 3: 添加应用动词映射
  - [x] SubTask 3.1: privacy-tiers.ts 导出动词映射函数 getAppVerb(appName)
  - [x] SubTask 3.2: 前端 page.tsx 在时间线条目中使用动词映射，显示格式"正在{动词}{内容}"

- [x] Task 4: 修复今日歌单逻辑
  - [x] SubTask 4.1: 修改 musicVideoStats 聚合逻辑，按 display_title 合并同名歌曲，累计时长
  - [x] SubTask 4.2: 正在听的歌曲置顶并标注"正在听"
  - [x] SubTask 4.3: 其他歌曲按首次播放时间从早到晚排列
  - [x] SubTask 4.4: 修复歌曲时长计算，对 ended_at=null 的条目使用 now 状态计算实时时长
  - [x] SubTask 4.5: 过滤标题为"桌面歌词"的条目

- [x] Task 5: 屏蔽QQ音乐桌面歌词
  - [x] SubTask 5.1: agent.py 在 get_background_apps 中过滤窗口标题包含"桌面歌词"的条目

- [x] Task 6: 清理输入法数据
  - [x] SubTask 6.1: 删除数据库中 TextInputHost.exe 的记录

- [x] Task 7: 重新构建并部署 Docker
  - [x] SubTask 7.1: docker compose build && docker compose up -d
  - [x] SubTask 7.2: 验证服务正常运行

# Task Dependencies
- Task 1 和 Task 2 可并行执行
- Task 3 和 Task 4 可并行执行
- Task 5 和 Task 6 可并行执行
- Task 7 依赖所有其他任务完成
