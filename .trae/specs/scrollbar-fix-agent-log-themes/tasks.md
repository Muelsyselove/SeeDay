# Tasks

- [x] Task 1: 回退双栏滚动条并重新设计
  - [x] 确认当前`.tl-scroll`和`.panel-left`的滚动条样式已恢复为3px轻量样式
  - [x] 确认展开区域`.tl-app-items-wrapper`的scrollable延迟机制正常工作
  - [x] 验证双栏模式下展开不超过5条时无滚动条，超过5条时动画完成后平滑出现滚动条
  - [x] 确保单栏模式（≤768px）滚动条隐藏不受影响

- [x] Task 2: 修复Agent日志路径
  - [x] 将`_LOG_DIR = Path(".").resolve()`改为`_LOG_DIR = get_app_dir()`

- [x] Task 3: 建立主题系统文件结构
  - [x] 创建`packages/frontend/themes/`目录
  - [x] 创建`packages/frontend/themes/mapping.json`
  - [x] 将CSS变量提取到`packages/frontend/themes/huaxin/theme.css`
  - [x] 在`:root`中保留变量声明并引用主题文件覆盖

- [x] Task 4: 前端主题加载逻辑
  - [x] 创建useTheme hook
  - [x] 主题选择持久化到localStorage
  - [x] 动态切换主题CSS变量

- [x] Task 5: 主题切换UI
  - [x] 添加主题切换按钮（🎨）
  - [x] 显示主题选择面板，展示中英文名称
  - [x] 切换时添加CSS transition动画

- [x] Task 6: 编写主题编写指南
  - [x] 创建`packages/frontend/themes/GUIDE.md`

- [x] Task 7: 系统适配与验证
  - [x] 网站正常访问（HTTP 200）
  - [x] 主题CSS变量正确加载
  - [x] Agent日志路径修复

# Task Dependencies
- Task 1 独立
- Task 2 独立
- Task 3 → Task 4 → Task 5
- Task 6 依赖 Task 3
- Task 7 依赖 Task 3-6
