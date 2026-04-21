# Tasks

- [x] Task 1: 编写 Wiki 首页（Home.md）和 Wiki 索引结构
  - [x] SubTask 1.1: 更新 Home.md，添加中文 Wiki 导航结构
  - [x] SubTask 1.2: 更新 README.md，在简介后添加 Wiki 导航引导

- [x] Task 2: 编写详细部署流程文档
  - [x] SubTask 2.1: 编写准备阶段（环境检查、工具安装）
  - [x] SubTask 2.2: 编写服务器部署阶段（Docker 部署 + 手动部署）
  - [x] SubTask 2.3: 编写 Agent 部署阶段（Windows Agent 安装配置）
  - [x] SubTask 2.4: 编写验证阶段和常见问题排查

- [x] Task 3: 编写 Agent 配置指南文档
  - [x] SubTask 3.1: 编写 Agent 下载说明（Release 页面 + 源码编译）
  - [x] SubTask 3.2: 编写 Agent 安装和配置详解（config.json 详解）
  - [x] SubTask 3.3: 编写 Agent 运行说明（首次运行、系统托盘、开机自启、日志）

- [x] Task 4: 编写文件说明文档
  - [x] SubTask 4.1: 列出服务器部署必需文件
  - [x] SubTask 4.2: 列出 Agent 端文件
  - [x] SubTask 4.3: 列出克隆后多余/可忽略的文件

- [x] Task 5: 重构现有 Wiki 文档
  - [x] SubTask 5.1: 更新技术架构文档（根据实际项目结构修正）
  - [x] SubTask 5.2: 更新部署要求文档
  - [x] SubTask 5.3: 更新 AI 部署教程文档
  - [x] SubTask 5.4: 更新功能介绍文档

- [x] Task 6: 重构 README.md
  - [x] SubTask 6.1: 添加 Wiki 导航引导
  - [x] SubTask 6.2: 优化项目结构和快速开始说明
  - [x] SubTask 6.3: 更新文档链接指向新的 Wiki 页面

# Task Dependencies

- [Task 2] 依赖 [Task 1]（需要先建立 Wiki 结构）
- [Task 3] 依赖 [Task 2]（部署流程完成后补充 Agent 配置细节）
- [Task 5] 依赖 [Task 1]（需要 Wiki 结构建立后统一更新）
- [Task 6] 依赖 [Task 5]（README 更新需要基于最终 Wiki 内容）
