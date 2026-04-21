# AI 部署教程

本文档介绍如何使用 AI 辅助编程工具来自动部署 SeeDay 项目。

## 概述

AI 辅助部署的核心思路：将部署任务描述给 AI 工具，让 AI 自动生成配置、执行命令、排查问题。

### 通用准备工作

无论使用哪种 AI 工具，都需要准备：

1. **服务器信息**
   - 服务器 IP 地址
   - SSH 登录凭证
   - 操作系统版本

2. **项目信息**
   - 仓库地址：`https://github.com/Muelsyselove/SeeDay`
   - 部署方式：Docker（推荐）

3. **配置信息**
   - 域名（可选）
   - AI API 密钥（可选）

---

## Claude Code 部署

### 安装

```bash
npm install -g @anthropic-ai/claude-code
```

### 部署步骤

1. SSH 连接到服务器
2. 启动 Claude Code：`claude`
3. 输入部署指令：

```
请帮我部署 SeeDay 项目。
项目地址：https://github.com/Muelsyselove/SeeDay

要求：
1. 检查并安装 Docker
2. 生成 HASH_SECRET 和 DEVICE_TOKEN
3. 创建 .env 和 docker-compose.yml
4. 启动服务
5. 验证部署
```

---

## GitHub Copilot Chat 部署

### 安装

1. 安装 VS Code
2. 安装 GitHub Copilot 扩展
3. 使用 Remote-SSH 连接服务器

### 部署步骤

1. 在 VS Code 中打开项目
2. 按 `Ctrl+Shift+I` 打开 Copilot Chat
3. 输入：

```
请帮我一步步部署 SeeDay 项目。
使用 Docker 部署，每步都解释做了什么。
```

---

## Trae AI 部署

### 安装

1. 从 [trae.ai](https://trae.ai/) 下载并安装
2. 使用 Remote Development 连接服务器

### 部署步骤

1. 打开 Trae IDE
2. 克隆项目：`git clone https://github.com/Muelsyselove/SeeDay.git`
3. 打开 AI 助手，输入：

```
请帮我部署 SeeDay 项目到当前服务器。
使用 Docker 部署，检查依赖，生成配置，启动服务。
```

---

## 标准部署指令模板

可复制到任意 AI 工具使用：

```
请帮我部署 SeeDay 项目。

## 项目信息
- GitHub: https://github.com/Muelsyselove/SeeDay
- 类型：个人时间追踪仪表盘
- 推荐部署：Docker

## 服务器环境
- OS: Ubuntu 22.04
- 内存: 4GB

## 要求
1. 安装 Docker
2. 生成密钥（HASH_SECRET 和 DEVICE_TOKEN）
3. 配置 docker-compose.yml 和 .env
4. 启动服务
5. 验证 API 和 Web 界面
```
