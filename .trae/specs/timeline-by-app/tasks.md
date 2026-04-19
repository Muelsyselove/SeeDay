# Tasks

- [x] Task 1: 重构 tlGroups 数据构建逻辑，将 segments 按应用名称分组
  - [x] 在 page.tsx 的 tlGroups useMemo 中，将按设备分组后的 items 进一步按 app_name 分组
  - [x] 每个应用分组包含：app_name、color、totalDuration、items（该应用的所有时间段条目）
  - [x] 应用分组按 totalDuration 降序排列
  - [x] 每个条目保留 started_at、ended_at、display_title、duration_minutes、is_foreground、isCurrent 等信息

- [x] Task 2: 重构时间轴渲染逻辑，按应用分组展示
  - [x] 将现有的 tl-device-group > tl-list > tl-item 结构改为 tl-device-group > tl-app-group > tl-app-items 结构
  - [x] 每个应用分组标题显示：颜色点 + 应用名 + 总使用时长
  - [x] 每个应用分组内的条目显示：时间段（xx:xx - yy:yy）+ 窗口名（display_title）+ 单次时长
  - [x] 活跃应用的分组添加高亮样式（增加 isToday 守卫，历史日期不显示 Now）
  - [x] 保留设备名称作为顶层分组

- [x] Task 3: 添加按应用分组的 CSS 样式
  - [x] 新增 .tl-app-group 样式：应用分组卡片，带左边框颜色标识
  - [x] 新增 .tl-app-header 样式：应用分组标题行
  - [x] 新增 .tl-app-items 样式：应用分组内条目列表，缩进显示
  - [x] 新增 .tl-app-item 样式：单条运行记录
  - [x] 新增 .tl-app-active 样式：活跃应用分组高亮
  - [x] 适配移动端样式
  - [x] 清理已废弃的旧时间线 CSS 类

- [x] Task 4: 验证功能完整性
  - [x] 确认设备筛选功能正常
  - [x] 确认日期导航功能正常
  - [x] 确认"此刻"栏正常显示
  - [x] 确认空状态正常显示
  - [x] 确认颜色分配一致
  - [x] 修复 isCurrent/Now 徽章在历史日期中不应显示的 Bug
  - [x] 修复 item key 中 app_id 可能不存在的问题

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
