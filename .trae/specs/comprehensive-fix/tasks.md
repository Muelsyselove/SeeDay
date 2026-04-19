# Tasks

- [x] Task 1: 清空旧数据
  - [x] SubTask 1.1: 直接操作 SQLite 数据库删除所有 activities、device_states、device_app_states、daily_summaries 记录
  - [x] SubTask 1.2: 验证数据库表结构完整，新数据可正常写入

- [x] Task 2: 前端媒体栏改为显示实际歌曲/视频标题
  - [x] SubTask 2.1: 修改 page.tsx 左侧面板媒体使用栏，将"音乐软件"/"视频软件"按应用名聚合改为按 display_title 显示具体歌曲/视频列表
  - [x] SubTask 2.2: 复用已有的 musicVideoStats.aggregatedMedia 数据，在左侧面板显示与时间线面板一致的媒体内容
  - [x] SubTask 2.3: 移除旧的按应用名聚合的媒体显示代码

- [x] Task 3: 扩展音视频应用识别列表
  - [x] SubTask 3.1: 在前端 page.tsx 的 MUSIC_APPS 和 VIDEO_APPS 集合中添加更多应用
  - [x] SubTask 3.2: 在后端 privacy-tiers.ts 的 musicApps/videoApps 集合和 tierMap 中添加对应应用
  - [x] SubTask 3.3: 在客户端 agent.py 的 _MUSIC_PROCESS_MAP 和 _VIDEO_PROCESS_MAP 中添加更多应用检测
  - [x] SubTask 3.4: 在 app-names.json 中添加新应用的 exe 名映射

- [x] Task 4: 修复 Windows 客户端开机自启
  - [x] SubTask 4.1: 添加 get_app_dir() 辅助函数，正确获取应用目录（处理 PyInstaller 冻结模式）
  - [x] SubTask 4.2: 修改 load_config() 使用 get_app_dir() 查找 config.json
  - [x] SubTask 4.3: 修改 toggle_startup() 使用正确的 exe 路径注册开机自启
  - [x] SubTask 4.4: 修改 is_startup_enabled() 使用正确的路径比较

- [x] Task 5: 修复 Windows 客户端设置窗口无法关闭
  - [x] SubTask 5.1: 将 validate_server_url() 中的 sys.exit(1) 改为抛出自定义异常 ValidationError
  - [x] SubTask 5.2: 在 load_config() 和 save_config() 中正确捕获验证异常
  - [x] SubTask 5.3: 将 show_settings() 改为使用 Toplevel 窗口，避免多次创建 Tk() 实例

- [x] Task 6: 实现日志按天分割和自动清理
  - [x] SubTask 6.1: 将日志文件名改为 agent_YYYY-MM-DD.log 格式
  - [x] SubTask 6.2: 实现自定义 DailyFileHandler，在日期变更时切换到新日志文件
  - [x] SubTask 6.3: 实现启动时和定期清理超过 2 天的日志文件
  - [x] SubTask 6.4: 更新日志初始化代码

- [x] Task 7: 过滤无窗口后台应用
  - [x] SubTask 7.1: 在客户端 agent.py 添加系统工具黑名单（PowerToys.QuickAccess、Nahimic3 等）
  - [x] SubTask 7.2: 在 get_background_apps() 中添加窗口尺寸过滤（过滤极小窗口）
  - [x] SubTask 7.3: 确保音视频应用即使在后台也不被过滤

- [x] Task 8: 系统审计和修复
  - [x] SubTask 8.1: C1 - 修复时间戳格式混用（统一为本地时间格式 YYYY-MM-DD HH:MM:SS）
  - [x] SubTask 8.2: H1 - 修复跨天 duration_minutes 使用 segmentDurationMinutes
  - [x] SubTask 8.3: H2 - 修复去重时间桶使用 startedAt 而非 Date.now()
  - [x] SubTask 8.4: H5 - 修复清理逻辑基于 started_at 而非 created_at
  - [x] SubTask 8.5: M1 - 前端 now 状态一致性修复
  - [x] SubTask 8.6: M8 - device_states 时间格式统一为本地时间格式
  - [x] SubTask 8.7: L2 - 添加数组长度校验 + is_foreground 分隔符统一为 ;;

# Task Dependencies
- Task 2 和 Task 3 可并行执行
- Task 4、5、6、7 可并行执行（均为 agent.py 修改，但不同功能区域）
- Task 1 应最先执行（清空旧数据）
- Task 8 应在所有其他任务完成后执行（审计需要基于最新代码）
