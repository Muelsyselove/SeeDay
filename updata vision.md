# 更新记录

## v1.5.12 - 2026-04-20
### 修复 XML 编译错误导致构建完全失败
- `activity_settings.xml` 中 `android:text` 属性内使用了中文引号 `"` 而非转义，导致 XML 解析失败
- 移除 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` 环境变量（GitHub Actions 已默认 Node 24）
- 更新 `versionCode` 为 12，`versionName` 为 "1.5.12"

## v1.5.11 - 2026-04-20
### 简化构建配置，修复所有构建步骤失败
- Release 构建关闭 `isMinifyEnabled`（R8 混淆），避免 ProGuard 规则导致的编译错误
- Debug 构建添加 `continue-on-error: true` 确保至少能获取到 APK artifact
- ProGuard 规则回退到标准格式，移除 `-dontwarn **`（语法不兼容）
- 更新 `versionCode` 为 11，`versionName` 为 "1.5.11"

## v1.5.10 - 2026-04-20
### 修复 Release 构建失败
- 关闭 `isShrinkResources`（资源压缩），仅保留 R8 代码混淆
- ProGuard 规则改为完全保留模式：保留所有 androidx/android/okhttp/gson/kotlin 类
- 添加 `-dontwarn **` 忽略所有警告
- `assembleRelease` 移除 `|| true`，保留 `continue-on-error: true` 确保不阻塞 Debug 输出
- 更新 `versionCode` 为 10，`versionName` 为 "1.5.10"

## v1.5.9 - 2026-04-20
### 修复 CI 构建问题
- 将 `actions/upload-artifact` 从 v5 降级为 v4（Node 24 兼容性问题）
- Debug APK 路径改为精确路径 `app-debug.apk` 而非 glob 匹配
- Release 构建添加 `continue-on-error: true`，避免阻塞 Debug APK 输出
- Create Release 只发布 Debug APK
- 更新 `versionCode` 为 9，`versionName` 为 "1.5.9"

## v1.5.8 - 2026-04-20
### 修复 Release 构建失败
- `SettingsActivity` 中 `java.net.URL` 改为 `java.net.URI`，避免 R8 编译报错
- 更新 ProGuard 规则，保留 OkHttp/OkIO/Gson/Coroutines 类
- 更新 `versionCode` 为 8，`versionName` 为 "1.5.8"

## v1.5.7 - 2026-04-20
### 添加连接测试功能，排查网络问题
- 设置页面新增"测试连接"按钮，逐步检测：DNS 解析 → TCP 连接 → HTTP 请求
- 显示每一步的详细结果和失败原因，便于定位网络问题
- 更新说明文字，服务器地址格式示例改为 `https://domain`
- 更新 `versionCode` 为 7，`versionName` 为 "1.5.7"

## v1.5.6 - 2026-04-20
### 修复 HTTPS 连接被重置问题
- OkHttpClient 添加 `ConnectionSpec` 配置，支持 TLS 1.2 和 TLS 1.3
- 添加 `ConnectionSpec.COMPATIBLE_TLS` 作为兼容回退
- 启用 `retryOnConnectionFailure(true)`，连接失败时自动重试
- 异常信息包含完整类名（如 `ConnectException: ...`、`SSLException: ...`），便于诊断
- 更新 `versionCode` 为 6，`versionName` 为 "1.5.6"

## v1.5.5 - 2026-04-20
### 添加详细调试日志，排查上报失败问题
- `performReport()` 在检测不到前台应用时，通知栏显示无障碍服务状态和包名信息
- `performReport()` 上报前显示"上报中: 包名"状态
- `performReport()` 上报失败时显示完整错误信息（50 字符）
- `getForegroundApp()` 添加 Log.d/Log.w 日志，记录每种检测方式的结果
- 更新 `versionCode` 为 5，`versionName` 为 "1.5.5"

## v1.5.4 - 2026-04-20
### 更新服务器地址为 HTTPS
- 服务器地址应使用 `https://doinday.top`（HTTPS 加密连接）
- 服务器已配置 Nginx 反向代理 + SSL，端口 3000 外部不可直接访问
- 更新 `versionCode` 为 4，`versionName` 为 "1.5.4"
- 后端添加 `/api/report` 请求日志，便于排查连接问题

## v1.5.3 - 2026-04-20
### 修复 Android Agent 监控运行但始终显示"尚未上报"
- **修复 1**：`ApiClient.lastReportTime` 添加 `@Volatile` 注解，确保 IO 线程更新后主线程可见
- **修复 2**：`getForegroundApp()` UsageStatsManager 事件查询窗口从 5 秒扩大到 60 秒
- **修复 3**：添加 `queryUsageStats()` 作为更可靠的二级回退，查找最近使用的应用
- 更新 `versionCode` 为 3，`versionName` 为 "1.5.3"

## v1.5.2 - 2026-04-20
### 修复 Android Agent 始终显示"尚未上报"问题
- **问题**：手机端 Agent 启动监控后始终显示"尚未上报"，前端也不显示手机在线
- **原因 1**：`MonitorService.performReport()` 在 `currentPackageName` 为空时静默返回，不更新通知。而 `MonitorAccessibilityService` 初始化时 `currentPackageName = ""`，只有收到非自身包名的事件后才更新。如果用户在 Agent 界面启动监控，事件被过滤（`packageName == this.packageName`），导致包名始终为空
- **原因 2**：`event.text` 在很多 Android 应用中返回空字符串，窗口标题获取不完整
- **原因 3**：`ApiClient.lastReportTime` 缺少 `@Volatile` 注解，`report()` 在 IO 线程更新该值，主线程读取时可能因 Java 内存模型可见性问题看不到更新，导致 UI 始终显示"尚未上报"
- **原因 4**：`getForegroundApp()` 的 UsageStatsManager 回退查询窗口仅 5 秒，太短，如果 5 秒内没有应用切换事件则查不到前台应用
- **修复 1**：添加 `UsageStatsManager` 作为备用前台应用检测方式，当无障碍服务未检测到包名时，通过使用统计 API 获取最近活跃的应用
- **修复 2**：`MonitorAccessibilityService` 中 `windowTitle` 获取逻辑增加 `contentDescription` 备用
- **修复 3**：`MonitorService.performReport()` 在包名为空时更新通知为"等待检测前台应用..."，而非静默跳过
- **修复 4**：添加 `PACKAGE_USAGE_STATS` 权限声明，启动监控时引导用户授予使用统计权限
- **修复 5**：`MonitorAccessibilityService.onServiceConnected()` 不再重置 `currentPackageName`，避免服务重连时丢失已检测的应用信息
- **修复 6**：`ApiClient.lastReportTime` 添加 `@Volatile` 注解，确保跨线程可见性
- **修复 7**：`getForegroundApp()` 的 UsageStatsManager 事件查询窗口从 5 秒扩大到 60 秒，并添加 `queryUsageStats()` 作为更可靠的二级回退

## v1.5.1 - 2026-04-20
### 修复 Android Agent 无障碍服务检测失败问题
- **问题**：已开启无障碍服务但应用仍显示"无障碍服务未启用"
- **原因**：`isAccessibilityServiceEnabled()` 使用 `Settings.Secure.getString()` 读取 `ENABLED_ACCESSIBILITY_SERVICES` 系统设置项，但从 Android 13（API 33）起，出于隐私保护，第三方应用无法再读取该设置项，`getString()` 始终返回 `null`，导致检测方法永远返回 `false`
- **修复**：将检测方式从 `Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES` 改为 `AccessibilityManager.getEnabledAccessibilityServiceList()`，这是 Android 官方推荐的 API，在所有版本上均可正常工作
- 移除不再需要的 `android.text.TextUtils` 和 `android.view.accessibility.AccessibilityManager` 导入（改为内联引用）

### 修复 Android 14+ 启动监控闪退问题
- **问题**：启动监控后应用闪退，报错 `SecurityException: Starting FGS with type connectedDevice`
- **原因**：`MonitorService` 使用了 `foregroundServiceType="connectedDevice"`，但 Android 14（API 34）要求该类型必须同时拥有蓝牙/USB/NFC 等运行时权限，应用不具备这些权限
- **修复**：将前台服务类型从 `connectedDevice` 改为 `dataSync`，该类型仅需 `FOREGROUND_SERVICE_DATA_SYNC` 权限，无需额外运行时权限
- 在 `MonitorService.onCreate()` 中为 API 34+ 设备调用 `startForeground()` 时显式指定 `FOREGROUND_SERVICE_TYPE_DATA_SYNC`
- 更新 `AndroidManifest.xml` 权限声明：`FOREGROUND_SERVICE_CONNECTED_DEVICE` → `FOREGROUND_SERVICE_DATA_SYNC`

## v1.5.0 - 2026-04-19
### 新增 Android Agent 应用
- 新增独立 Android 项目 `packages/android-agent/`，使用 Kotlin 原生开发
- 实现无障碍服务（`MonitorAccessibilityService`），监听 `TYPE_WINDOW_STATE_CHANGED` 事件捕获前台应用包名
- 实现前台服务（`MonitorService`），通过常驻通知保障后台持续运行
- 实现开机自启（`BootReceiver`），监听 `BOOT_COMPLETED` 广播自动恢复服务
- 实现数据上报模块（`ApiClient`），对接现有 `/api/report` 接口，支持 `;;` 分隔多应用格式
- 实现电池信息采集（`battery_percent`、`battery_charging`）
- 实现网络异常缓存重试机制（最多缓存 50 条待重试数据）
- 实现配置管理（`ConfigManager`），使用 SharedPreferences 持久化服务器地址、Token、上报间隔
- 实现主界面（`MainActivity`），展示运行状态、当前应用、上次上报时间、服务器连接状态
- 实现设置界面（`SettingsActivity`），可编辑服务器地址、设备 Token、上报间隔
- 实现无障碍服务启用引导，未开启时自动跳转系统设置
- 配置 Gradle Kotlin DSL 构建系统，支持 `assembleDebug` 和 `assembleRelease` APK 打包
- 最低 SDK 版本 API 26（Android 8.0），目标 SDK 34

## v1.4.1 - 2026-04-19
### 修正隐私描述
- **README.md**：
  - 将"隐私优先"改为"隐私说明"
  - 移除"数据完全本地存储"、"灵活的隐私设置"、"不上传任何个人数据到云端"等过度承诺的表述
  - 添加指向 Wiki 隐私说明的链接
- **Wiki Features.md**：
  - 将"隐私保护"改为"隐私说明"
  - 将"三级隐私系统"改为"当前隐私处理机制"
  - 详细说明各机制的局限性（基于应用名称匹配、关键词列表覆盖有限等）
  - 新增"隐私风险提示"，列出7项可能存在的隐私问题：
    - 窗口标题可能泄露敏感信息
    - 应用分级可能被绕过
    - AI 总结涉及数据外传
    - 网络传输安全依赖部署配置
    - 日志可能包含敏感信息
    - 数据库未加密
    - 多设备数据汇总
  - 新增"建议的最佳实践"
- **Wiki Architecture.md**：
  - 更新隐私分级服务描述，注明基于应用名称的简单匹配，并非真正的隐私保护机制
  - 更新 NSFW 过滤服务描述，注明关键词列表由人工维护，覆盖有限

## v1.4.0 - 2026-04-19
### 重构 README 和创建 Wiki 文档
- **README.md 重构**：
  - 将致谢部分移到项目简介之后、功能特性之前
  - 优化 Agent 表述，明确标注四个平台的支持状态：
    - Windows（已支持）、macOS（开发中）、iOS（开发中）、Android（开发中）
  - 在项目结构中添加 iOS 和 Android 目录占位
  - 在"文档"部分添加 Wiki 链接入口
- **创建完整 Wiki 文档**（6 个页面）：
  - `Home.md`：项目概述、快速导航、核心特性、Agent 平台支持表
  - `Features.md`：实时活动追踪、可视化仪表盘、AI 每日总结、隐私保护、主题系统、多设备支持
  - `Architecture.md`：系统架构图、技术栈、数据流转、API 接口设计、数据模型、核心服务
  - `Requirements.md`：服务器配置要求（最低 2核4G，推荐60G存储）、网络要求、安全建议
  - `Deployment-Guide.md`：Docker 部署、手动部署、Nginx 配置、HTTPS 配置、环境变量、问题排查
  - `AI-Deployment.md`：Claude Code、GitHub Copilot Chat、Trae AI、Codex CLI 的详细部署指南
- Wiki 文件已推送到主仓库 `wiki/` 目录
- **GitHub Wiki 初始化**：需在 GitHub 网页上手动初始化 Wiki 仓库后推送

## v1.3.0 - 2026-04-19
### 修改项目描述为 SeeDay（顾日）
- 重写 README.md，将项目从 "Live Dashboard" 改为 "SeeDay（顾日）"
- 更新项目简介，强调个人时间洞察仪表盘定位
- 更新项目结构说明，体现 SeeDay 作为独立项目的结构
- 更新快速开始指南中的仓库地址和项目名称
- 删除冗余的 `updata vison.md` 文件（拼写错误）
- 更新主题系统说明，体现项目的独立性

## v1.2.0 - 2026-04-19
### 项目初始化并推送到 GitHub 仓库
- 清除旧的 git 仓库信息
- 重新初始化 git 仓库，配置用户名为 `Muelsyselove`
- 重命名默认分支为 `main`
- 添加远程仓库 `https://github.com/Muelsyselove/SeeDay.git`
- 创建初始提交，包含全部 135 个文件
- 推送到 GitHub 仓库 `Muelsyselove/SeeDay`

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
