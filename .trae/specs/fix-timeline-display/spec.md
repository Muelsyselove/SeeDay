# 时间轴显示修复 Spec

## Why
时间轴按应用分组后存在三个问题：1) 颜色过于突兀，与网站整体淡雅风格不协调；2) 结束时间未被正确记录/显示，很多条目只显示开始时间；3) 音乐和视频软件的特殊展示被删除，原本应在单独栏目展示今日歌单和看过的视频。

## What Changes
- 将时间轴应用分组的颜色方案从 PALETTE 鲜艳色改为使用网站 CSS 变量的柔和色系（sakura/sage/gold 等淡色）
- 修复后端 timeline 路由中 `ended_at` 为 null 时的前端显示逻辑，确保正在运行的活动显示"xx:xx - 现在"，已结束的活动显示"xx:xx - yy:yy"
- 在时间轴右侧面板中恢复音乐和视频软件的特殊展示栏目，展示今日歌单（音乐标题 + 时长）和看过的视频（视频标题 + 时长）
- 将音乐/视频特殊展示从左侧面板移到右侧时间轴面板，作为时间轴的独立栏目

## Impact
- Affected code: `packages/frontend/app/page.tsx` — 颜色方案、媒体栏目位置
- Affected code: `packages/frontend/app/globals.css` — 时间轴样式调整、媒体栏目样式
- Affected code: `packages/backend/src/routes/timeline.ts` — 修复 ended_at 计算逻辑

## ADDED Requirements

### Requirement: 柔和的时间轴颜色方案
系统 SHALL 使用与网站整体风格协调的柔和颜色来标识时间轴中的应用分组。

#### Scenario: 应用分组颜色显示
- **WHEN** 用户查看时间轴
- **THEN** 应用分组的左边框和圆点颜色应使用网站 CSS 变量派生的柔和色（如 sakura-soft、sage-soft、gold-soft 等），而非当前的鲜艳 PALETTE 色
- **AND** 颜色应保持一致性，同一应用在不同日期使用相同颜色

### Requirement: 时间轴中的媒体内容栏目
系统 SHALL 在时间轴面板中提供独立的音乐和视频内容展示栏目。

#### Scenario: 今日歌单展示
- **WHEN** 用户查看当天时间轴且有音乐应用使用记录
- **THEN** 时间轴面板应在应用分组列表之前显示"今日歌单"栏目
- **AND** 每首歌显示：歌曲标题（display_title）+ 收听时长
- **AND** 同一首歌的多次收听合并显示总时长
- **AND** 按收听时长降序排列

#### Scenario: 今日视频展示
- **WHEN** 用户查看当天时间轴且有视频应用使用记录
- **THEN** 时间轴面板应在应用分组列表之前显示"今日视频"栏目
- **AND** 每个视频显示：视频标题（display_title）+ 观看时长
- **AND** 同一视频的多次观看合并显示总时长
- **AND** 按观看时长降序排列

#### Scenario: 无媒体内容
- **WHEN** 用户查看时间轴且没有音乐或视频使用记录
- **THEN** 不显示媒体内容栏目

## MODIFIED Requirements

### Requirement: 时间段时间正确显示
系统 SHALL 正确显示每个应用运行条目的完整时间段。

#### Scenario: 已结束的活动
- **WHEN** 某个应用运行条目已结束（ended_at 有值）
- **THEN** 应显示"xx:xx - yy:yy"格式的时间范围

#### Scenario: 正在运行的活动
- **WHEN** 某个应用运行条目仍在运行（ended_at 为 null）且查看的是今天
- **THEN** 应显示"xx:xx - 现在"格式的时间范围

#### Scenario: 后端 ended_at 计算
- **WHEN** 后端计算时间线 segments 时
- **THEN** 对于最后一个活动条目，如果是今天则 ended_at 为 null（表示仍在运行），如果不是今天则 ended_at 应为该条目最后心跳时间
- **AND** 对于非最后一个活动条目，ended_at 应为下一个活动的 started_at

### Requirement: 左侧面板媒体统计简化
左侧面板的"媒体使用"统计栏 SHALL 保留但简化，仅显示总时长汇总；详细的歌单和视频列表移至右侧时间轴面板。

## REMOVED Requirements

### Requirement: 旧 PALETTE 鲜艳色方案
**Reason**: 与网站淡雅风格不协调
**Migration**: 改用基于 CSS 变量的柔和色系
