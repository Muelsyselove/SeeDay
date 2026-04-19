# 重构 README 和创建 Wiki 文档

## Why

优化项目的文档结构，将致谢信息提前以体现对原作者的尊重，同时完善 Agent 支持说明。创建详细的 GitHub Wiki 文档，帮助用户更好地了解项目功能、技术实现和部署方式，特别是提供 AI 辅助部署教程降低部署门槛。

## What Changes

- **重构 README.md**：将致谢部分移到最前面，优化 Agent 表述说明支持的平台状态
- **创建 GitHub Wiki**：编写结构化、详细的 Wiki 文档，包含功能介绍、技术架构、部署要求、部署指南、AI 自动部署教程等

## Impact

- 影响文件：`README.md`
- 新增 Wiki 文档：多个 Markdown 文件组成完整的 Wiki 站点
- 提升项目文档的专业性和完整性

## ADDED Requirements

### Requirement: README.md 重构

README.md  SHALL 将致谢部分放在项目简介之后、功能特性之前，以突出对原作者的尊重。Agent 支持说明 SHALL 明确标注各平台的支持状态。

#### Scenario: 致谢前置
- **WHEN** 用户打开 README.md
- **THEN** 在简介之后立即看到致谢信息，然后才是功能特性

#### Scenario: Agent 平台状态说明
- **WHEN** 用户查看 Agent 部分
- **THEN** 清楚看到 Windows（已支持）、macOS（开发中）、iOS（开发中）、Android（开发中）的状态

### Requirement: Wiki 文档结构

Wiki SHALL 包含以下核心页面，结构清晰、内容详细：

1. **Home（首页）**：项目概述和快速导航
2. **功能介绍**：详细的功能特性说明
3. **技术架构**：系统架构、技术栈、组件说明
4. **部署要求**：服务器配置要求
5. **部署指南**：手动部署详细步骤
6. **AI 自动部署教程**：使用不同 AI 工具进行自动部署的指南

#### Scenario: 首页导航
- **WHEN** 用户访问 Wiki
- **THEN** 看到清晰的导航结构，可快速跳转到需要的页面

#### Scenario: AI 部署教程
- **WHEN** 用户使用 AI 工具部署
- **THEN** 可以按照对应 AI 工具的指南完成自动部署

### Requirement: AI 自动部署教程

AI 部署教程 SHALL 包含以下 AI 工具的详细指南：

1. **Claude Code**：使用 Claude 命令行工具进行部署
2. **GitHub Copilot Chat**：使用 VS Code 中的 Copilot 进行部署
3. **Trae AI**：使用 Trae IDE 进行部署
4. **Codex CLI**：使用 OpenAI Codex 命令行工具进行部署

每个指南 SHALL 包含：
- 工具安装说明
- 前置准备
- 具体操作步骤
- 常见问题排查

## MODIFIED Requirements

### Requirement: Agent 支持说明

原 README 中关于 Agent 的描述 SHALL 更新为明确的支持状态：

- **Windows Agent**：✅ 已支持，可正常使用
- **macOS Agent**：🔨 开发中，敬请期待
- **iOS Agent**：🔨 开发中，敬请期待
- **Android Agent**：🔨 开发中，敬请期待
