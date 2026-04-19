* [x] 任务1：创建主题接口和注册中心

  * [x] 子任务1.1：创建 `themes/types.ts`，定义 `ThemeDefinition` 接口

  * [x] 子任务1.2：创建 `themes/registry.ts`，实现 `registerTheme()` 和 `getThemes()` API

  * [x] 子任务1.3：导出接口和注册中心供页面使用

* [x] 任务2：修复主题CSS优先级

  * [x] 子任务2.1：将默认主题变量改为 `html:not([data-theme])` 选择器

  * [x] 子任务2.2：确保主题导入顺序正确

  * [x] 子任务2.3：确保 night-mode 使用 `[data-theme].night-mode` 选择器

* [x] 任务3：创建主题预览模态框组件

  * [x] 子任务3.1：创建 `components/ThemeModal.tsx`

  * [x] 子任务3.2：实现颜色色块预览（6个主要颜色）

  * [x] 子任务3.3：实现布局缩略图预览

  * [x] 子任务3.4：实现ESC/遮罩层关闭逻辑

* [x] 任务4：重构页面集成

  * [x] 子任务4.1：在 page.tsx 中引入 ThemeModal

  * [x] 子任务4.2：移除旧版 theme-panel/theme-option 代码

  * [x] 子任务4.3：使用注册中心数据源替换硬编码

* [x] 任务5：创建布局级大胆主题

  * [x] 子任务5.1：创建 `themes/bold/` 文件夹和 `theme.ts`

  * [x] 子任务5.2：在 `theme.ts` 中定义布局参数和CSS变量

  * [x] 子任务5.3：调用 `registerTheme()` 注册主题

* [x] 任务6：更新主题构建指南

  * [x] 子任务6.1：更新 GUIDE.md 说明新的主题接口

  * [x] 子任务6.2：添加布局级主题示例

  * [x] 子任务6.3：说明 `registerTheme()` 的使用方法

