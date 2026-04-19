# 更新记录

## v1.1.2 - 2026-04-19
### 修复水墨主题左侧面板滚动条和元素遮挡问题
- 将 `.ink-panel-left` 选择器添加 `[data-theme="inkwash"]` 前缀，确保样式在主题作用域内正确应用
- 给 `.ink-panel-left` 添加 `flex-shrink: 1`，允许左侧面板在弹性布局中适当收缩
- 将 `.ink-section` 选择器添加 `[data-theme="inkwash"]` 前缀，并添加 `flex-shrink: 0`，防止区块被压缩导致内容重叠
- 在 `@media (max-width: 1024px)` 媒体查询中添加 `.ink-shell` 自定义滚动条样式
- 在 `@media (max-width: 768px)` 媒体查询中添加 `.ink-shell` 自定义滚动条样式（3px 朱砂红滑块）

## v1.1.1 - 2026-04-19
### 修复主题模态框预览和自定义滚动条样式
- 修复主题卡片预览不区分主题的问题：在 `ThemeModal.tsx` 中将 `theme.css` 展开为每个卡片的内联样式，使每张卡片拥有独立的 CSS 变量上下文，正确显示对应主题的颜色
- 为 `.theme-modal-content` 添加自定义滚动条样式（3px 宽，樱花色滑块，透明轨道），支持 WebKit 和 Firefox
- 为 `@media (max-width: 1024px)` 下的 `.panels` 添加自定义滚动条样式（3px 宽，边框色滑块，透明轨道），支持 WebKit 和 Firefox

## v1.1.1 - 2026-04-19
### 修复水墨主题双栏布局左侧栏滚动条缺失和元素遮挡
- 添加 `.ink-shell` 容器，使用 `height: 100dvh` + `flex` 列布局约束视口高度
- 给 `.ink-panel-left` 添加 `overflow-y: auto` + `min-height: 0`，启用独立滚动
- 给 `.ink-panel-left` 添加自定义滚动条样式（3px 朱砂红滑块）
- 给 `.ink-content` 添加 `flex: 1` + `overflow: hidden`，限制在剩余空间内
- 给 `.ink-topbar` 和 `.ink-hero` 添加 `flex-shrink: 0`，防止被压缩
- 给 `.ink-hero` 设置 `max-height: 200px`，防止无限撑高
- 给 `.ink-panel-right` 添加 `min-height: 0`，确保正确约束
- 手机端（≤768px）：`.ink-shell` 改为 `height: auto` + `overflow-y: auto`，允许整页滚动
- 平板端（≤1024px）：`.ink-panel-left` 改为 `overflow-y: visible`，单栏自然流动

## v1.1.0 - 2026-04-19
### 新增水墨国风布局级主题
- 新增布局组件 `InkLayout.tsx`，注册布局 ID 为 `inkwash`
- 新增主题定义 `themes/inkwash/theme.ts`，关联 `inkwash` 布局
- 新增主题样式 `themes/inkwash/theme.css`，包含完整的水墨国风视觉效果
- 在 `mapping.json` 中添加 `"inkwash": "水墨"` 映射
- 在 `globals.css` 中引入 `inkwash/theme.css`
- 在 `page.tsx` 中注册布局和主题导入

#### 水墨国风主题设计要点
- **配色**：宣纸暖白背景、墨黑文字、朱砂红强调色、翠玉绿辅助色、金色点缀
- **字体**：Ma Shan Zheng（马善政楷体）作为展示字体，Noto Serif SC 作为正文字体
- **动态效果**：
  - 远山轮廓 SVG 呼吸动画（`ink-mountain-breathe`）
  - 三层云雾漂移动画（`ink-mist-drift-1/2/3`）
  - 水墨晕染装饰旋转动画（`ink-splash-rotate`）
  - 入场动画采用 opacity + visibility 组合，避免闪现
  - 顶栏悬停展开，保留 8px 触发区域
  - 墨滴粒子下落动画（`ink-drop-fall`）
  - 音乐条舞动动画（`ink-bar-dance`）
  - 使用图表行渐显动画（`ink-reveal-up`）
  - 状态点呼吸动画（`ink-dot-breathe`）
- **界面元素**：
  - 印章风格徽章（`ink-site-seal`，朱砂红方框 + 旋转效果）
  - 面板左侧竖向渐变装饰线（朱砂→翠玉→透明）
  - 分隔线渐变效果（朱砂→翠玉→朱砂）
  - 区块左侧渐变装饰条
  - 毛玻璃半透明背景（`backdrop-filter: blur`）
- **响应式**：
  - ≤1024px 切换为单栏布局
  - ≤768px 手机端：顶栏常驻可见、隐藏云雾效果、缩小字体和间距
  - ≤380px 小屏适配
- **无障碍**：`prefers-reduced-motion` 媒体查询关闭所有动画
- **滚动条**：所有可滚动容器均定义了自定义滚动条样式

## v1.0.0 - 2026-04-19
### 手机端顶栏修复
- 修复 `.top-bar-right` 在手机端被隐藏的问题（`display: none` → `display: flex`）
- 添加全局 `.theme-btn` 样式（32x32 方形按钮，带边框和悬停效果）
- 添加 `.dev-btn-foreground` 样式（前台标记以樱花色显示）
- 添加 `.now-summary-foreground` 样式（此刻摘要中的前台标记样式）
- 手机端隐藏 "X人在看" 标签以节省空间
