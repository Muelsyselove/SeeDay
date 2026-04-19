* [x] 后端查询设备在线状态（last\_seen\_at、is\_online）

* [x] 离线超过 10 分钟的设备，所有 segments 的 ended\_at 有具体值

* [x] 在线设备的正在运行程序 ended\_at 为 null，前端显示"现在"

* [x] 单次心跳应用的 ended\_at 不等于 started\_at（至少 +1 分钟）

* [x] 正在运行应用的 duration\_minutes 基于当前时间计算

* [x] 前端实时更新正在运行应用的 duration（每 30 秒刷新）

* [x] 活跃程序背景色使用柔和绿色调（sage），与界面协调

* [x] 活跃程序左边框颜色使用 sage

* [x] Now 标签颜色使用 sage

* [x] 夜间模式下活跃状态颜色协调

* [x] Docker 重新构建部署后所有功能正常

