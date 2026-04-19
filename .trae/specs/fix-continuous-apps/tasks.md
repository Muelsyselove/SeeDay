# Live Dashboard 持续运行程序识别与显示修复 - 实现计划

## [ ] Task 1: 修改后端合并逻辑，识别持续运行的程序
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 修改后端的活动合并逻辑，即使中途切换了前后台状态，也要将同一应用的活动合并为一个条目
  - 保持应用的起始时间，更新结束时间
  - 确保合并逻辑的性能和可靠性
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: 验证后端能正确合并同一应用的活动，即使中途切换了前后台状态
  - `programmatic` TR-1.2: 验证数据处理性能符合要求
- **Notes**: 重点修改 timeline.ts 中的合并逻辑，移除对 is_foreground 的检查

## [ ] Task 2: 修改前端"此刻"栏显示逻辑，只显示前台应用
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 修改前端"此刻"栏的显示逻辑，只显示前台运行的应用
  - 确保前台应用的标识正确显示
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-2.1: 验证"此刻"栏只显示前台运行的应用
- **Notes**: 重点修改 page.tsx 中的 now-summary 部分

## [ ] Task 3: 修改前端"now"状态显示逻辑，只显示在最近的条目上
- **Priority**: P0
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 修改前端"now"状态的显示逻辑，只显示在最近的条目上
  - 确保相同应用的其他条目不显示"now"状态
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-3.1: 验证"now"状态只显示在最近的条目上
- **Notes**: 重点修改 page.tsx 中的 isCurrent 逻辑

## [ ] Task 4: 测试和验证修复
- **Priority**: P1
- **Depends On**: Task 1, Task 2, Task 3
- **Description**: 
  - 测试持续运行程序的识别和合并
  - 测试"此刻"栏只显示前台应用
  - 测试"now"状态只显示在最近的条目上
  - 验证数据处理性能
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: 验证持续运行程序正确识别
  - `human-judgment` TR-4.2: 验证"此刻"栏只显示前台应用
  - `human-judgment` TR-4.3: 验证"now"状态只显示在最近的条目上
  - `programmatic` TR-4.4: 验证数据处理性能
- **Notes**: 进行全面的测试，确保所有问题都已解决

## [ ] Task 5: 部署和监控
- **Priority**: P2
- **Depends On**: Task 4
- **Description**: 
  - 部署修复后的代码
  - 监控系统运行状态
  - 确保修复效果持续有效
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgment` TR-5.1: 验证部署后的系统运行正常
  - `programmatic` TR-5.2: 监控系统性能和稳定性
- **Notes**: 确保修复后的系统能稳定运行
