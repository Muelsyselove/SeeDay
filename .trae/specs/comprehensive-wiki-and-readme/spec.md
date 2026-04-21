# 完善项目 Wiki 和 README 文档

## Why

当前项目的 Wiki 和 README 文档虽然已具备基础结构，但存在以下问题：
1. Wiki 目录未使用中文，不符合中文用户的阅读习惯
2. 部署流程不够细致，AI 和新手难以按步骤顺利完成部署
3. 缺少 Agent 下载、安装、配置的详细说明
4. 未明确哪些部分需要部署至服务器，哪些是克隆后多余的文件
5. README 前部缺少引导用户阅读 Wiki 的链接

## What Changes

- **重构 README.md**：在 README 前部添加 Wiki 导航引导，优化文档结构
- **重构 Wiki 目录**：Wiki 文件使用中文命名，目录结构更清晰
- **新增 Wiki 页面**：添加详细的部署流程、Agent 配置说明、文件说明等页面
- **完善部署指南**：编写分步骤的详细部署流程，适合 AI 和新手操作
- **Agent 配置文档**：详细说明 Agent 的下载、安装、配置步骤

## Impact

- 受影响文件：`README.md`
- 受影响 Wiki：所有 `wiki/` 目录下的文件
- 新增 Wiki：`Agent配置指南.md`、`详细部署流程.md`、`文件说明.md` 等

## ADDED Requirements

### Requirement: README Wiki 导航引导

README.md 的前部 SHALL 添加醒目的 Wiki 导航区域，引导用户优先阅读 Wiki 文档。

#### Scenario: 用户打开 README
- **WHEN** 用户打开 README.md
- **THEN** 在简介之后立即看到 Wiki 导航链接

### Requirement: Wiki 中文目录

Wiki 目录 SHALL 使用中文命名，包含以下核心页面：
1. 首页（Home.md）
2. 功能介绍（Features.md）
3. 技术架构（Architecture.md）
4. 部署要求（Requirements.md）
5. 详细部署流程（详细部署流程.md）
6. Agent 配置指南（Agent配置指南.md）
7. 文件说明（文件说明.md）
8. AI 部署教程（AI部署教程.md）

### Requirement: 详细部署流程

部署流程文档 SHALL 包含分步骤的详细指南，确保 AI 和新手都能按步骤完成：

1. **准备阶段**：环境检查、工具安装
2. **服务器部署**：后端 + 前端部署到服务器
3. **Agent 部署**：Windows Agent 安装配置
4. **验证阶段**：检查服务状态、测试连通性

每个步骤 SHALL 包含：
- 前置条件
- 具体命令
- 预期输出
- 常见问题排查

### Requirement: Agent 配置指南

Agent 配置指南文档 SHALL 详细说明：

1. **Agent 下载**：
   - 从 GitHub Release 页面下载预编译版本
   - 或从源码编译
2. **Agent 安装**：
   - Windows Agent 安装步骤
   - 依赖安装
   - 打包为可执行文件
3. **Agent 配置**：
   - config.json 配置项详解
   - 服务器 URL 配置
   - Token 认证配置
   - 上报间隔等参数说明
4. **Agent 运行**：
   - 首次运行向导
   - 系统托盘使用
   - 开机自启设置
   - 日志查看

### Requirement: 文件说明文档

文件说明文档 SHALL 明确区分：

1. **服务器部署必需**：后端代码、前端构建产物、数据库
2. **Agent 端文件**：仅需要运行在客户端的文件
3. **克隆仓库后多余文件**：开发工具配置、IDE 配置、历史日志等

## MODIFIED Requirements

### Requirement: Wiki 文档结构

现有 Wiki 文档 SHALL 根据实际需求进行补充和修改，确保内容准确反映项目当前状态：
- 更新技术架构中的组件说明
- 更新 Agent 支持状态
- 补充实际配置文件示例
