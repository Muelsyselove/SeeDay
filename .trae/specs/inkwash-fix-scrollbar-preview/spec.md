# 水墨主题修复与全局滚动条/主题预览适配 Spec

## Why
水墨国风主题存在多个布局缺陷：左侧栏滚动条未生效、视频媒体未显示、统计区被遮挡。同时，全局层面主题选择模态框的预览未区分各主题风格，且多个滚动区域使用浏览器默认滚动条样式，与主题风格不协调。

## What Changes
- 修复水墨主题左侧栏滚动条未生效问题（CSS 选择器需限定在 `[data-theme="inkwash"]` 作用域内）
- 修复水墨主题媒体栏视频部分未显示（InkLayout 中缺少视频分组的 JSX）
- 修复水墨主题今日统计区被媒体栏遮挡（左侧栏 flex 布局溢出问题）
- 修复所有主题选择模态框预览不区分主题风格（需为每个主题卡片设置独立 CSS 变量上下文）
- 为主题选择模态框内容区添加匹配当前主题风格的自定义滚动条
- 为 DefaultLayout 单栏模式（≤1024px）的 `.panels` 滚动区添加自定义滚动条
- 为水墨主题单栏模式添加自定义滚动条
- 更新主题构建指南，补充滚动条样式和主题预览适配要求

## Impact
- Affected specs: 主题系统、布局系统
- Affected code:
  - `packages/frontend/themes/inkwash/theme.css` — 滚动条选择器修复、单栏滚动条
  - `packages/frontend/src/layouts/InkLayout.tsx` — 补充视频媒体 JSX
  - `packages/frontend/components/ThemeModal.tsx` — 主题预览上下文隔离
  - `packages/frontend/app/globals.css` — 模态框滚动条、单栏滚动条
  - `packages/frontend/themes/GUIDE.md` — 补充指南内容

## ADDED Requirements

### Requirement: 水墨主题左侧栏滚动条
水墨主题双栏模式下，左侧栏 `.ink-panel-left` 必须具有可用的自定义滚动条，当内容超出视口高度时可以滚动。

#### Scenario: 左侧栏内容溢出时
- **WHEN** 水墨主题左侧栏内容高度超出可用空间
- **THEN** 左侧栏出现 3px 朱砂红色滑块的自定义滚动条，用户可滚动查看所有内容

### Requirement: 水墨主题视频媒体显示
水墨主题媒体栏必须同时显示音乐和视频两个分组，与 DefaultLayout 行为一致。

#### Scenario: 存在视频使用记录时
- **WHEN** 用户有视频类应用使用记录
- **THEN** 媒体栏显示"影画"分组，包含正在播放和已播放的视频条目

### Requirement: 水墨主题今日统计区不被遮挡
水墨主题左侧栏的"今日"统计区必须完整显示，不被下方媒体栏遮挡。

#### Scenario: 媒体栏存在时
- **WHEN** 今日统计和媒体栏同时显示
- **THEN** 今日统计区完整可见，媒体栏在其下方正常排列，无重叠

### Requirement: 主题选择模态框预览区分主题风格
主题选择模态框中每个主题卡片的预览必须反映该主题的实际配色，而非当前激活主题的配色。

#### Scenario: 在花信主题下查看其他主题预览
- **WHEN** 用户在花信主题下打开主题选择器
- **THEN** 每个主题卡片的色块和预览区使用该主题自身的 CSS 变量值，而非花信主题的变量值

### Requirement: 主题选择模态框滚动条样式
主题选择模态框 `.theme-modal-content` 的滚动条必须匹配当前主题风格。

#### Scenario: 模态框内容超出时
- **WHEN** 主题列表超出模态框可视区域需要滚动
- **THEN** 滚动条使用当前主题的 `--sakura-soft` 色作为滑块颜色，3px 宽度，透明轨道

### Requirement: DefaultLayout 单栏模式滚动条样式
DefaultLayout 在屏幕宽度 ≤1024px 切换为单栏时，`.panels` 容器的滚动条必须匹配当前主题风格。

#### Scenario: 平板或窄屏下单栏滚动
- **WHEN** 屏幕宽度 ≤1024px 且内容超出视口
- **THEN** `.panels` 滚动条使用当前主题的 `--border` 色作为滑块颜色，3px 宽度

### Requirement: 水墨主题单栏模式滚动条样式
水墨主题在屏幕宽度 ≤1024px 切换为单栏时，`.ink-shell` 容器的滚动条必须匹配水墨主题风格。

#### Scenario: 平板或窄屏下单栏滚动
- **WHEN** 水墨主题在 ≤1024px 宽度下
- **THEN** `.ink-shell` 滚动条使用 `--sakura-soft` 色作为滑块颜色，3px 宽度

## MODIFIED Requirements

### Requirement: 主题构建指南滚动条规范
主题构建指南必须包含以下新增内容：
1. 主题选择模态框滚动条样式规范
2. 单栏布局滚动条样式规范
3. 主题预览适配说明（每个主题卡片需设置独立 CSS 变量上下文）
4. CSS 选择器必须限定在 `[data-theme="xxx"]` 作用域内的明确要求
