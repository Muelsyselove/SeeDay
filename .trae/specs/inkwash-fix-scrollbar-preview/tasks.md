# Tasks

- [x] Task 1: 修复水墨主题左侧栏滚动条未生效
  - [x] SubTask 1.1: 检查 `.ink-panel-left` 的 CSS 选择器是否被 `[data-theme="inkwash"]` 作用域正确限定
  - [x] SubTask 1.2: 确保 `.ink-panel-left` 有 `overflow-y: auto`、`min-height: 0`、自定义滚动条样式
  - [x] SubTask 1.3: 验证双栏模式下左侧栏内容溢出时可滚动

- [x] Task 2: 修复水墨主题视频媒体未显示
  - [x] SubTask 2.1: 在 InkLayout.tsx 的媒体栏 JSX 中补充视频分组渲染（与音乐分组对称）
  - [x] SubTask 2.2: 验证有视频使用记录时"影画"分组正确显示

- [x] Task 3: 修复水墨主题今日统计区被媒体栏遮挡
  - [x] SubTask 3.1: 检查 `.ink-panel-left` 的 flex 布局是否导致子元素溢出重叠
  - [x] SubTask 3.2: 确保各 section 有正确的 `flex-shrink: 0` 或 `min-height` 防止压缩
  - [x] SubTask 3.3: 验证今日统计和媒体栏同时存在时无重叠

- [x] Task 4: 修复主题选择模态框预览不区分主题风格
  - [x] SubTask 4.1: 在 ThemeModal.tsx 中为每个主题卡片设置独立的 CSS 变量上下文（通过 `style` 属性注入该主题的 CSS 变量）
  - [x] SubTask 4.2: 验证在任意主题下打开选择器，各卡片预览色块反映该主题自身配色

- [x] Task 5: 为主题选择模态框添加自定义滚动条
  - [x] SubTask 5.1: 在 globals.css 中为 `.theme-modal-content` 添加自定义滚动条样式（使用 `--sakura-soft` 色）
  - [x] SubTask 5.2: 验证模态框滚动条在各主题下风格匹配

- [x] Task 6: 为 DefaultLayout 单栏模式添加自定义滚动条
  - [x] SubTask 6.1: 在 globals.css 的 `@media (max-width: 768px)` 中为 `.panels` 添加自定义滚动条样式（使用 `--border` 色）
  - [x] SubTask 6.2: 验证单栏模式下滚动条风格匹配

- [x] Task 7: 为水墨主题单栏模式添加自定义滚动条
  - [x] SubTask 7.1: 在 inkwash/theme.css 的 `@media (max-width: 1024px)` 和 `@media (max-width: 768px)` 中为 `.ink-shell` 添加自定义滚动条样式
  - [x] SubTask 7.2: 验证水墨主题单栏模式下滚动条风格匹配

- [x] Task 8: 更新主题构建指南
  - [x] SubTask 8.1: 在 GUIDE.md 中补充滚动条样式规范（模态框、单栏布局）
  - [x] SubTask 8.2: 在 GUIDE.md 中补充主题预览适配说明
  - [x] SubTask 8.3: 在 GUIDE.md 中强调 CSS 选择器必须限定在 `[data-theme]` 作用域内

# Task Dependencies
- [Task 2] depends on [Task 3] (先修布局再补内容，避免遮挡问题影响验证)
- [Task 5] independent
- [Task 6] independent
- [Task 7] independent
- [Task 8] depends on [Task 1-7] (指南更新需涵盖所有修复内容)
