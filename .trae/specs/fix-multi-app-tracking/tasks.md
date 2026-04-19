# Live Dashboard 多应用跟踪修复 - 实现计划

## [ ] Task 1: 分析当前数据库设计和数据流
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 分析当前的数据库设计，特别是device_states表的结构
  - 分析客户端agent提交数据的流程
  - 分析前端显示数据的流程
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 分析并记录当前数据库设计和数据流
  - `human-judgment` TR-1.2: 确认问题的根本原因
- **Notes**: 重点关注device_states表的设计和数据覆盖问题

## [ ] Task 2: 修改数据库设计，添加应用状态表
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 创建新的应用状态表，支持每个设备多个应用状态
  - 修改现有的数据插入逻辑，支持多个应用状态的存储
  - 保留现有的device_states表用于向后兼容
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: 验证新表能正确存储多个应用状态
  - `programmatic` TR-2.2: 验证数据处理性能符合要求
- **Notes**: 新表应该包含device_id, app_id, app_name, window_title, display_title, last_seen_at, is_foreground等字段

## [ ] Task 3: 修改后端API，支持多个应用状态的检索
- **Priority**: P0
- **Depends On**: Task 2
- **Description**: 
  - 修改current.ts路由，返回多个应用状态
  - 更新数据检索逻辑，从新表中获取应用状态
  - 保持API接口格式不变
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-3.1: 验证API能返回多个应用状态
  - `programmatic` TR-3.2: 验证API接口格式保持不变
- **Notes**: API应返回按时间排序的应用状态列表，前台应用优先显示

## [ ] Task 4: 修改前端显示逻辑，显示多个应用状态
- **Priority**: P0
- **Depends On**: Task 3
- **Description**: 
  - 修改前端页面，显示多个运行中的应用
  - 实现"now"状态的显示
  - 对前台应用额外显示"前台"标识
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `human-judgment` TR-4.1: 验证前端能正确显示多个应用状态
  - `human-judgment` TR-4.2: 验证"now"状态和"前台"标识正确显示
- **Notes**: 前端应按时间排序显示应用状态，前台应用优先

## [ ] Task 5: 测试和验证修复
- **Priority**: P1
- **Depends On**: Task 4
- **Description**: 
  - 测试多个应用状态的存储和显示
  - 测试"now"状态和"前台"标识的显示
  - 验证数据处理性能
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-5.1: 验证多个应用状态正确存储
  - `human-judgment` TR-5.2: 验证前端显示正确
  - `programmatic` TR-5.3: 验证数据处理性能
- **Notes**: 进行全面的测试，确保所有问题都已解决

## [ ] Task 6: 部署和监控
- **Priority**: P2
- **Depends On**: Task 5
- **Description**: 
  - 部署修复后的代码
  - 监控系统运行状态
  - 确保修复效果持续有效
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgment` TR-6.1: 验证部署后的系统运行正常
  - `programmatic` TR-6.2: 监控系统性能和稳定性
- **Notes**: 确保修复后的系统能稳定运行
