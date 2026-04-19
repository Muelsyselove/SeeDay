# Tasks

- [x] Task 1: 修改空闲状态命名和逻辑
  - [x] SubTask 1.1: agent.py 将 idle 的 app_id 改为 "用户离开"，window_title 改为 "挂机中"
  - [x] SubTask 1.2: app-names.json 添加 "用户离开" 和 "设备运行" 映射
  - [x] SubTask 1.3: agent.py 空闲触发时发送 "用户离开"/"挂机中" 状态
  - [x] SubTask 1.4: agent.py 用户返回时重置 prev_app/prev_title，确保新建条目
  - [x] SubTask 1.5: agent.py 添加全屏检测函数 is_fullscreen()
  - [x] SubTask 1.6: agent.py 添加 is_media_running()，空闲判断排除全屏和音视频应用

- [x] Task 2: 添加隐私模式
  - [x] SubTask 2.1: agent.py 添加 _privacy_mode 全局变量和切换函数
  - [x] SubTask 2.2: agent.py 托盘菜单添加"隐私模式"选项
  - [x] SubTask 2.3: agent.py 隐私模式下只发送 app_id="设备运行", window_title="你猜" + 电量信息
  - [x] SubTask 2.4: app-names.json 添加 "设备运行" 映射

- [x] Task 3: 修复已结束应用显示"现在"
  - [x] SubTask 3.1: timeline.ts 查询 device_app_states 获取当前运行应用列表
  - [x] SubTask 3.2: timeline.ts 只有当前运行中的应用才设 endedAt=null
  - [x] SubTask 3.3: 不在运行列表中的应用使用 _endTime 或 deviceLastSeen 作为 endedAt

- [x] Task 4: 屏蔽输入法进程
  - [x] SubTask 4.1: agent.py 在 _BACKGROUND_APP_BLACKLIST 中添加输入法进程

- [x] Task 5: 重新构建并部署 Docker
  - [x] SubTask 5.1: docker compose build && docker compose up -d
  - [x] SubTask 5.2: 验证服务正常运行

# Task Dependencies
- Task 1 和 Task 2 修改同一文件 agent.py，但不同功能区域，可并行
- Task 3 修改后端，独立于 Task 1/2
- Task 4 可与 Task 1/2 合并执行
- Task 5 依赖所有其他任务完成
