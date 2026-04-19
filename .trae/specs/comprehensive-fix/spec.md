# 综合修复 Spec

## Why
过去的数据因逻辑错误导致显示异常，媒体栏只显示程序名而非实际歌曲/视频标题，Windows 客户端存在多个已知 bug（开机自启失败、设置窗口无法关闭、日志无清理、上报了无窗口后台应用），系统需要全面审计和修复。

## What Changes
- **BREAKING**: 清空所有旧数据（activities、device_states、device_app_states、daily_summaries）
- 前端媒体使用栏改为显示实际歌曲/视频标题，而非仅显示应用名
- 扩展音视频应用识别列表（前端 MUSIC_APPS/VIDEO_APPS、后端 privacy-tiers.ts、客户端 _MUSIC_PROCESS_MAP）
- 修复 Windows 客户端开机自启功能（PyInstaller 冻结 exe 的路径问题 + config.json 查找路径）
- 修复 Windows 客户端设置窗口无法关闭（validate_server_url 调用 sys.exit 导致进程退出 + Tk 多实例问题）
- 实现日志按天分割和自动清理（保留 2 天）
- 过滤无窗口后台应用（PowerToys.QuickAccess、Nahimic3 等），保留音视频应用
- 系统审计修复

## Impact
- Affected code:
  - `packages/backend/src/db.ts` — 数据清空
  - `packages/frontend/app/page.tsx` — 媒体栏显示逻辑
  - `packages/backend/src/services/privacy-tiers.ts` — 扩展音视频应用列表
  - `agents/windows/agent.py` — 自启修复、设置窗口修复、日志清理、后台应用过滤
  - `packages/backend/src/routes/report.ts` — 后台应用过滤
  - `packages/backend/src/services/app-mapper.ts` / `app-names.json` — 新增应用名映射

## ADDED Requirements

### Requirement: 清空旧数据
系统 SHALL 提供一次性数据清空功能，删除 activities、device_states、device_app_states、daily_summaries 表中的所有数据。

#### Scenario: 清空旧数据
- **WHEN** 执行数据清空操作
- **THEN** 所有旧的活动记录、设备状态、设备应用状态和每日摘要被删除，数据库表结构保持不变

### Requirement: 媒体栏显示实际内容
前端媒体使用栏 SHALL 显示用户实际听过的歌曲和看过的视频标题，而非仅显示应用名称。

#### Scenario: 显示歌曲列表
- **WHEN** 用户在当天使用了音乐应用
- **THEN** 媒体栏显示每首歌曲的标题和累计收听时长，而非仅显示"QQ音乐 - 30m"

#### Scenario: 显示视频列表
- **WHEN** 用户在当天使用了视频应用
- **THEN** 媒体栏显示每个视频的标题和累计观看时长，而非仅显示"哔哩哔哩 - 45m"

### Requirement: 扩展音视频应用识别
系统 SHALL 兼容更多音视频软件，不局限于哔哩哔哩和 QQ 音乐。

#### Scenario: 识别更多音乐应用
- **WHEN** 用户使用 MediaMonkey、Winamp、Tidal、Deezer、SoundCloud 等音乐应用
- **THEN** 系统正确识别并将其归类为音乐应用

#### Scenario: 识别更多视频应用
- **WHEN** 用户使用 MPC-HC、KMPlayer、Hulu、Apple TV+ 等视频应用
- **THEN** 系统正确识别并将其归类为视频应用

### Requirement: 修复开机自启
Windows 客户端 SHALL 在开机时自动启动且不报错。

#### Scenario: PyInstaller 冻结 exe 开机自启
- **WHEN** 用户启用开机自启后重启电脑
- **THEN** 客户端自动启动且能正确找到 config.json，不显示报错弹窗

### Requirement: 修复设置窗口关闭
Windows 客户端设置窗口 SHALL 能正常关闭。

#### Scenario: 点击保存关闭设置
- **WHEN** 用户在设置窗口点击保存按钮
- **THEN** 设置窗口正常关闭，不导致整个进程退出

#### Scenario: 点击叉号关闭设置
- **WHEN** 用户点击设置窗口的关闭按钮
- **THEN** 设置窗口正常关闭

### Requirement: 日志按天分割和自动清理
Windows 客户端 SHALL 每天生成一个日志文件，并自动删除超过 2 天的日志。

#### Scenario: 日志文件按天分割
- **WHEN** 日期变更时
- **THEN** 创建新的日志文件（格式 agent_YYYY-MM-DD.log），后续日志写入新文件

#### Scenario: 自动清理过期日志
- **WHEN** 客户端启动或日期变更时
- **THEN** 删除超过 2 天的日志文件

### Requirement: 过滤无窗口后台应用
Windows 客户端 SHALL 不上报无实际窗口内容的后台应用（如 PowerToys.QuickAccess、Nahimic3），但保留音视频应用。

#### Scenario: 过滤系统托盘应用
- **WHEN** PowerToys.QuickAccess 等系统工具作为后台窗口被检测到
- **THEN** 不上报该应用信息

#### Scenario: 保留音视频后台应用
- **WHEN** Spotify 等音乐应用在后台运行
- **THEN** 仍然上报该应用信息

## MODIFIED Requirements

### Requirement: 前端媒体使用栏
原：显示音乐/视频应用名称和总时长
改：显示每首歌曲/每个视频的标题和累计时长，按时长降序排列

## REMOVED Requirements

### Requirement: 媒体栏按应用名聚合显示
**Reason**: 用户需要看到实际听过的歌和看过的视频，而非仅看应用名
**Migration**: 改为按 display_title 聚合显示

---

## 详细分析和修复方案

### 1. 开机自启失败根因分析

**根因**: PyInstaller 冻结 exe 从注册表 Run 键启动时，工作目录为 `C:\Windows\System32`，而非 exe 所在目录。`load_config()` 先查找 `Path(".").resolve() / "config.json"`（即 `C:\Windows\System32\config.json`），找不到后回退到 `Path(__file__).with_name("config.json")`，但 PyInstaller 冻结模式下 `__file__` 指向临时解压目录，也找不到 config.json。

**修复方案**:
1. 在 `load_config()` 中增加 PyInstaller 冻结模式的路径检测：`getattr(sys, '_MEIPASS', None)` 时使用 `Path(sys.executable).parent / "config.json"`
2. 在 `toggle_startup()` 中，注册表值改为包含工作目录的完整命令：`"\"{exe_path}\""` 并确保工作目录正确
3. 添加 `get_app_dir()` 辅助函数统一获取应用目录

### 2. 设置窗口无法关闭根因分析

**根因**: `validate_server_url()` 在验证失败时调用 `sys.exit(1)`，这会终止整个进程（包括系统托盘和监控线程）。虽然 `save_config()` 捕获了 `SystemExit`，但 `load_config()` 在设置窗口初始化时也调用了 `validate_server_url()`，此时 `SystemExit` 未被捕获。

此外，`show_settings()` 每次调用都创建新的 `tk.Tk()` 实例，但 Tkinter 通常只允许一个 `Tk()` 实例。多次创建可能导致窗口管理混乱。

**修复方案**:
1. 将 `validate_server_url()` 中的 `sys.exit(1)` 改为抛出自定义异常 `ValidationError`
2. 在 `load_config()` 和 `save_config()` 中捕获 `ValidationError`
3. 将设置窗口改为使用 `tk.Toplevel`，维护全局 `Tk()` 实例

### 3. 无窗口后台应用过滤

**分析**: `get_background_apps()` 使用 `EnumWindows` + `IsWindowVisible` 枚举所有可见窗口。某些系统工具（如 PowerToys.QuickAccess、Nahimic3、Microsoft.CmdPal.UI）虽然创建了可见窗口，但它们是系统辅助工具，不属于用户主动使用的应用。

**修复方案**:
1. 在客户端添加已知系统工具黑名单，过滤这些进程
2. 检查窗口尺寸，过滤极小窗口（宽或高 < 50 像素），这类通常是托盘弹窗或辅助窗口
3. 音视频应用即使在后台也保留上报

### 4. 系统审计发现

- **后端 report.ts**: `upsertDeviceAppState` 的唯一约束是 `(device_id, app_id)`，当同一设备同一应用从后台切换到前台时，旧的后台记录会被覆盖，丢失前后台状态变化信息。但这是设计选择，不是 bug。
- **后端 timeline.ts**: 跨天查询范围 `datetime(?, '-2 days')` 到 `datetime(?, '+1 day')` 可能包含过多无关数据，但为了正确性这是必要的。
- **前端 page.tsx**: `musicVideoStats` 的 `aggregatedMedia` 已经按 `display_title` 聚合，但左侧面板的媒体栏仍然只显示应用名。需要统一。
