# 更新记录

## v1.9.0 - 2026-04-21
### 新增 iOS Agent 项目
- **项目路径**：`agents/ios/LiveDashboardAgent/`
- **完整 Swift iOS 应用**，监控应用使用情况并上报到仪表盘后端
- **Models 层**：
  - `ReportPayload.swift`：上报数据模型，包含 appId、windowTitle、isForeground、timestamp、extra 字段，支持 `toDict()` 序列化
  - `ExtraInfo.swift`：附加信息模型，包含 batteryPercent、batteryCharging、screenOn 可选字段
  - `AppConfig.swift`：应用配置模型，包含 serverUrl、deviceToken、reportIntervalSeconds、isMonitoringEnabled 字段
- **Services 层**：
  - `ConfigManager.swift`：单例配置管理器，使用 UserDefaults 持久化，key 前缀 `live_dashboard_agent_`，提供 getConfig/saveServerUrl/saveDeviceToken/saveReportInterval/saveMonitoringEnabled/isConfigured 方法
  - `ApiClient.swift`：单例 HTTP 客户端，Bearer Token 认证，多应用报告使用 `;;` 分隔符格式，时间戳格式 `年;月;日;时:分`，tz 时区偏移字段，指数退避重试（最大60s），网络失败缓存（最多50条），电池信息采集（UIDevice），屏幕亮灭检测，连接测试方法（DNS→TCP→HTTP /api/health 逐步检测）
  - `MonitorManager.swift`：监控协调器，前台/后台应用检测与定时上报，系统应用黑名单（30个 com.apple.* 应用），DeviceActivityMonitor 前台应用检测，FamilyActivitySelection 后台应用检测，Timer 定时周期上报
- **App 层**：
  - `AppDelegate.swift`：UIKit AppDelegate，配置 BGTaskScheduler 后台处理任务（report + fetch），请求通知权限，启用电池监控
  - `SceneDelegate.swift`：UIKit SceneDelegate，设置 MainView 为根视图，前台切换时刷新应用信息
  - `LiveDashboardAgentApp.swift`：SwiftUI App 入口，通过 @UIApplicationDelegateAdaptor 桥接 AppDelegate
- **Views 层**：
  - `MainView.swift`：主界面显示运行状态（监控运行中/监控已停止/权限未授予）、当前前台应用、上次上报时间、服务器连接状态、监控开关，每2秒自动刷新，启动前检查权限和配置
  - `SettingsView.swift`：设置界面，服务器 URL、设备令牌（安全输入）、上报间隔（最小10秒）、测试连接按钮（DNS→TCP→HTTP 逐步显示结果）、保存按钮，字段验证
  - `PermissionGuideView.swift`：权限引导界面，引导用户开启屏幕使用时间/家庭控制权限和通知权限，提供跳转系统设置的按钮
- **Extension**：
  - `DeviceActivityMonitorExtension.swift`：Screen Time API 扩展，实现 DeviceActivityMonitor 协议，捕获应用切换事件，通过 App Group 共享 UserDefaults 存储前台应用信息
  - Extension `Info.plist`：配置 NSExtension 扩展点
- **共享代码**：
  - `DeviceActivityMonitorHandler.swift`：App 与 Extension 共享的常量和工具方法，定义 App Group suite name `group.com.livedashboard.agent`，提供 setCurrentApp/getCurrentApp/getLastForegroundApp/clearCurrentApp 方法
- **配置文件**：
  - `Resources/Info.plist`：UIBackgroundModes（fetch + processing）、NSAppTransportSecurity（Allow Arbitrary Loads）、NSFamilyControlsUsageDescription、UIApplicationSceneManifest
  - `Entitlements/LiveDashboardAgent.entitlements`：com.apple.developer.family-controls、com.apple.developer.deviceactivity、App Group

## v1.8.0 - 2026-04-21
### macOS Agent 完整重写，对齐 Windows Agent 功能
- **完整重写** `agents/macos/agent.py`，从单应用报告升级为多应用报告，对齐 Windows Agent 的全部功能
- **多应用报告格式**：使用 `;;` 分隔符拼接 `app_id`、`window_title`、`is_foreground` 字段，时间戳格式 `年;月;日;时:分`（如 `"2026;04;21;14:30"`），新增 `tz` 时区偏移字段（分钟）
- **前台应用检测**：保留 AppleScript 方式，增加桌面歌词窗口过滤、黑名单进程过滤、超时和错误处理
- **后台应用检测**：新增 `get_background_apps()` 函数
  - 使用 AppleScript 枚举所有可见非前台窗口（`background only is false and visible is true`）
  - 使用 psutil 扫描已知后台进程（微信、Telegram、Discord、QQ、飞书、钉钉、Skype、Slack、Zoom、Spotify、网易云音乐等）
  - 两路结果按 `app_id` 去重合并
- **空闲检测**：新增 `get_idle_seconds()` 函数，通过 ctypes 调用 macOS Quartz Event Services 的 `CGEventSourceSecondsSinceLastEventType(0, 0xFFFFFFFF)` 获取空闲秒数
- **全屏检测**：新增 `is_fullscreen()` 函数，通过 AppleScript 检查前台窗口的 `zoomed` 属性
- **媒体运行检测**：新增 `is_media_running()` 函数，通过 psutil 检查已知音乐/视频进程是否运行
- **隐私模式**：新增全局 `_privacy_mode` 标志，启用时将报告内容替换为 `app_id="设备运行"`、`window_title="你猜"`
- **电池信息**：保留 psutil 方式
- **音乐信息**：保留并扩展 AppleScript 方式，支持 Spotify、Apple Music、QQ音乐、网易云音乐
- **菜单栏图标**：使用 `rumps` 库实现 macOS 菜单栏图标，显示在线状态和当前前台应用名
- **菜单栏菜单**：包含"设置"、"隐私模式"开关、"开机自启"开关、"退出"
- **设置 GUI**：使用 tkinter 实现设置窗口，包含服务器URL、Token、上报间隔、心跳间隔、空闲阈值字段
- **开机自启**：管理 `~/Library/LaunchAgents/com.livedashboard.agent.plist`，使用 `launchctl load/unload` 控制启用/禁用
- **日志轮转**：实现 `DailyFileHandler`，按日期分割日志文件，保留 2 天，自动清理过期日志
- **Reporter 类**：多应用 `send()` 方法，匹配 Windows Agent 的 `;;` 分隔格式，指数退避重试
- **URL 安全验证**：HTTPS 始终允许，HTTP 仅限私有网络，使用 `ValidationError` 异常替代 `sys.exit()`
- **配置加载**：`load_config()` 支持多路径查找、必填字段验证、数值范围校验，新增 `idle_threshold_seconds` 字段
- **监控主循环**：对齐 Windows Agent 逻辑：空闲检测 → 前台应用检测 → 变更/心跳判断 → 多应用报告
- **macOS 特有适配**：
  - 后台应用黑名单包含 macOS 系统进程（Dock、Finder、SystemUIServer、loginwindow、WindowServer 等 28 个）
  - 音乐进程映射：Spotify→"Spotify"、Music→"Apple Music"、QQMusic→"QQ音乐"、NeteaseMusic→"网易云音乐"、VLC→"VLC"、IINA→"IINA"
  - 视频进程映射：IINA→"IINA"、VLC→"VLC"
  - 已知后台进程：WeChat、Telegram、Discord、QQ、Feishu、Lark、DingTalk、Skype、Slack、Zoom、Spotify、NeteaseMusic
- **更新** `requirements.txt`：新增 `rumps>=0.4.0`、`Pillow>=9.5.0` 依赖
- **更新** `config.json.example`：新增 `idle_threshold_seconds` 字段

## v1.7.0 - 2026-04-21
### Android Agent 报告后台应用，修复手机端应用从时间轴消失
- **问题**：手机端微信在时间轴上消失，切换到其他应用后不再显示
- **根本原因**：Android Agent 只报告前台应用（`getForegroundApp()` 返回单个应用），而 Windows Agent 同时报告前台和后台应用
  - 当用户从微信切换到哔哩哔哩时，微信不再被报告
  - 后端 `expireStaleAppStates` 把不在当前报告中的应用标记为过期（`last_seen_at` 设为10分钟前）
  - 时间轴的 `runningAppsByDevice` 查询 `last_seen_at > datetime('now', '-5 minutes')`，过期应用不会出现
- **修复**：在 `MonitorService.kt` 中新增 `getBackgroundApps()` 方法
  - 使用 `UsageStatsManager.queryUsageStats()` 查询最近5分钟内活跃的应用
  - 过滤掉前台应用、自身包名、系统应用（launcher、systemui、settings、输入法等）
  - 最多返回10个后台应用，按最近使用时间排序
  - 新增 `BACKGROUND_BLACKLIST` 集合过滤系统应用
- **修改 `performReport()`**：同时报告前台和后台应用
  - 构建 `payloads` 列表，前台应用 `isForeground=true`，后台应用 `isForeground=false`
  - 通知栏显示"运行中 | 上报中: $appId +N后台"
- **后端无需修改**：`report.ts` 已支持多应用报告，`expireStaleAppStates` 只过期不在报告中的应用

### 修复所有布局的同名应用展开状态联动bug（v1.6.2 补充修复）
- **问题**：展开手机端 Edge 时，电脑端的 Edge 也被同时展开
- **原因**：v1.6.2 只修复了 `DefaultLayout.tsx`，但实际使用的是 `InkLayout.tsx` 和 `PersonaLayout.tsx`
- **修复**：将 `InkLayout.tsx` 和 `PersonaLayout.tsx` 中的展开 key 从 `ag.appName` 改为 `${devId}-${ag.appName}` 复合 key
  - `expandedApps.has()`、`toggleApp()`、`itemRefs.current.set()`、`noScrollbarApps.has()` 均使用复合 key

## v1.6.2 - 2026-04-21
### 修复不同设备同名应用展开状态联动bug
- **问题**：展开手机端微信时，电脑端的微信也被同时展开
- **原因**：`expandedApps`、`noScrollbarApps`、`itemRefs` 状态使用 `appName` 作为 key，不同设备的同名应用共享同一个展开状态
- **修复**：将 key 从 `appName` 改为 `${devId}-${appName}` 复合 key，确保每个设备的每个应用有独立的展开状态
  - `toggleApp()` 参数从 `appName` 改为 `key`（复合 key）
  - `expandedApps.has()`、`noScrollbarApps.has()`、`itemRefs.current.set()` 均使用复合 key
  - 音乐/视频区域（`__music__`、`__video__`）不受影响，仍使用全局 key

## v1.6.1 - 2026-04-21
### 修复时间轴运行中应用不显示"现在"的时区问题
- **问题**：正在运行的应用（如 Edge）在时间轴中显示"01:41 – 01:42"而非"01:41 – 现在"
- **根本原因**：`timeline.ts` 中的 `isToday` 检查将真实 UTC 时间与用户本地日期范围比较，未考虑时区偏移
  - 服务器运行在 UTC 时区，当前 UTC 时间为 4月20日 18:40
  - 用户在 UTC+8 时区，本地时间为 4月21日 02:40
  - `targetDateStart` = "2026-04-21T00:00:00" 被解析为 UTC 4月21日 00:00
  - `isToday = (4月20日 18:40 UTC >= 4月21日 00:00 UTC)` = FALSE
  - 由于 `isToday` 为 FALSE，`isAppCurrentlyRunning` 始终为 FALSE，`ended_at` 从未被设为 null
- **修复 1**：`isToday` 检查使用 `loopNowLocal`（将 UTC 当前时间转换为设备本地时间基）进行比较
  - `loopNowLocal = new Date(loopNow.getTime() - tzOffsetMs)`
  - 对于 UTC+8：`loopNowLocal` = UTC 18:40 + 8小时 = 本地 02:40，正确落在 4月21日范围内
- **修复 2**：`deviceLastSeen` 从 UTC 转换为设备本地时间基
  - `device_states.last_seen_at` 以 UTC 存储（由 `toLocalDatetimeStr(new Date())` 生成）
  - 但 `activities.started_at` 以设备本地时间存储
  - 修复：`deviceLastSeen = new Date(deviceOnline.lastSeenAt.getTime() - tzOffsetMs)`
  - 确保 `endedAt` 与 `startedAt` 在同一时间基上
- **修复 3**：将 `tzOffsetMs` 计算提前到设备循环之前，避免在内部循环中重复计算
- **数据库修复**：恢复因 WAL 模式文件损坏导致的数据库损坏，使用 `.dump` + `INSERT OR IGNORE` 恢复 4234 条活动记录

## v1.6.0 - 2026-04-20
### 修复隐私分级双键匹配，扩展 Android 应用支持
- **修复隐私分级双键匹配**：`getPrivacyTier()` 新增可选参数 `appId`，支持同时按应用名称和应用ID匹配隐私分级。当 `appName` 未匹配到分级时，会尝试用 `appId`（如 Android 包名）再次查找
- **修复 `processDisplayTitle()` 传递 appId**：`processDisplayTitle()` 新增可选参数 `appId`，并将其传递给 `getPrivacyTier()`，确保 Android 设备上报时能通过包名正确匹配隐私分级
- **修复 `report.ts` 传递 appId**：在调用 `processDisplayTitle()` 时传入 `appId` 参数，使 Android 上报的包名能参与隐私分级判断
- **新增 Android 包名隐私分级注册**：在 `privacy-tiers.ts` 中新增 12 组 Android 包名分级注册，覆盖：
  - HIDE：消息类（微信、QQ、Telegram、Discord 等）、AI 助手类（ChatGPT、Claude、Gemini 等）、邮箱类、系统类、购物/服务类、社交类、代理类
  - BROWSER：浏览器类（Chrome、Firefox、Edge、Brave、Vivaldi）
  - SHOW：视频类（哔哩哔哩、YouTube）、音乐类（网易云音乐、酷狗、QQ音乐、Spotify）、游戏类（王者荣耀、原神、崩坏等）、IDE 类（Trebedit、AIDE）
- **扩展 Android 应用名称映射**：在 `app-names.json` 的 `android` 部分新增 99 个包名映射，覆盖邮箱、办公、浏览器、出行、美食、教育、应用商店、系统启动器、音乐、视频、阅读、工具等类别

### Windows Agent 效率模式进程检测
- **新增 `_KNOWN_BACKGROUND_PROCESSES` 集合**：包含微信、QQ、Telegram、Discord、飞书、钉钉、Skype、Slack、Teams、Zoom 及常用音乐播放器等 20 个进程名
- **新增 `get_running_background_processes()` 函数**：使用 `psutil.process_iter()` 扫描已知后台进程，即使进程被 Windows 效率模式挂起（无可见窗口）也能检测到
- **修改 `get_background_apps()` 函数**：合并 `EnumWindows` 窗口枚举结果和 `psutil` 进程扫描结果，按 `app_id` 去重

### Android Agent 屏幕亮灭检测与息屏离线
- **ReportPayload.kt**：`ExtraInfo` 数据类新增 `screenOn: Boolean? = null` 字段
- **MonitorService.kt**：新增 `isScreenOn()` 方法，通过 `PowerManager.isInteractive` 检测屏幕是否亮起
- **MonitorService.kt**：`performReport()` 中构建 `ExtraInfo` 时调用 `isScreenOn()` 传入屏幕状态
- **ApiClient.kt**：`report()` 和 `buildCacheJson()` 方法中 `extraObj` 新增 `screen_on` 字段序列化
- **db.ts**：`device_states` 表新增 `screen_on INTEGER DEFAULT 1` 列，CREATE TABLE 和 ALTER TABLE 迁移均已添加
- **db.ts**：`upsertDeviceState` 预编译语句新增 `screen_on` 字段的 INSERT 和 UPDATE
- **db.ts**：`markOfflineDevices` 新增条件：Android 设备 `screen_on = 0` 时标记为离线
- **report.ts**：解析 `body.extra.screen_on`，计算 `screenOnValue`（true→1, false→0, 未提供→1），传入 `upsertDeviceState.run()`
- **types.ts**：`DeviceState` 接口新增 `screen_on?: number` 字段

### 重构 GitHub Actions 工作流，分离构建与发布
- **新建 `release.yml`**：合并 Android + Windows 构建的统一发布工作流
  - 触发条件：`push tags: v*` 或 `workflow_dispatch`（支持手动指定版本号和预发布标记）
  - 三个 Job：`build-android`、`build-windows`（并行）、`create-release`（依赖前两者）
  - Android 构建包含 Keystore 解码、Debug/Release APK 构建、Artifact 上传
  - Windows 构建包含 Python 依赖安装、PyInstaller 打包、Artifact 上传
  - `create-release` 下载所有 Artifact，使用 `ncipollo/release-action` 创建 GitHub Release
  - Release 包含 Debug APK、Release APK、Windows EXE 三个产物
- **修改 `build-android.yml`**：简化为纯测试构建工作流，仅 `workflow_dispatch` 触发，移除 Release 步骤
- **修改 `build-windows.yml`**：简化为纯测试构建工作流，仅 `workflow_dispatch` 触发，移除 Release 步骤

## v1.5.13 - 2026-04-20
### Windows Agent 效率模式进程检测
- 新增 `_KNOWN_BACKGROUND_PROCESSES` 集合，包含已知的后台运行进程名（微信、Telegram、Discord、QQ、飞书、钉钉、Skype、Slack、Teams、Zoom、Spotify、网易云音乐、QQ音乐、酷狗、酷我等）
- 新增 `get_running_background_processes()` 函数，使用 psutil 扫描运行中的进程，查找已知后台应用（可能被 Windows 效率模式隐藏窗口的应用）
- 修改 `get_background_apps()` 函数，在返回结果前合并 psutil 扫描结果，将窗口枚举未发现的后台进程补充到结果列表中

## v1.5.13 - 2026-04-20
### 修复时间轴历史数据消失问题
- **问题**：重建 Docker 容器时使用了错误的 volume 名称（`dashboard_data` 而非 `live-dashboard_dashboard_data`），导致历史数据丢失
- **修复**：从旧 volume 导出数据并合并到当前 volume，恢复 4月18日-19日共 3820 条历史记录
- **修复**：时间轴 `targetDateStart`/`targetDateEnd` 计算移除时区偏移，直接使用日期字符串构建比较范围
  - 原因：`started_at` 存储为设备本地时间字符串，`new Date()` 在 UTC 服务器上解析为 UTC，不应再额外调整时区偏移
- **修复**：报告端点直接解析设备发送的本地时间戳字符串（`"2026;4;20;20:08"` → `"2026-04-20 20:08:00"`），保持与现有数据格式一致
- **客户端改进**：`ApiClient` 在上报请求中添加 `tz` 字段，发送设备时区偏移（UTC+8 为 -480 分钟），为未来时区处理做准备

### 修复 GitHub Actions Release 发布不包含 Release APK
- `Create Release` 步骤的 `artifacts` 字段原来只包含 Debug APK，修复为同时包含 Debug APK 和 Release APK
- 添加 `artifactErrorsFailBuild: false` 避免 glob 匹配失败时阻塞发布

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
