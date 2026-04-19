# SeeDay — 顾日

> 你的个人时间洞察仪表盘

## 简介

**SeeDay（顾日）** 是一个优雅的个人时间洞察仪表盘，帮助你追踪和理解日常的数字活动。通过轻量级的本地代理程序收集应用使用数据，并以美观的可视化界面呈现你的时间分布。

## 致谢

本项目基于 [live-dashboard](https://github.com/Monika-Dream/live-dashboard) 进行二次开发，感谢原作者的开源贡献。

## 功能特性

### 实时活动追踪
- **跨平台 Agent 支持**：
  - ✅ **Windows** — 已支持，可正常使用
  - 🔨 **macOS** — 开发中，敬请期待
  - 🔨 **iOS** — 开发中，敬请期待
  - 🔨 **Android** — 开发中，敬请期待
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

本项目提供基础的隐私处理机制（应用分级过滤、敏感词过滤），但数据会被 Agent 上报到后端服务器。详细隐私说明请见 [Wiki](https://github.com/Muelsyselove/SeeDay/wiki/Features#隐私说明)。

## 项目结构

```
SeeDay/
├── agents/                  # 活动追踪代理
│   ├── windows/            # Windows 代理程序（✅ 已支持）
│   ├── macos/              # macOS 代理程序（🔨 开发中）
│   ├── ios/                # iOS 代理程序（🔨 开发中）
│   └── android/            # Android 代理程序（🔨 开发中）
├── packages/
│   ├── backend/            # 后端服务
│   └── frontend/           # 前端仪表盘
├── deploy/                 # 部署配置
├── docs/                   # 文档资源
└── themes/                 # 主题样式文件
```

## 快速开始

### 前置要求
- Node.js 18+
- Python 3.8+
- SQLite 3

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/Muelsyselove/SeeDay.git
cd SeeDay
```

2. 配置后端
```bash
cd packages/backend
npm install
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

3. 配置前端
```bash
cd ../frontend
npm install
```

4. 安装代理程序
- Windows: `cd agents/windows && install-task.bat`
- macOS: 开发中，敬请期待
- iOS: 开发中，敬请期待
- Android: 开发中，敬请期待

5. 启动服务
```bash
# 后端
cd packages/backend
npm start

# 前端
cd packages/frontend
npm run dev
```

或使用 Docker：
```bash
docker-compose up -d
```

### 配置环境变量

编辑 `.env` 文件：

| 变量 | 必填 | 说明 |
|------|------|------|
| `PORT` | 否 | 服务端口（默认 3000） |
| `AI_API_URL` | 否 | AI API 端点 |
| `AI_API_KEY` | 否 | AI API 密钥 |
| `AI_MODEL` | 否 | AI 模型名称（默认 gpt-4o-mini） |

## 主题系统

SeeDay 支持多种主题风格，你可以在 `themes/` 目录下找到预置的主题：

- **默认主题**：简洁现代的设计
- **水墨主题**：中国传统水墨风格
- **其他主题**：更多精美主题持续添加中

在设置中切换主题，或使用快捷键快速切换。

## 文档

更详细的文档请访问 [项目 Wiki](https://github.com/Muelsyselove/SeeDay/wiki)：

- [功能介绍](https://github.com/Muelsyselove/SeeDay/wiki/Features)
- [技术架构](https://github.com/Muelsyselove/SeeDay/wiki/Architecture)
- [部署要求](https://github.com/Muelsyselove/SeeDay/wiki/Requirements)
- [部署指南](https://github.com/Muelsyselove/SeeDay/wiki/Deployment-Guide)
- [AI 自动部署教程](https://github.com/Muelsyselove/SeeDay/wiki/AI-Deployment)

## 许可证

MIT

---

**SeeDay（顾日）** — 回顾你的每一天
