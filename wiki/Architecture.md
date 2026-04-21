# 技术架构

## 系统概述

SeeDay 采用前后端分离架构，由以下核心组件组成：

```
┌─────────────────────────────────────────────────────────────┐
│                        SeeDay 系统架构                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Windows  │    │  macOS   │    │   其他   │  Agent 层    │
│  │  Agent   │    │  Agent   │    │  Agent   │              │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘              │
│       │               │               │                     │
│       └───────────────┴───────────────┘                     │
│                       │                                     │
│                  HTTP API                                   │
│                       │                                     │
│       ┌───────────────┴───────────────┐                     │
│       │                               │                     │
│  ┌────▼─────┐                  ┌──────▼──────┐             │
│  │          │                  │             │  后端层     │
│  │  Backend │◄────────────────►│   SQLite    │             │
│  │  (Bun)   │                  │   Database  │             │
│  │          │                  │             │             │
│  └────┬─────                  └─────────────             │
│       │                                                     │
│       │ REST API                                            │
│       │                                                     │
│  ┌────▼─────┐                                              │
│  │          │                                              │
│  │ Frontend │  前端层                                       │
│  │ (Next.js)│                                              │
│  │          │                                              │
│  └──────────┘                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 技术栈

### 后端

| 组件 | 技术 | 说明 |
|------|------|------|
| 运行时 | [Bun](https://bun.sh/) | 高性能 JavaScript 运行时 |
| 语言 | TypeScript | 类型安全的 JavaScript 超集 |
| 数据库 | SQLite | 轻量级嵌入式数据库 |
| Web 框架 | 原生 Bun HTTP | 轻量级 HTTP 服务 |

### 前端

| 组件 | 技术 | 说明 |
|------|------|------|
| 框架 | [Next.js 15](https://nextjs.org/) | React 全栈框架 |
| UI 库 | [React 19](https://react.dev/) | 前端 UI 库 |
| 样式 | [Tailwind CSS 4](https://tailwindcss.com/) | 实用优先 CSS 框架 |
| 构建 | 静态导出 | 纯静态站点，无需服务端渲染 |

### Windows Agent

| 组件 | 技术 | 说明 |
|------|------|------|
| 语言 | Python 3.8+ | 跨平台脚本语言 |
| 窗口检测 | Win32 API | Windows 原生 API |
| 系统托盘 | pystray | 跨平台系统托盘库 |
| 音频检测 | pycaw | Windows 音频控制 API |
| 进程信息 | psutil | 跨平台进程工具 |
| 打包 | PyInstaller | Python 应用打包工具 |

### macOS Agent（开发中）

| 组件 | 技术 | 说明 |
|------|------|------|
| 语言 | Python 3.8+ | 跨平台脚本语言 |
| 窗口检测 | AppleScript | macOS 自动化脚本 |
| 系统托盘 | pystray | 跨平台系统托盘库 |

## 数据流转

### 活动数据上报流程

```
1. Agent 检测前台应用
       │
       ▼
2. 应用名称映射（app-names.json）
       │
       ▼
3. 隐私级别检查（SHOW/BROWSER/HIDE）
       │
       ▼
4. NSFW 内容过滤
       │
       ▼
5. HTTP POST 到后端 API
       │
       ▼
6. 后端验证 Token
       │
       ▼
7. 写入 SQLite 数据库
       │
       ▼
8. 前端轮询/获取数据
       │
       ▼
9. 渲染到仪表盘
```

### API 接口设计

#### 认证方式

所有 Agent 请求使用 Token 认证：
```
Authorization: Bearer <DEVICE_TOKEN>
```

#### 核心端点

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/report` | POST | 上报活动数据 | 需要 |
| `/api/current` | GET | 获取当前活动 | 可选 |
| `/api/timeline` | GET | 获取时间线 | 可选 |
| `/api/daily-summary` | GET | 获取每日总结 | 可选 |
| `/api/health` | GET | 健康检查 | 无需 |

#### 数据模型

**活动记录表（activities）**
```sql
CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    app_name TEXT NOT NULL,
    app_description TEXT,
    is_foreground INTEGER DEFAULT 1,
    privacy_level TEXT DEFAULT 'SHOW',
    start_time TEXT NOT NULL,
    end_time TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**每日总结表（daily_summaries）**
```sql
CREATE TABLE daily_summaries (
    date TEXT PRIMARY KEY,
    summary TEXT NOT NULL,
    generated_at TEXT NOT NULL
);
```

**设备表（devices）**
```sql
CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    token TEXT NOT NULL,
    last_seen TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## 项目结构

```
SeeDay/
├── agents/                     # Agent 程序
│   ├── windows/               # Windows Agent
│   │   ├── agent.py           # 主程序
│   │   ├── requirements.txt   # Python 依赖
│   │   └── build.bat          # 构建脚本
│   └── macos/                 # macOS Agent
│       ├── agent.py
│       └── requirements.txt
├── packages/
│   ├── backend/               # 后端服务
│   │   ├── src/
│   │   │   ├── index.ts       # 入口文件
│   │   │   ├── db.ts          # 数据库操作
│   │   │   ├── types.ts       # 类型定义
│   │   │   ├── routes/        # API 路由
│   │   │   ├── services/      # 业务逻辑
│   │   │   └── middleware/    # 中间件
│   │   └── package.json
│   └── frontend/              # 前端应用
│       ├── app/               # Next.js App Router
│       ├── src/
│       │   ├── components/    # React 组件
│       │   ├── hooks/         # 自定义 Hooks
│       │   ├── layouts/       # 布局组件
│       │   └── lib/           # 工具库
│       └── themes/            # 主题文件
├── deploy/                    # 部署配置
│   └── nginx/                 # Nginx 配置
├── docs/                      # 文档资源
├── .github/
│   └── workflows/             # GitHub Actions
└── wiki/                      # Wiki 文档
```

## 核心服务

### 应用名称映射服务（app-mapper）

将应用程序路径/名称映射为人类可读的名称。

### 隐私分级服务（privacy-tiers）

根据应用名称匹配，将内容分为 SHOW / BROWSER / HIDE 三级。注意：此服务基于应用名称的简单匹配，并非真正的隐私保护机制，可能被绕过。

### NSFW 过滤服务（nsfw-filter）

基于预定义的敏感词列表，过滤不适当的内容。关键词列表由人工维护，覆盖有限。

### 每日总结生成服务（daily-summary-gen）

定时任务，每晚 21:00 汇总活动数据并调用 AI 生成总结。

### 数据清理服务（cleanup）

定期清理过期数据，保持数据库整洁。
