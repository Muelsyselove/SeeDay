# Agent 配置指南

本文档详细介绍 SeeDay Agent 的下载、安装、配置和运行流程。

## 目录

1. [Agent 下载](#1-agent-下载)
2. [Agent 安装](#2-agent-安装)
3. [Agent 配置](#3-agent-配置)
4. [Agent 运行](#4-agent-运行)
5. [常见问题](#5-常见问题)

---

## 1. Agent 下载

SeeDay Agent 支持多个平台，目前 **Windows 平台已可用**，其他平台开发中。

### 方式一：从 GitHub Release 下载预编译版（推荐）

**适用用户**：不想安装 Python 的用户

**步骤**：

1. 访问 [SeeDay Releases 页面](https://github.com/Muelsyselove/SeeDay/releases)
2. 找到最新的 Release 版本
3. 下载 `Windows-Agent.zip` 或 `live-dashboard-agent.exe` 文件
4. 解压到任意目录，如 `C:\SeeDayAgent\`

**注意事项**：
- Windows Defender 可能会误报，请添加信任
- 预编译版包含了所有依赖，开箱即用

### 方式二：从源码编译

**适用用户**：需要自定义或 Release 未提供预编译版的用户

**前置要求**：
- Python 3.8 或更高版本
- pip 包管理器

**步骤**：

```bash
# 1. 克隆仓库
git clone https://github.com/Muelsyselove/SeeDay.git
cd SeeDay\agents\windows

# 2. 安装依赖
pip install -r requirements.txt

# 3. 运行 build.bat 打包为可执行文件
build.bat
```

**依赖列表**（requirements.txt）：
- `psutil` - 进程和系统信息
- `requests` - HTTP 请求
- `pystray` - 系统托盘
- `Pillow` - 图标绘制

---

## 2. Agent 安装

### 2.1 解压/放置文件

将下载的 Agent 文件解压或移动到目标目录：

```
C:\SeeDayAgent\
├── agent.exe          # 主程序
├── config.json        # 配置文件（需创建）
└── agent_2024-01-01.log  # 日志文件（自动生成）
```

### 2.2 依赖安装（仅源码运行需要）

如果你从源码运行（`python agent.py`），需要先安装依赖：

```bash
pip install psutil requests pystray Pillow
```

---

## 3. Agent 配置

Agent 通过 `config.json` 文件进行配置。首次运行时会弹出设置窗口，也可以手动创建。

### 3.1 config.json 配置详解

在 Agent 目录创建 `config.json`，内容如下：

```json
{
  "server_url": "http://你的服务器IP:3000",
  "token": "你的设备token",
  "interval_seconds": 5,
  "heartbeat_seconds": 60,
  "idle_threshold_seconds": 300
}
```

**各配置项说明**：

| 配置项 | 必填 | 类型 | 范围 | 默认值 | 说明 |
|--------|------|------|------|--------|------|
| `server_url` | 是 | string | - | - | 后端服务器地址，格式 `http://IP:端口` 或 `https://域名` |
| `token` | 是 | string | - | - | 设备认证 Token，来自服务器 `.env` 的 `DEVICE_TOKEN_1` 冒号前部分 |
| `interval_seconds` | 否 | int | 1-300 | 5 | 数据上报间隔（秒）。值越小越精确，但网络请求越多 |
| `heartbeat_seconds` | 否 | int | 10-600 | 60 | 空闲时心跳间隔（秒）。用户离开键盘后发送心跳的频率 |
| `idle_threshold_seconds` | 否 | int | 30-3600 | 300 | 空闲判定阈值（秒）。无键盘/鼠标输入超过此时长视为空闲 |

### 3.2 获取 Token

Token 来自服务器 `.env` 文件的 `DEVICE_TOKEN_1` 配置：

```env
DEVICE_TOKEN_1=abc123def456:my-pc:My PC:windows
              ^^^^^^^^^^^^^^^^
              这部分是 token
```

从冒号分隔的第一个字段提取 token，复制到 `config.json` 的 `token` 字段。

### 3.3 服务器 URL 配置

**本地/局域网服务器**：
```json
"server_url": "http://192.168.1.100:3000"
```

**公网服务器（HTTP）**：
> ⚠️ Agent 会拒绝使用 HTTP 连接公网服务器，这是安全保护措施。

**公网服务器（HTTPS）**：
```json
"server_url": "https://seeday.example.com"
```

### 3.4 多设备配置

如果你需要在多台 Windows 电脑上安装 Agent，需要为每台设备配置不同的 token：

```env
# 服务器 .env
DEVICE_TOKEN_1=token1:pc1:办公电脑:windows
DEVICE_TOKEN_2=token2:pc2:家用电脑:windows
```

分别在两台电脑的 `config.json` 中填入对应 token。

---

## 4. Agent 运行

### 4.1 首次运行

**启动方式一**：双击 `agent.exe`

**启动方式二**：命令行运行
```bash
# 预编译版
.\agent.exe

# 源码版
python agent.py
```

**首次运行流程**：
1. Agent 检测是否存在 `config.json`
2. 如果不存在，自动弹出设置窗口
3. 在设置窗口中填入 `server_url` 和 `token`
4. 点击"保存"
5. Agent 开始运行

### 4.2 系统托盘

Agent 运行后会在 Windows 系统托盘显示图标：

- **绿色圆点**：在线，已连接到服务器
- **灰色圆点**：离线，无法连接服务器

**托盘提示内容**：
```
Live Dashboard Agent
状态: 在线

当前运行的程序:
前台: chrome.exe - Google Chrome
后台: WeChat.exe - 微信
...
```

**右键菜单**：
| 菜单项 | 说明 |
|--------|------|
| 设置 | 打开配置窗口，修改 server_url、token 等 |
| 开机自启 | 切换是否随 Windows 启动 |
| 隐私模式 | 开启后上报"设备运行 / 你猜"，不暴露具体应用 |
| 退出 | 停止 Agent |

### 4.3 开机自启

Agent 支持 Windows 开机自启：

1. 右键托盘图标
2. 点击"开机自启"
3. Agent 会注册到 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
4. 下次开机自动运行

### 4.4 日志查看

Agent 每天生成一个日志文件，存储在 Agent 目录下：

```
agent_2024-01-15.log
agent_2024-01-16.log
...
```

**日志自动清理**：仅保留最近 2 天的日志

**关键日志关键字**：
| 关键字 | 含义 |
|--------|------|
| `Reported N apps` | 成功上报数据 |
| `User idle` | 用户被判定为空闲 |
| `User returned after idle` | 用户回来 |
| `Request failed` | 网络请求失败 |
| `Server returned 401` | Token 认证失败 |
| `config.json not found` | 未找到配置文件 |

---

## 5. 常见问题

### Q: Agent 图标一直是灰色的

**原因**：无法连接到服务器

**排查步骤**：
1. 检查 `config.json` 的 `server_url` 是否正确
2. 确认服务器是否运行中（访问 `http://IP:3000/api/health`）
3. 检查防火墙是否开放端口
4. 查看日志文件中的错误信息

### Q: 日志显示 "Server returned 401"

**原因**：Token 不正确

**解决方法**：
1. 从服务器 `.env` 中确认 `DEVICE_TOKEN_1` 的值
2. 提取冒号前的 token 部分
3. 更新 `config.json` 中的 `token` 字段
4. 重启 Agent

### Q: Agent 无法检测到前台应用

**原因**：权限不足

**解决方法**：
- 确保 Agent 有管理员权限
- 某些全屏应用（如游戏）可能无法检测

### Q: 隐私模式是什么？

**说明**：开启隐私模式后，Agent 上报的应用名称替换为"设备运行"，标题替换为"你猜"，仪表盘上不会显示你的具体活动。适合在共享仪表盘时保护隐私。
