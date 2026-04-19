# Tasks

- [x] Task 1: 修复后端 timeline ended_at 计算逻辑
  - [x] 检查后端 timeline.ts 中 ended_at 为 null 的条件：只有当活动是最后一个且是今天时才为 null
  - [x] 确保非最后一个活动的 ended_at 正确设为下一个活动的 started_at
  - [x] 确保 GAP_THRESHOLD_MS 超时后的 ended_at 被正确设置（使用 _endTime 而非 start + 60s）
  - [x] 验证前端 fmtTimeRange 对 null ended_at 的处理（显示"xx:xx – 现在"）
  - [x] 修复 isToday 时区判断（使用 targetDateStart/targetDateEnd 而非 UTC 日期字符串比较）

- [x] Task 2: 将时间轴颜色方案改为柔和色系
  - [x] 修改 page.tsx 中的 PALETTE 常量，使用柔和粉彩色值
  - [x] 新色板包含 12 种柔和色调
  - [x] 应用分组左边框和圆点使用新色板

- [x] Task 3: 在时间轴面板添加媒体内容栏目
  - [x] 在右侧时间轴面板的"此刻"栏之后、应用分组列表之前，添加"今日歌单"和"今日视频"栏目
  - [x] "今日歌单"：从 musicVideoStats.aggregatedMedia 中筛选 type === 'music' 的条目
  - [x] "今日视频"：从 musicVideoStats.aggregatedMedia 中筛选 type === 'video' 的条目
  - [x] 仅在有对应媒体数据时显示
  - [x] 简化左侧面板媒体栏目（保留汇总，移除详细列表）

- [x] Task 4: 添加媒体栏目 CSS 样式
  - [x] 新增 .tl-media-section 样式
  - [x] 新增 .tl-media-title 样式
  - [x] 新增 .tl-media-list 样式
  - [x] 新增 .tl-media-item 样式
  - [x] 适配移动端样式

- [x] Task 5: 重新构建并部署
  - [x] 运行 docker compose up -d --build
  - [x] 验证 ended_at 正确（最后一个活动 + 今天 → null）
  - [x] 验证 isToday 时区判断正确

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 3
- Task 5 depends on Task 2, Task 3, Task 4
