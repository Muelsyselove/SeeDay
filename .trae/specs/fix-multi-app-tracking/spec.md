# Live Dashboard 多应用跟踪修复 - 产品需求文档

## Overview
- **Summary**: 修复Live Dashboard中前后台应用数据的处理和显示问题，确保客户端agent提交的多个应用信息能被正确存储和显示。
- **Purpose**: 解决当前服务无法同时记录和显示多个运行程序的问题，特别是前台和后台程序的同步显示。
- **Target Users**: 使用Live Dashboard的用户，包括需要监控设备活动的个人和团队。

## Goals
- 修复服务器后端的数据存储逻辑，使其能够同时存储多个应用状态
- 确保前端能够正确显示多个运行中的应用，包括前台和后台程序
- 实现"now"状态的显示，对于前台程序额外显示"前台"标识
- 保持数据处理的性能和可靠性

## Non-Goals (Out of Scope)
- 不修改现有的客户端agent数据提交格式
- 不改变现有的API接口结构
- 不修改现有的时间线数据处理逻辑
- 不添加新的功能特性

## Background & Context
- Live Dashboard使用客户端agent收集设备活动数据，包括前台和后台应用
- 客户端agent会发送多个应用的信息，但服务器后端目前只能存储每个设备的一个状态记录
- 这导致后台应用的信息被前台应用的信息覆盖，或者反之
- 前端无法显示多个同时运行的应用，只能显示最后接收到的应用信息

## Functional Requirements
- **FR-1**: 服务器后端能够同时存储多个应用状态
- **FR-2**: 前端能够正确显示多个运行中的应用
- **FR-3**: 实现"now"状态的显示，对于前台程序额外显示"前台"标识
- **FR-4**: 保持数据处理的性能和可靠性

## Non-Functional Requirements
- **NFR-1**: 数据处理性能应保持不变或有所提升
- **NFR-2**: 修复不应影响现有的其他功能
- **NFR-3**: 修复应保持向后兼容性

## Constraints
- **Technical**: 基于现有的代码结构和架构
- **Business**: 保持现有功能的完整性
- **Dependencies**: 依赖现有的客户端agent数据格式

## Assumptions
- 客户端agent正确提交前后台应用数据
- 现有的API接口格式保持不变
- 前端和后端的代码结构可以进行必要的修改

## Acceptance Criteria

### AC-1: 多个应用状态正确存储
- **Given**: 客户端agent提交多个应用的信息（前台和后台）
- **When**: 服务器后端处理这些信息
- **Then**: 服务器后端应同时存储所有应用的状态，不发生覆盖
- **Verification**: `programmatic`

### AC-2: 多个应用正确显示
- **Given**: 服务器后端存储了多个应用的状态
- **When**: 前端加载当前状态数据
- **Then**: 前端应显示所有运行中的应用，包括前台和后台程序
- **Verification**: `human-judgment`

### AC-3: "now"状态和"前台"标识正确显示
- **Given**: 服务器后端存储了多个应用的状态，其中包含前台应用
- **When**: 前端显示应用状态
- **Then**: 前端应显示"now"状态，并对前台应用额外显示"前台"标识
- **Verification**: `human-judgment`

### AC-4: 数据处理性能
- **Given**: 客户端agent提交多个应用的信息
- **When**: 服务器后端处理这些信息
- **Then**: 处理时间应在可接受范围内（< 1秒）
- **Verification**: `programmatic`

## Open Questions
- [ ] 如何修改数据库设计以支持多个应用状态？
- [ ] 如何调整前端显示逻辑以支持多个应用状态？
- [ ] 如何确保数据处理性能不受影响？
