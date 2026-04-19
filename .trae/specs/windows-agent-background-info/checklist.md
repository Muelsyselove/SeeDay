# Windows Agent 后台信息上报 - 验证清单

* [ ] 检查 Windows agent 是否能够收集后台应用信息

* [ ] 检查 Windows agent 是否能够区分前台和后台应用

* [ ] 检查 Windows agent 是否能够同时上报前台和后台应用信息

* [ ] 检查上报数据中 `is_foreground` 字段是否设置正确

* [ ] 检查服务器端是否能够正确处理包含 `is_foreground: false` 的上报数据

* [ ] 检查数据库中的 `ActivityRecord` 是否正确设置了 `is_foreground` 字段

* [ ] 检查数据库中的 `DeviceState` 是否正确设置了 `is_foreground` 字段

* [ ] 检查前端界面是否显示“正在查看”用于前台应用

* [ ] 检查前端界面是否显示“正在运行”用于后台应用

* [ ] 检查前端界面的响应速度是否受到影响

* [ ] 检查 Windows agent 的资源消耗是否在可接受范围内

* [ ] 检查数据上报频率是否保持不变

* [ ] 进行完整的端到端测试，验证数据流程

* [ ] 测试不同应用场景，确保功能的稳定性

