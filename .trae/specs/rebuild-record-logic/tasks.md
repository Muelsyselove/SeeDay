# Live Dashboard 记录逻辑重构 - 实现计划

## [ ] Task 1: 重构客户端提交格式
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 修改客户端 agent 的提交格式，使用分号分隔的格式提交多个应用信息
  - 确保 app_id、window_title、is_foreground 等字段按顺序对应
  - 确保 timestamp 格式为年;月;日;xx:xx
  - 实现详细的显示格式需求
- **Acceptance Criteria Addressed**: [AC-1, AC-6]
- **Test Requirements**:
  - `programmatic` TR-1.1: 客户端 agent 能够正确提交新格式的数据
  - `programmatic` TR-1.2: 服务器能够正确接收和解析新格式的数据
  - `human-judgment` TR-1.3: 显示格式美观、清晰、易读
- **Notes**: 需要确保客户端 agent 能够正确处理多个应用的信息，并按顺序提交

## [ ] Task 2: 重构后端解析逻辑
- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 修改后端解析逻辑，处理分号分隔的格式
  - 提取多个应用的信息，包括 app_id、window_title、is_foreground 等
  - 处理 timestamp 格式，提取年、月、日、时间信息
  - 确保解析逻辑的正确性和性能
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `programmatic` TR-2.1: 服务器能够正确解析分号分隔的格式
  - `programmatic` TR-2.2: 服务器能够正确提取多个应用的信息
- **Notes**: 需要确保解析逻辑能够处理各种边缘情况，如空值、格式错误等

## [ ] Task 3: 实现基于前后台状态的应用持续运行判断
- **Priority**: P0
- **Depends On**: Task 2
- **Description**:
  - 实现基于前后台状态的应用持续运行判断逻辑
  - 当应用在一次提交中不在前台或后台运行时视为应用结束
  - 确保应用持续运行的时间计算准确
  - 实现详细的显示格式需求
- **Acceptance Criteria Addressed**: [AC-3, AC-6]
- **Test Requirements**:
  - `programmatic` TR-3.1: 服务器能够正确判断应用是否持续运行
  - `programmatic` TR-3.2: 服务器能够正确计算应用的运行时间
  - `human-judgment` TR-3.3: 显示格式符合要求
- **Notes**: 需要确保判断逻辑的准确性和一致性

## [ ] Task 4: 实现跨天处理逻辑
- **Priority**: P1
- **Depends On**: Task 3
- **Description**:
  - 实现跨天处理逻辑
  - 在第一天结束所有条目，在第二天创建新条目
  - 确保跨天的时间计算准确
  - 实现跨天的显示格式需求
- **Acceptance Criteria Addressed**: [AC-4, AC-6]
- **Test Requirements**:
  - `programmatic` TR-4.1: 服务器能够正确处理跨天的情况
  - `programmatic` TR-4.2: 服务器能够正确计算跨天的运行时间
  - `human-judgment` TR-4.3: 跨天显示格式符合要求
- **Notes**: 需要确保跨天处理逻辑的准确性和一致性

## [ ] Task 5: 实现媒体应用的特殊处理逻辑
- **Priority**: P1
- **Depends On**: Task 3
- **Description**:
  - 实现媒体应用的特殊处理逻辑
  - 处理音乐应用和视频应用的特殊规则
  - 确保媒体应用的时间记录准确
  - 实现媒体应用的显示格式需求
- **Acceptance Criteria Addressed**: [AC-5, AC-6]
- **Test Requirements**:
  - `programmatic` TR-5.1: 服务器能够正确处理音乐应用的特殊规则
  - `programmatic` TR-5.2: 服务器能够正确处理视频应用的特殊规则
  - `human-judgment` TR-5.3: 媒体应用显示格式符合要求
- **Notes**: 需要确保媒体应用处理逻辑的准确性和一致性

## [ ] Task 6: 测试和验证
- **Priority**: P2
- **Depends On**: Task 4, Task 5
- **Description**:
  - 测试重构后的记录逻辑
  - 验证所有功能是否正常工作
  - 确保性能和稳定性
  - 验证显示格式是否符合要求
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6]
- **Test Requirements**:
  - `programmatic` TR-6.1: 所有功能测试通过
  - `human-judgment` TR-6.2: 系统性能和稳定性良好
  - `human-judgment` TR-6.3: 显示格式美观、清晰、易读
- **Notes**: 需要确保测试覆盖各种场景，包括正常情况和边缘情况
