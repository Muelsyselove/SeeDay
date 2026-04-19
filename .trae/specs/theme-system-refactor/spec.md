# 主题系统重构规范

## Why
当前主题系统仅支持 CSS 变量覆盖，主题接口过于局限，无法自定义布局。需要重构为完整的主题接口系统，允许主题定义布局、组件样式、动画等，确保任何自定义主题都可以无缝接入。

## What Changes
- **BREAKING** 重构主题系统架构，从纯 CSS 变量改为 TypeScript 主题接口
- 新增 `ThemeDefinition` 接口，包含布局参数、CSS 变量、主题元数据
- 新增 `themes/registry.ts` 动态主题注册中心
- 新增主题模态框选择器（全屏居中，带预览卡片）
- 修复 CSS 优先级问题，确保主题切换生效
- 更新主题构建指南

## Impact
- 前端：page.tsx、globals.css、useTheme.ts
- 新增：themes/registry.ts、themes/types.ts
- 主题构建指南更新

## ADDED Requirements
### Requirement: 主题接口定义
系统 SHALL 提供 `ThemeDefinition` 接口，主题可通过此接口定义：
```typescript
interface ThemeDefinition {
  id: string;
  name: string;
  css: Record<string, string>; // CSS 变量映射
  layout?: {
    sidebarWidth?: string;
    topbarHeight?: string;
    gap?: string;
    panelPadding?: string;
    mobileBreakpoint?: string;
    showPanelLabels?: boolean;
    timelineStyle?: 'horizontal' | 'vertical';
  };
  fonts?: {
    display?: string;
    body?: string;
    mono?: string;
  };
  animations?: {
    duration?: string;
    easing?: string;
  };
  metadata?: {
    author?: string;
    description?: string;
    previewImage?: string;
  };
}
```

### Requirement: 动态主题注册中心
系统 SHALL 提供主题注册中心，支持：
- 自动发现 `themes/` 下的主题
- 提供 `registerTheme()` 和 `getThemes()` API
- 支持在主题文件中调用 `registerTheme()` 注册自定义主题

#### Scenario: 注册自定义主题
- **WHEN** 主题文件中调用 `registerTheme()`
- **THEN** 主题自动添加到可用主题列表

### Requirement: 主题模态框选择器
系统 SHALL 在点击主题切换按钮时显示全屏模态框，包含：
- 所有可用主题的预览卡片
- 点击卡片切换主题并关闭模态框
- ESC/点击遮罩层关闭

#### Scenario: 主题预览卡片
- **WHEN** 模态框打开
- **THEN** 每个主题显示：配色色块（6个主要颜色）、布局缩略图、主题名称和描述

### Requirement: 布局级主题
系统 SHALL 支持通过 `layout` 字段定义布局级主题：
- 侧边栏宽度、顶部高度、间距、内边距
- 移动端断点、面板标签显示、时间轴样式

### Requirement: CSS 优先级修复
默认主题变量使用 `html:not([data-theme])` 选择器，确保主题导入可以正确覆盖。

## MODIFIED Requirements
### Requirement: 主题选择面板
主题选择面板改为模态框形式，不再使用顶部下拉面板。

### Requirement: 主题切换逻辑
`useTheme` hook  SHALL 从注册中心获取所有主题，而非硬编码。

## REMOVED Requirements
### Requirement: 旧版主题下拉面板
**Reason**: 显示空间不足，交互不直观
**Migration**: 使用新的全屏模态框替代

### Requirement: 硬编码主题列表
**Reason**: 不支持动态扩展主题
**Migration**: 使用 `themes/registry.ts` 动态注册
