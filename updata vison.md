# 更新记录

## v1.0.0 - 2026-04-19
### 手机端顶栏修复
- 修复 `.top-bar-right` 在手机端被隐藏的问题（`display: none` → `display: flex`）
- 添加全局 `.theme-btn` 样式（32x32 方形按钮，带边框和悬停效果）
- 添加 `.dev-btn-foreground` 样式（前台标记以樱花色显示）
- 添加 `.now-summary-foreground` 样式（此刻摘要中的前台标记样式）
- 手机端隐藏 "X人在看" 标签以节省空间

## v1.1.0 - 2026-04-19
### 鼠标悬停效果修复
- 修复 `.tl-item:hover`、`.tl-app-group:hover`、`.tl-app-item:hover`、`.media-app-item:hover` 的悬停效果
- 使用 `!important` 强制覆盖动画的 transform，添加 `animation: none` 停止动画对 hover 的干扰
- 为 `.tl-app-active:hover` 和 `.tl-item-active:hover` 添加特定悬停颜色

### 单栏顶栏优化
- 添加 `.top-bar-inner { flex-wrap: nowrap; }` 确保元素不换行
- 确保左侧标题区域 `flex-shrink: 0` 不被压缩
- 手机端 `.top-bar-right .top-viewers` 恢复显示（`font-size: 10px`）
- 添加手机端 `.theme-btn` 尺寸适配（32x32，14px 字体）

### 构建指南更新
- 在 GUIDE.md 中添加"构建说明"章节，明确所有修改都需重新构建才能生效
- 修正之前关于"CSS 变量修改无需构建"的错误描述
- 在 GUIDE.md 目录结构中更新主题目录条目

## v1.2.0 - 2026-04-19
### Persona 主题悬停效果修复
- 为 `.p5-hero-app:hover` 添加 `transition`、`cursor`、`color` 和 `transform: translateX` 效果
- 为 `.p5-hero-title:hover` 添加 `transition` 和 `color` 变色效果
- 为 `.p5-site-title:hover` 添加 `transition` 和 `text-shadow` 效果
- 所有 hover 效果使用 `var(--ease-out-quart)` 缓动函数

### 删除水墨主题
- 删除 `themes/inkwash/theme.css` 和 `themes/inkwash/theme.ts`
- 从 `themes/mapping.json` 中移除 `"inkwash": "水墨"`
- 从 `app/page.tsx` 中移除 `import "@/themes/inkwash/theme"`
- 从 `themes/GUIDE.md` 目录结构中移除 inkwash 条目

## v1.3.0 - 2026-04-19
### DefaultLayout 大标题悬停效果修复
- 为 `.hero-app:hover` 添加 `transition`、`color: var(--sakura)` 和 `transform: translateX(4px)` 效果
- 为 `.hero-title:hover` 添加 `transition` 和 `color: var(--sakura)` 变色效果
- 为 `.site-title:hover` 添加 `transition` 和 `color: var(--sakura)` 变色效果
- 所有 hover 效果使用 `var(--ease-out-quart)` 缓动函数，`cursor: default` 鼠标样式

### 构建指南修正
- 修正 GUIDE.md 中关于"CSS 修改无需构建"的错误描述
- 明确所有修改都需重新构建才能生效

## v1.4.0 - 2026-04-19
### Persona 主题标题悬停隐藏效果
- 将 `.p5-hero-title` 设置为默认隐藏（`opacity: 0`, `transform: translateY(8px)`）
- 悬停 `.p5-hero` 区域时显示标题（`opacity: 1`, `transform: translateY(0)`）
- 悬停时标题文字变为樱花色
- 使用 `var(--ease-out-quart)` 缓动函数，0.4s 过渡时间
