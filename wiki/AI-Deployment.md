# AI 自动部署教程

本文档详细介绍如何使用不同的 AI 辅助编程工具来自动部署 SeeDay 项目。使用 AI 工具可以大幅降低部署门槛，让没有太多技术经验的用户也能顺利完成部署。

## 概述

AI 辅助部署的核心思路是：将部署任务描述给 AI 工具，让 AI 自动生成配置、执行命令、排查问题。不同 AI 工具的使用方式略有不同，但基本流程相似。

### 通用准备工作

无论使用哪种 AI 工具，都需要准备以下信息：

1. **服务器信息**
   - 服务器 IP 地址
   - SSH 登录凭证（用户名和密码/密钥）
   - 操作系统类型和版本

2. **项目信息**
   - 项目地址：`https://github.com/Muelsyselove/SeeDay`
   - 部署方式：Docker（推荐）或手动部署

3. **配置信息**
   - 域名（可选）
   - 设备 Token（可让 AI 生成）
   - AI API 密钥（如需使用 AI 每日总结功能）

---

## Claude Code 部署指南

### 工具介绍

[Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) 是 Anthropic 推出的命令行 AI 编程工具，可以直接在终端中与 Claude 交互，执行代码和部署任务。

### 安装

```bash
# 使用 npm 安装
npm install -g @anthropic-ai/claude-code

# 或使用 Homebrew（macOS）
brew install claude-code

# 验证安装
claude --version
```

### 配置

```bash
# 设置 API 密钥
export ANTHROPIC_API_KEY=your-api-key

# 或写入配置文件
echo 'ANTHROPIC_API_KEY=your-api-key' >> ~/.bashrc
source ~/.bashrc
```

### 部署步骤

#### 1. 启动 Claude Code

```bash
# 连接到服务器后启动
claude
```

#### 2. 输入部署指令

向 Claude Code 发送以下指令：

```
请帮我部署 SeeDay 项目。项目地址：https://github.com/Muelsyselove/SeeDay

具体要求：
1. 检查并安装 Docker 和 Docker Compose
2. 克隆项目源码
3. 生成必要的密钥（HASH_SECRET 和 DEVICE_TOKEN）
4. 配置 docker-compose.yml
5. 启动服务
6. 配置 Nginx 反向代理（如有域名）
7. 配置 HTTPS（使用 Let's Encrypt）

服务器信息：
- 操作系统：Ubuntu 22.04
- 域名：see.yourdomain.com（如无则跳过域名相关配置）
```

#### 3. 跟随 AI 执行

Claude Code 会逐步执行以下操作：

1. 检查系统环境
2. 安装 Docker
3. 克隆代码
4. 生成配置
5. 启动服务
6. 验证部署

#### 4. 问题排查

如果遇到问题，可以告诉 Claude：

```
部署过程中遇到了错误：[粘贴错误信息]
请帮我排查并修复。
```

### 完整示例对话

```
你: 请帮我在这台服务器上部署 SeeDay 项目

Claude: 好的，我先检查系统环境...
        检测到 Ubuntu 22.04，Docker 未安装。
        正在安装 Docker...
        [执行命令]
        Docker 安装完成。
        
        正在克隆 SeeDay 项目...
        [执行命令]
        项目克隆完成。
        
        正在生成配置...
        [生成 docker-compose.yml 和 .env]
        
        正在启动服务...
        [执行 docker-compose up -d]
        
        部署完成！访问 http://your-server-ip:3000 查看仪表盘。
```

---

## GitHub Copilot Chat 部署指南

### 工具介绍

[GitHub Copilot Chat](https://docs.github.com/en/copilot/copilot-chat) 是集成在 VS Code 中的 AI 编程助手，可以直接在编辑器中与 AI 对话。

### 安装

1. 安装 [VS Code](https://code.visualstudio.com/)
2. 在扩展商店搜索并安装 **GitHub Copilot** 和 **GitHub Copilot Chat**
3. 登录 GitHub 账号（需要 Copilot 订阅）

### 部署步骤

#### 1. 打开远程服务器

使用 VS Code 的 Remote-SSH 扩展连接服务器：

1. 安装 **Remote - SSH** 扩展
2. 按 `Ctrl+Shift+P`，选择 "Remote-SSH: Connect to Host"
3. 输入服务器信息连接

#### 2. 打开 Copilot Chat

按 `Ctrl+Shift+I` 打开 Copilot Chat 面板。

#### 3. 输入部署指令

```
我是新手，请帮我一步步部署 SeeDay 项目。

项目信息：
- GitHub: https://github.com/Muelsyselove/SeeDay
- 推荐使用 Docker 部署

请：
1. 先检查当前环境是否满足要求
2. 逐步执行部署命令
3. 每步都解释做了什么
4. 如果遇到问题请帮我排查
```

#### 4. 执行命令

Copilot 会给出详细的命令，你可以：

- 直接在终端中执行
- 让 Copilot 帮你执行（如果开启了相关功能）
- 复制命令到终端运行

#### 5. 使用 Copilot 的代码建议

当编辑配置文件时，Copilot 会自动给出建议：

- 编辑 `docker-compose.yml` 时，Copilot 会补全配置
- 编辑 `.env` 时，Copilot 会建议安全的密钥格式

### 技巧

- 使用 `@workspace` 引用当前工作区
- 使用 `@terminal` 引用终端输出
- 使用 `/explain` 让 Copilot 解释命令的作用
- 使用 `/fix` 让 Copilot 修复错误

---

## Trae AI 部署指南

### 工具介绍

[Trae](https://trae.ai/) 是一款 AI 驱动的 IDE，集成了代码生成、解释和自动执行功能。

### 安装

1. 从 [Trae 官网](https://trae.ai/) 下载安装包
2. 安装并启动 Trae IDE
3. 登录账号

### 部署步骤

#### 1. 创建远程项目

1. 打开 Trae IDE
2. 选择 "Remote Development"
3. 连接到目标服务器

#### 2. 克隆项目

```bash
git clone https://github.com/Muelsyselove/SeeDay.git
cd SeeDay
```

#### 3. 使用 AI 助手

打开 Trae 的 AI 助手（通常在右侧边栏），输入：

```
请帮我部署这个 SeeDay 项目到当前服务器。

要求：
1. 使用 Docker 部署
2. 检查并安装必要的依赖
3. 生成安全的配置文件
4. 启动服务并验证
5. 如果可能的话，配置 HTTPS

服务器环境：Ubuntu 22.04
```

#### 4. 执行 AI 生成的命令

Trae 会生成一系列部署命令，你可以：

- 一键执行所有命令
- 逐步审查并执行
- 在执行前让 AI 解释每个命令的作用

#### 5. 使用 Trae 的自动配置

Trae 可以自动生成配置文件：

1. 创建 `.env` 文件时，AI 会自动填充安全的随机密钥
2. 创建 `docker-compose.yml` 时，AI 会根据项目结构自动生成

### Trae 特有功能

- **智能补全**：编辑配置文件时自动补全
- **一键部署**：生成完整的部署脚本
- **错误诊断**：自动分析错误日志并给出修复建议

---

## Codex CLI 部署指南

### 工具介绍

[Codex CLI](https://github.com/openai/codex) 是 OpenAI 推出的命令行 AI 编程工具，可以通过自然语言指令执行代码任务。

### 安装

```bash
# 安装 Codex CLI
pip install codex-cli

# 或使用 npm
npm install -g @openai/codex

# 配置 API 密钥
export OPENAI_API_KEY=your-api-key
```

### 部署步骤

#### 1. 启动 Codex

```bash
codex
```

#### 2. 输入部署指令

```
请帮我部署 SeeDay 项目。

项目地址：https://github.com/Muelsyselove/SeeDay

执行以下步骤：
1. 检查系统是否已安装 Docker 和 Docker Compose，如未安装则安装
2. 克隆项目到 /opt/seeday 目录
3. 生成 HASH_SECRET 和 DEVICE_TOKEN
4. 创建 docker-compose.yml 配置文件
5. 启动 Docker 服务
6. 验证服务是否正常运行
7. 输出访问地址

服务器信息：
- OS: Ubuntu 22.04
- 内存: 4GB
- CPU: 2核
```

#### 3. 监控执行

Codex 会逐步执行命令并显示输出。如果遇到问题，可以：

```
上面的命令报错了：[粘贴错误]
请帮我修复。
```

### 自动化脚本

让 Codex 生成完整的部署脚本：

```
请生成一个完整的 bash 部署脚本，包括：
1. 系统检查
2. Docker 安装
3. 项目部署
4. 服务验证

保存到 deploy-seeday.sh 文件。
```

然后执行生成的脚本：

```bash
chmod +x deploy-seeday.sh
./deploy-seeday.sh
```

---

## 通用 AI 部署指南模板

无论使用哪种 AI 工具，都可以参考以下模板来描述部署任务：

### 标准部署指令模板

```
请帮我部署 SeeDay 项目。

## 项目信息
- 项目名称：SeeDay（顾日）
- GitHub 地址：https://github.com/Muelsyselove/SeeDay
- 项目类型：个人时间追踪仪表盘

## 部署方式
推荐使用 Docker 部署，参考项目的 docker-compose.yml 配置。

## 服务器环境
- 操作系统：[填写你的系统，如 Ubuntu 22.04]
- CPU：[填写 CPU 核数，如 2核]
- 内存：[填写内存大小，如 4GB]
- 存储：[填写存储空间，如 60GB]

## 部署要求
1. 安装 Docker 和 Docker Compose（如未安装）
2. 克隆项目源码
3. 生成安全的密钥（HASH_SECRET 和 DEVICE_TOKEN）
4. 配置 docker-compose.yml
5. 启动服务
6. [可选] 配置 Nginx 反向代理
7. [可选] 配置 HTTPS（使用 Let's Encrypt）

## 验证要求
部署完成后，请：
1. 检查服务是否正常运行
2. 测试 API 端点是否可访问
3. 输出访问地址和后续配置说明
```

### 故障排查指令模板

```
部署遇到了问题，请帮我排查。

## 错误信息
[粘贴完整的错误日志]

## 当前状态
- 已执行的步骤：[列出已经做了什么]
- 当前卡住的步骤：[描述卡在哪里]
- 系统信息：[uname -a 的输出]

## 请求
请分析错误原因并给出具体的修复步骤。
```

---

## 常见问题

### Q: AI 工具执行失败了怎么办？

A: 将错误信息完整地复制给 AI，让它分析原因并提供修复方案。AI 通常能够准确诊断问题。

### Q: 使用 AI 部署安全吗？

A: AI 工具执行的都是公开的标准部署命令，不会产生安全问题。但建议：
- 审查 AI 生成的配置，确认没有敏感信息泄露
- 使用强密码和密钥
- 定期检查服务器安全

### Q: AI 生成的配置可以复用吗？

A: 可以。AI 生成的配置文件可以保存下来作为模板，下次部署时直接使用。

### Q: 如何选择适合的 AI 工具？

| 工具 | 适合场景 | 门槛 |
|------|---------|------|
| Claude Code | 命令行操作，快速部署 | 低 |
| GitHub Copilot Chat | VS Code 用户，需要代码编辑 | 中 |
| Trae AI | 需要图形界面和智能补全 | 低 |
| Codex CLI | OpenAI 生态用户，脚本生成 | 中 |

### Q: 部署后如何管理？

部署完成后，可以使用 AI 工具帮你：
- 查看服务状态
- 重启服务
- 更新配置
- 查看日志
- 备份数据
