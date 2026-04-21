# SeeDay — 顾日

> 你的个人时间洞察仪表盘

## 简介

**SeeDay（顾日）** 是一个优雅的个人时间洞察仪表盘，帮助你追踪和理解日常的数字活动。通过轻量级的本地代理程序收集应用使用数据，并以美观的可视化界面呈现你的时间分布。

## 致谢

本项目基于 [live-dashboard](https://github.com/Monika-Dream/live-dashboard) 进行二次开发，感谢原作者的开源贡献。

## 📚 文档导航

> **强烈建议新用户先阅读 Wiki 文档**，了解项目架构、部署流程和 Agent 配置后再开始使用。

| 文档 | 说明 |
|------|------|
| [功能介绍](https://github.com/Muelsyselove/SeeDay/wiki/功能介绍) | 了解 SeeDay 的所有核心功能 |
| [技术架构](https://github.com/Muelsyselove/SeeDay/wiki/技术架构) | 系统架构、技术栈和组件说明 |
| [部署要求](https://github.com/Muelsyselove/SeeDay/wiki/部署要求) | 服务器配置和系统环境要求 |
| [详细部署流程](https://github.com/Muelsyselove/SeeDay/wiki/详细部署流程) | 分步部署指南，适合 AI 和新手 |
| [Agent 配置指南](https://github.com/Muelsyselove/SeeDay/wiki/Agent配置指南) | Agent 下载、安装、配置详解 |
| [文件说明](https://github.com/Muelsyselove/SeeDay/wiki/文件说明) | 哪些文件需要部署，哪些可以忽略 |
| [AI 部署教程](https://github.com/Muelsyselove/SeeDay/wiki/AI部署教程) | 使用 AI 工具进行自动部署 |

---

## 功能特性

### 实时活动追踪
- **跨平台 Agent 支持**：
  - ✅ **Windows** — 已支持，可正常使用
  - ✅ **Android** — 已支持，可正常使用
  - 🧪 **macOS** — 测试中，已创建
  - 🧪 **iOS** — 测试中，已创建
- 自动检测当前活动的应用
- 实时更新活动状态

### 可视化仪表盘
- 精美的可视化界面
- 支持多种主题风格
  - 默认主题
  - 水墨国风主题
  - 个性化定制主题
- 时间线展示每日活动轨迹
- 应用使用统计图表

### AI 每日总结
- 每晚自动生成当日总结
- 支持多种 AI 提供商（OpenAI / Claude / DeepSeek / Ollama）
- 简洁的中文摘要回顾

### 隐私说明

本项目提供基础的隐私处理机制（应用分级过滤、敏感词过滤），但数据会被 Agent 上报到后端服务器。详细隐私说明请见 [Wiki 功能介绍](https://github.com/Muelsyselove/SeeDay/wiki/功能介绍#隐私说明)。

## 项目结构

```
SeeDay/
├── agents/                  # 活动追踪代理（客户端使用）
│   ├── windows/            # Windows 代理程序（✅ 已支持）
│   ├── macos/              # macOS 代理程序（🔨 开发中）
│   └── android-agent/      # Android 代理程序（🔨 开发中）
├── packages/
│   ├── backend/            # 后端服务（Bun + TypeScript）
│   └── frontend/           # 前端仪表盘（Next.js + React）
├── Dockerfile              # Docker 镜像构建
├── docker-compose.yml      # Docker 编排配置
├── data/                   # SQLite 数据存储
└── wiki/                   # Wiki 文档
```

## 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/Muelsyselove/SeeDay.git
cd SeeDay

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置 HASH_SECRET 和 DEVICE_TOKEN

# 3. 启动服务
docker compose up -d
```

详细部署流程请参考：[详细部署流程 Wiki](https://github.com/Muelsyselove/SeeDay/wiki/详细部署流程)

### 方式二：手动部署

```bash
# 1. 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 2. 配置后端
cd packages/backend
bun install
cp .env.example .env

# 3. 构建前端
cd ../frontend
bun install
bun run build

# 4. 启动后端
cd ../backend
bun run src/index.ts
```

### 安装 Agent

Windows Agent 配置请参考：[Agent 配置指南 Wiki](https://github.com/Muelsyselove/SeeDay/wiki/Agent配置指南)

### 配置环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `HASH_SECRET` | 是 | 哈希密钥，使用 `openssl rand -hex 32` 生成 |
| `DEVICE_TOKEN_1` | 是 | 设备 Token，格式：`token:id:name:platform` |
| `AI_API_URL` | 否 | AI API 端点 |
| `AI_API_KEY` | 否 | AI API 密钥 |
| `AI_MODEL` | 否 | AI 模型名称（默认 gpt-4o-mini） |

## 许可证

MIT

---

**SeeDay（顾日）** — 回顾你的每一天
