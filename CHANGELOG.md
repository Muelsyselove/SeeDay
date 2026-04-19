# 版本更新记录

## v2.2 - 2026-04-19

### Persona 布局主题

#### 更新内容

**新增文件：**
- `src/layouts/PersonaLayout.tsx` - 女神异闻录风格布局组件
- `themes/persona/theme.ts` - Persona 主题定义
- `themes/persona/theme.css` - Persona 主题 CSS 样式

**修改文件：**
- `app/page.tsx` - 注册 Persona 布局和主题
- `app/globals.css` - 引入 persona 主题 CSS
- `themes/mapping.json` - 新增 persona 映射

#### 实现说明

**布局特色：**
- 红黑撞色配色，深黑背景 + 炽红强调色
- 大胆斜切几何（clip-path 斜切按钮和卡片）
- 快速入场动画（0.25s-0.4s 分阶段入场）
- 半色调纹理背景（缓慢漂移的网点图案）
- 45度旋转条纹背景（60秒缓慢旋转）
- 顶部栏红色脉冲边框动画
- 菱形应用图标（clip-path 菱形）
- +号旋转45度折叠动画
- 英文大写标签，工业感设计语言
- 音乐播放条动态跳动动画
- 状态指示灯脉冲闪烁

---

## v2.1 - 2026-04-19

### 修复主题模态框位置偏移

#### 更新内容

**修改文件：**
- `components/ThemeModal.tsx` - 使用 `createPortal` 将模态框渲染到 `document.body`

#### 实现说明

- 模态框之前被渲染在组件树内部，受到祖先元素层叠上下文影响导致 `position: fixed` 偏移
- 使用 `createPortal` 确保模态框直接挂载到 body，始终相对于视口居中

---

## v2.0 - 2026-04-19

### 主题系统架构重构：支持独立布局级主题

#### 更新内容

**核心架构变更：**
- 将 `ThemeDefinition` 接口中的 `layout`、`fonts`、`animations` 字段移除，改为 `layoutId: string`
- 新增布局注册中心：`src/layouts/registry.ts`
- 新增布局组件：`src/layouts/DefaultLayout.tsx`（从原 page.tsx 提取）
- 新增主题切换共享组件：`src/components/ThemeSwitcher.tsx`
- 将 `app/page.tsx` 重构为布局分发器，根据 `theme.layoutId` 动态渲染对应布局

**新增文件：**
- `src/layouts/registry.ts` - 布局注册中心（registerLayout/getLayouts/getLayout）
- `src/layouts/DefaultLayout.tsx` - 默认布局组件（835行，包含所有原页面逻辑）
- `src/components/ThemeSwitcher.tsx` - 共享主题切换组件

**修改文件：**
- `themes/types.ts` - ThemeDefinition 接口更新（移除 layout/fonts/animations，新增 layoutId）
- `app/page.tsx` - 重构为布局分发器（约 45 行）
- `themes/huaxin/theme.ts` - 新增 `layoutId: 'default'`
- `themes/artistic/theme.ts` - 新增 `layoutId: 'default'`
- `themes/bold/theme.ts` - 新增 `layoutId: 'default'`
- `themes/inferno/theme.ts` - 新增 `layoutId: 'default'`，移除无效字段
- `themes/GUIDE.md` - 完全重写，反映新架构

**配置变更：**
- `tsconfig.json` - 新增 `@/layouts/*` 路径别名
- `next.config.ts` - 新增 `@/layouts`、`@/hooks`、`@/lib` webpack 别名

#### 实现说明

**布局分发模式（Dispatcher Pattern）：**
1. `page.tsx` 作为路由层，调用 `useTheme()` 获取当前主题
2. 通过 `getTheme(currentTheme).layoutId` 获取布局 ID
3. 通过 `getLayout(layoutId)` 获取对应布局组件
4. 动态渲染 `<LayoutComponent themes={...} currentTheme={...} switchTheme={...} />`

**布局组件要求：**
- 必须是 `"use client"` 组件
- 接收 `LayoutProps`（themes, currentTheme, switchTheme）
- 必须包含 `ThemeSwitcher` 组件以支持主题切换
- 通过 `registerLayout()` 注册到布局注册中心

**主题切换流程：**
- 所有布局共享 `ThemeSwitcher` 组件
- 点击 🎨 按钮弹出全屏主题选择模态框
- 支持切换所有已注册主题（包括使用不同布局的主题）

---

## v1.0 - 2026-04-18

### 初始版本

- 基础双栏布局（左侧状态面板 + 右侧时间轴）
- CSS 变量驱动主题系统
- 花信、艺境、极光、烈焰四个主题
- 设备在线状态监控
- 应用使用时长统计
- 媒体使用记录（音乐/视频）
- AI 每日小结
- 主题切换模态框
- 折叠/展开动画
- 响应式设计（电脑双栏/电脑单栏/手机）
- Docker 构建部署
