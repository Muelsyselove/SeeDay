# AI总结与折叠交互优化 Spec

## Why
AI日记字数过长（约800字），生成时间显示UTC而非本地时间，媒体栏横屏无法滚动，折叠展开后条目过多不便浏览。

## What Changes
- AI总结SYSTEM_PROMPT字数限制从800字改为300字，max_tokens从2000降为800
- `generated_at`时间戳从`datetime('now')`(UTC)改为本地时区时间
- 媒体栏折叠区域添加`max-height`和`overflow-y:auto`，支持滚动
- 时间轴折叠展开后桌面端最多显示5条，超出部分需滚动查看
- 手机端展开时直接显示全部条目，不限制5条也不需滚动

## Impact
- Affected code: `daily-summary-gen.ts`, `db.ts`, `page.tsx`, `globals.css`

## ADDED Requirements

### Requirement: AI总结字数限制300字
系统应将AI日记字数限制为约300字，对应调整SYSTEM_PROMPT和max_tokens。

#### Scenario: 生成总结
- **WHEN** 用户点击"立即生成"或定时触发
- **THEN** AI返回约300字的日记总结

### Requirement: 生成时间显示本地时区
系统应将`generated_at`存储为本地时区时间（UTC+8），而非UTC时间。

#### Scenario: 显示生成时间
- **WHEN** 总结已生成并显示时间
- **THEN** 时间为用户本地时间（如7:19而非23:19）

### Requirement: 折叠展开后桌面端限制显示5条
桌面端展开折叠区域后，时间轴和媒体栏最多显示5条可见条目，超出部分通过滚动查看。

#### Scenario: 桌面端展开超过5条
- **WHEN** 桌面端用户展开一个包含10条记录的应用组
- **THEN** 仅显示5条可见区域，其余需滚动

### Requirement: 手机端展开显示全部
手机端展开折叠区域时，直接显示全部条目，不限制条目数也不需滚动。

#### Scenario: 手机端展开
- **WHEN** 手机端用户展开一个折叠区域
- **THEN** 所有条目直接可见，无滚动限制

### Requirement: 媒体栏横屏可滚动
媒体栏折叠区域在横屏状态下应支持滚动浏览。

#### Scenario: 横屏浏览媒体
- **WHEN** 用户在横屏状态下展开媒体栏
- **THEN** 可以滚动查看所有媒体条目

## MODIFIED Requirements

### Requirement: 折叠展开逻辑
原逻辑：展开后显示全部条目（grid-template-rows: 1fr）
新逻辑：桌面端展开后max-height限制5条高度+overflow-y:auto；手机端展开后grid-template-rows: 1fr显示全部
