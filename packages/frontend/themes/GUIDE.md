# 主题编写指南

## 架构概述

主题系统采用 **布局注册 + 主题注册** 的双层架构：

- **布局层**：每种布局是一个独立的 React 组件，通过 `registerLayout()` 注册到布局注册中心
- **主题层**：每个主题通过 `ThemeDefinition` 定义配色（`css`）和关联的布局 ID（`layoutId`）
- **CSS 层**：通过 CSS 选择器 `[data-theme="id"]` 覆盖 CSS 变量，实现视觉样式
- **分发层**：`page.tsx` 作为布局分发器，根据当前主题的 `layoutId` 渲染对应的布局组件

## 目录结构

```
packages/frontend/
├── app/
│   └── page.tsx                          # 布局分发器（路由层）
├── src/
│   ├── layouts/
│   │   ├── registry.ts                   # 布局注册中心
│   │   └── DefaultLayout.tsx             # 默认布局组件
│   ├── components/
│   │   ├── ThemeSwitcher.tsx             # 共享主题切换组件（所有布局通用）
│   │   └── ThemeModal.tsx               # 主题选择模态框
│   └── hooks/
│       └── useTheme.ts                   # 主题状态 Hook
└── themes/
    ├── types.ts                          # ThemeDefinition 接口和主题注册中心
    ├── mapping.json                      # 主题中英文映射
    ├── GUIDE.md                          # 本指南
    ├── huaxin/
    │   ├── theme.css                     # CSS 变量覆盖
    │   └── theme.ts                      # TypeScript 主题定义
    ├── artistic/
    │   ├── theme.css
    │   └── theme.ts
    └── bold/
        ├── theme.css
        └── theme.ts
```

## 创建新主题

### 方式一：纯配色主题（使用现有布局）

只需要修改配色，不改变布局结构。

#### 1. 创建主题文件夹

在 `themes/` 目录下创建文件夹，例如 `themes/mytheme/`。

#### 2. 创建 theme.css

```css
[data-theme="mytheme"] {
  --bg:          oklch(96% 0.01 65);
  --bg-surface:  oklch(94% 0.015 58);
  /* ... 其他变量 ... */
}
```

#### 3. 创建 theme.ts

```typescript
import { registerTheme, ThemeDefinition } from '../types';

const myTheme: ThemeDefinition = {
  id: 'mytheme',
  name: '我的主题',
  css: {
    '--bg': 'oklch(96% 0.01 65)',
    '--bg-surface': 'oklch(94% 0.015 58)',
    '--border': 'oklch(87% 0.02 55)',
    '--border-soft': 'oklch(91% 0.015 55)',
    '--ink': 'oklch(22% 0.02 50)',
    '--ink-secondary': 'oklch(45% 0.025 50)',
    '--ink-muted': 'oklch(62% 0.02 55)',
    '--ink-faint': 'oklch(75% 0.015 55)',
    '--sakura': 'oklch(68% 0.13 12)',
    '--sakura-soft': 'oklch(78% 0.08 12)',
    '--sakura-bg': 'oklch(94% 0.03 12)',
    '--sage': 'oklch(68% 0.08 155)',
    '--sage-soft': 'oklch(78% 0.05 155)',
    '--sage-bg': 'oklch(94% 0.02 155)',
    '--gold': 'oklch(62% 0.11 70)',
    '--gold-soft': 'oklch(85% 0.05 70)',
  },
  layoutId: 'default',
  metadata: {
    author: '你的名字',
    description: '主题描述，会显示在主题选择器中',
  },
};

registerTheme(myTheme);
```

#### 4. 注册到映射文件

在 `mapping.json` 中添加：

```json
{
  "huaxin": "花信",
  "mytheme": "我的主题"
}
```

#### 5. 在 globals.css 中引入 CSS

```css
@import "../themes/mytheme/theme.css";
```

#### 6. 在 page.tsx 中注册主题

在 `app/page.tsx` 的主题导入区域添加：

```typescript
import "@/themes/mytheme/theme";
```

#### 7. 重新构建系统（⚠️ 重要）

**在完成上述步骤后，必须重新构建系统才能使新主题生效。**

> **注意**：执行构建前，请先询问用户确认是否进行构建。

#### 构建方法

```bash
cd /root/live-dashboard
docker compose build --no-cache
docker compose up -d
```

### 方式二：完整布局主题（自定义前端界面）

当主题需要对布局进行结构性改变（而非仅修改配色）时，需要从头创建一个新的前端界面组件。

#### 1. 创建布局组件

在 `src/layouts/` 目录下创建新的布局文件，例如 `MyLayout.tsx`：

```typescript
"use client";

import { registerLayout, LayoutProps } from "./registry";
import { ThemeSwitcher } from "../components/ThemeSwitcher";

function MyLayoutInner({ themes, currentTheme, switchTheme }: LayoutProps) {
  // 实现你自己的完整布局
  // 可以访问 useDashboard()、useTheme() 等 hook
  // 必须包含 ThemeSwitcher 组件以支持主题切换
  return (
    <>
      <header>
        <h1>My Layout</h1>
        <ThemeSwitcher themes={themes} currentTheme={currentTheme} switchTheme={switchTheme} />
      </header>
      {/* 你的布局内容 */}
    </>
  );
}

export function MyLayout(props: LayoutProps) {
  return <MyLayoutInner {...props} />;
}

// 注册到布局注册中心
registerLayout({
  id: 'my-layout',
  name: '我的布局',
  component: MyLayout,
});
```

#### 2. 在 page.tsx 中导入布局

```typescript
import "@/layouts/MyLayout";
```

#### 3. 创建主题定义并关联布局

```typescript
import { registerTheme, ThemeDefinition } from '../types';

const myTheme: ThemeDefinition = {
  id: 'mytheme',
  name: '我的主题',
  css: {
    // ... 配色变量
  },
  layoutId: 'my-layout',  // 关联到上面注册的布局
  metadata: {
    author: '你的名字',
    description: '使用自定义布局的主题',
  },
};

registerTheme(myTheme);
```

#### 4. 完成主题其他步骤

按方式一的步骤 4-7 完成映射、CSS 引入、注册和构建。

## 主题切换

所有布局都必须包含 `ThemeSwitcher` 组件。该组件：
- 在顶部导航栏显示 🎨 按钮
- 点击后弹出全屏主题选择模态框
- 展示主题名称、描述和配色预览
- 支持所有已注册主题的切换

## 布局注册中心 API

```typescript
// 注册布局
registerLayout(layout: {
  id: string;
  name: string;
  component: React.ComponentType<LayoutProps>;
}): void

// 获取所有布局
getLayouts(): LayoutInfo[]

// 获取指定布局
getLayout(id: string): LayoutInfo | undefined
```

## ThemeDefinition 接口

```typescript
interface ThemeDefinition {
  id: string;                    // 主题唯一 ID
  name: string;                  // 主题显示名称
  css: Record<string, string>;   // CSS 变量映射
  layoutId: string;              // 关联的布局 ID
  metadata?: {
    author?: string;
    description?: string;
    previewImage?: string;
  };
}
```

## LayoutProps 接口

所有布局组件接收的 props：

```typescript
interface LayoutProps {
  themes: ThemeInfo[];          // 所有可用主题列表
  currentTheme: string;         // 当前主题 ID
  switchTheme: (id: string) => void;  // 切换主题函数
}
```

## 布局设计原则

1. **独立性**：每个布局是独立的 React 组件，可以自由设计结构
2. **数据完整性**：必须确保所有数据显示正确和全面
3. **主题切换**：必须包含 ThemeSwitcher 组件支持主题切换
4. **响应式**：必须支持电脑端双栏、电脑端单栏、手机端三种模式
5. **可访问性**：可以隐藏元素，但必须确保用户能通过操作显示（详见下方"隐藏元素规范"）

## 必须定义的 CSS 变量

| 变量名 | 说明 |
|--------|------|
| `--bg` | 页面背景色 |
| `--bg-surface` | 卡片/面板表面色 |
| `--border` | 边框色 |
| `--border-soft` | 柔和边框色 |
| `--ink` | 主文字色 |
| `--ink-secondary` | 次要文字色 |
| `--ink-muted` | 弱化文字色 |
| `--ink-faint` | 极弱文字色 |
| `--sakura` | 主强调色 |
| `--sakura-soft` | 柔和强调色 |
| `--sakura-bg` | 强调背景色 |
| `--sage` | 辅助色 |
| `--sage-soft` | 柔和辅助色 |
| `--sage-bg` | 辅助背景色 |
| `--gold` | 金色强调 |
| `--gold-soft` | 柔和金色 |

## 注意事项

1. 所有颜色建议使用 `oklch()` 格式
2. 字号使用 `clamp()` 实现流式缩放
3. `theme.ts` 中的 `css` 字段应与 `theme.css` 中的变量一致
4. 测试时务必检查三种布局模式
5. 主题 CSS 中不要使用 `!important`
6. 确保文字色与背景色对比度符合 WCAG AA 标准

## 常见易错点

### 隐藏元素规范（⭐ 重要原则）

主题的主界面可以隐藏元素以实现大胆的艺术效果，但必须确保被隐藏的元素可以通过用户操作重新显示。**不允许永久隐藏任何用户需要访问的元素。**

**允许的隐藏方式及恢复机制：**

| 隐藏方式 | 恢复方式 | 示例 |
|----------|----------|------|
| 动画入场（`translateY`+`opacity`） | 悬停触发、动画完成后自动显示 | 顶部栏从上方滑入 |
| 折叠面板（`grid-template-rows: 0fr`） | 点击标题展开 | 音乐/视频列表 |
| 侧边抽屉（`translateX(-100%)`） | 悬停或点击触发按钮滑出 | 导航菜单 |
| 淡入淡出（`opacity: 0`） | 悬停或滚动到视口内显示 | 操作提示 |
| 模态框（默认隐藏） | 点击按钮弹出 | 主题选择器 |

**禁止的做法：**
- ❌ 使用 `display: none` 且无恢复机制
- ❌ 元素完全移出视口且无触发区域
- ❌ 隐藏后只能通过刷新页面恢复

**正确示例：**
```css
/* ✅ 推荐：使用 max-height 限制高度 + overflow: hidden */
.your-header {
  position: fixed;
  top: 0;
  max-height: 6px;       /* 保留 6px 触发区域 */
  overflow: hidden;       /* 隐藏内容 */
  transition: max-height 0.35s ease;
}

/* 悬停或动画触发时展开 */
.your-header:hover,
.your-header.phase-active {
  max-height: 80px;
}

/* ✅ 可接受：使用 translateY + opacity，但保留足够触发区域 */
.your-header {
  position: fixed;
  top: 0;
  transform: translateY(calc(-100% + 10px));  /* 保留 10px 在视口内 */
  opacity: 0;
}
.your-header:hover {
  transform: translateY(0);
  opacity: 1;
}

/* ❌ 错误：完全移出视口，无法悬停触发 */
.your-header {
  transform: translateY(-100%);
  opacity: 0;
}
```

### 滚动条样式优化（⚠️ 易错）

自定义布局中的每个可滚动元素都需要**显式定义滚动条样式**，且 CSS 选择器必须限定在 `[data-theme="xxx"]` 作用域内。详见下方"滚动条样式优化"章节。

### 动画入场时元素被隐藏

使用入场动画时，必须确保动画流畅且不会闪现。避免同时使用 `transform` 和 `opacity` 的初始隐藏，推荐使用 `opacity` + `visibility` 组合：

**推荐做法：**

```css
/* 初始隐藏 */
.your-animated-element {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.4s ease, visibility 0s 0.4s;
}

/* 动画完成后显示 */
.your-animated-element.phase-active {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.4s ease, visibility 0s 0s;
}
```

**禁止的做法：**
- ❌ 使用 `transform: translateY(-100%)` 会导致元素突然闪现
- ❌ 只使用 `opacity: 0` 而无 `visibility: hidden` 会导致占位元素仍可点击

### 手机端响应式优化（⭐ 重要）

**核心原则：** 手机端（≤768px）无鼠标悬停能力，所有依赖悬停的交互必须在手机端改为**常态显示**。

**必须遵守的规则：**

1. **顶栏/导航栏**：手机端必须始终可见，不可依赖悬停触发
   ```css
   /* 桌面端：悬停展开 */
   .your-header {
     max-height: 15px;
     overflow: hidden;
   }
   .your-header:hover {
     max-height: 80px;
   }
   
   /* 手机端：始终展开 */
   @media (max-width: 768px) {
     .your-header {
       max-height: none;
       opacity: 1;
       visibility: visible;
     }
   }
   ```

2. **折叠面板**：手机端应默认展开或改为点击切换
   ```css
   @media (max-width: 768px) {
     .your-collapsible {
       grid-template-rows: 1fr;  /* 默认展开 */
     }
   }
   ```

3. **入场动画**：手机端应简化或取消复杂动画，直接显示
   ```css
   @media (max-width: 768px) {
     .your-animated-element {
       opacity: 1;
       transform: none;
     }
   }
   ```

4. **字体和间距**：手机端缩小字体和间距
   ```css
   @media (max-width: 768px) {
     .your-title { font-size: 1.2rem; }
     .your-content { padding: 1rem; }
   }
   ```

**手机端检查清单：**
- [ ] 顶栏/导航栏始终可见
- [ ] 不依赖悬停的操作按钮
- [ ] 折叠面板默认展开或点击切换
- [ ] 入场动画简化或取消
- [ ] 字体大小适配小屏幕
- [ ] 触摸目标足够大（≥44px）

### 单栏布局适配

当屏幕宽度 ≤1024px 时，建议将双栏布局切换为单栏：

```css
@media (max-width: 1024px) {
  .your-content {
    grid-template-columns: 1fr;
  }
  .your-left-panel { padding-right: 0; padding-bottom: 1rem; }
  .your-right-panel {
    border-left: none;
    border-top: 1px solid var(--border);
    padding-top: 1rem;
  }
}
```

### 滚动条样式优化（⚠️ 易错）

自定义布局中的每个可滚动元素（如时间轴、媒体列表、展开面板）都需要**显式定义滚动条样式**，否则将显示浏览器默认滚动条（与主题配色不协调）。

**必须为每个可滚动容器定义以下 CSS：**

```css
/* WebKit 滚动条 */
.your-scroll-container::-webkit-scrollbar { width: 3px; }
.your-scroll-container::-webkit-scrollbar-track { background: transparent; }
.your-scroll-container::-webkit-scrollbar-thumb { background: var(--sakura-soft); border-radius: 3px; }

/* Firefox 滚动条 */
.your-scroll-container { scrollbar-width: thin; scrollbar-color: var(--sakura-soft) transparent; }

/* 无滚动条时完全隐藏 */
.your-scroll-container.no-overflow { scrollbar-width: none; }
.your-scroll-container.no-overflow::-webkit-scrollbar { width: 0; height: 0; }
```

**⚠️ CSS 选择器必须限定在 `[data-theme="xxx"]` 作用域内！**

自定义布局的 CSS 类名（如 `.ink-panel-left`、`.ink-section` 等）必须加上 `[data-theme="xxx"]` 前缀，否则样式可能在其他主题下也生效，导致冲突。例如：

```css
/* ✅ 正确：限定作用域 */
[data-theme="mytheme"] .my-panel-left {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--sakura-soft) transparent;
}
[data-theme="mytheme"] .my-panel-left::-webkit-scrollbar { width: 3px; }
[data-theme="mytheme"] .my-panel-left::-webkit-scrollbar-track { background: transparent; }
[data-theme="mytheme"] .my-panel-left::-webkit-scrollbar-thumb { background: var(--sakura-soft); border-radius: 3px; }

/* ❌ 错误：未限定作用域，可能影响其他主题 */
.my-panel-left {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--sakura-soft) transparent;
}
```

**检查清单：** 每次创建新布局时，确保以下元素都有滚动条样式：
- 左侧面板（如有独立滚动）
- 时间轴滚动容器
- 媒体列表（音乐/视频展开列表）
- 展开面板（时间线条目展开）
- 任何使用 `overflow-y: auto` 的容器
- 单栏模式下的主滚动容器
- 主题选择模态框内容区（全局，在 `globals.css` 中定义）

### 全局滚动条样式

以下滚动条样式在 `globals.css` 中全局定义，新主题无需单独处理：

1. **主题选择模态框** `.theme-modal-content` — 使用 `--sakura-soft` 色，3px 宽度
2. **DefaultLayout 单栏模式** `.panels`（≤1024px）— 使用 `--border` 色，3px 宽度

自定义布局的单栏模式滚动条需要在主题 CSS 中自行定义。

### 主题预览适配

主题选择模态框中每个主题卡片的预览需要反映该主题自身的配色，而非当前激活主题的配色。这通过 `ThemeModal.tsx` 中将 `theme.css` 变量作为 inline style 注入到每个卡片元素上来实现：

```tsx
<button
  className="theme-card"
  style={{ "--theme-id": theme.id, ...theme.css } as React.CSSProperties}
>
```

**新主题无需额外操作**，只要 `theme.ts` 中的 `css` 字段完整定义了所有必需的 CSS 变量，预览就会自动生效。

### 模态框定位偏移

如果使用 `position: fixed` 的模态框出现位置偏移，确保使用 `createPortal` 将其渲染到 `document.body`，避免祖先元素的层叠上下文影响定位。

```typescript
import { createPortal } from "react-dom";

return createPortal(
  <div className="modal-overlay">...</div>,
  document.body
);
```

### 主题切换按钮可见性

- 布局的顶部栏必须包含 `ThemeSwitcher` 组件
- 自定义布局的 `.theme-btn` 样式必须限定在 `[data-theme="xxx"]` 作用域内
- 避免全局 `.theme-btn` 样式冲突
