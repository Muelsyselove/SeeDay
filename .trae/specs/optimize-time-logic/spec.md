# Live Dashboard 时间逻辑优化 - 产品需求文档

## Overview
- **Summary**: 优化 Live Dashboard 的时间逻辑，确保准确记录应用的使用时间，特别是持续运行的应用和前后台状态切换的情况。
- **Purpose**: 解决当前时间计算逻辑可能存在的问题，提高时间记录的准确性和一致性。
- **Target Users**: 使用 Live Dashboard 的用户，包括需要监控设备活动的个人和团队。

## Goals
- 优化持续运行应用的时间计算逻辑，确保起始时间和结束时间准确
- 改进前后台状态切换时的时间记录
- 确保时间线显示的一致性和准确性
- 提高系统性能和可靠性

## Non-Goals (Out of Scope)
- 不修改数据库结构
- 不改变 API 接口格式
- 不添加新的功能特性

## Background & Context
- Live Dashboard 使用客户端 agent 收集设备活动数据，包括前台和后台应用
- 当前的时间计算逻辑在 `timeline.ts` 文件中实现
- Agent 客户端发送的数据包含应用 ID、窗口标题、时间戳、前后台状态和额外信息
- 后端需要根据这些数据计算应用的使用时间和生成时间线

## Functional Requirements
- **FR-1**: 优化持续运行应用的时间计算逻辑，确保起始时间和结束时间准确
- **FR-2**: 改进前后台状态切换时的时间记录
- **FR-3**: 确保时间线显示的一致性和准确性
- **FR-4**: 提高系统性能和可靠性

## Non-Functional Requirements
- **NFR-1**: 数据处理性能应保持不变或有所提升
- **NFR-2**: 优化不应影响现有的其他功能
- **NFR-3**: 优化应保持向后兼容性

## Constraints
- **Technical**: 基于现有的代码结构和架构
- **Business**: 保持现有功能的完整性
- **Dependencies**: 依赖现有的客户端 agent 数据格式

## Assumptions
- 客户端 agent 正确提交前后台应用数据
- 现有的 API 接口格式保持不变
- 前端和后端的代码结构可以进行必要的修改

## Acceptance Criteria

### AC-1: 持续运行应用的时间计算
- **Given**: 客户端 agent 提交同一应用的多个活动，中途切换了前后台状态
- **When**: 后端处理这些活动
- **Then**: 后端应正确计算应用的持续时间，保持起始时间，更新结束时间
- **Verification**: `programmatic`

### AC-2: 前后台状态切换时的时间记录
- **Given**: 应用从后台切换到前台，或从前台切换到后台
- **When**: 后端处理这些状态变化
- **Then**: 后端应正确记录状态变化的时间点，保持应用的持续运行状态
- **Verification**: `programmatic`

### AC-3: 时间线显示的一致性
- **Given**: 系统处理了多个应用的活动数据
- **When**: 前端显示时间线
- **Then**: 时间线应显示正确的起始时间、结束时间和持续时间
- **Verification**: `human-judgment`

### AC-4: 系统性能
- **Given**: 客户端 agent 提交大量活动数据
- **When**: 后端处理这些数据
- **Then**: 处理时间应在可接受范围内（< 1秒）
- **Verification**: `programmatic`

## Open Questions
- [ ] 如何处理跨天的持续运行程序？
- [ ] 如何优化时间计算的性能？
- [ ] 如何处理网络延迟导致的数据提交延迟？
