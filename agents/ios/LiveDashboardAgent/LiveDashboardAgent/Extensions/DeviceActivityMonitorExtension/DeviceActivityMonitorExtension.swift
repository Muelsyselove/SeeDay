import DeviceActivity

class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
    }

    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)

        if event == .appSwitched {
            let sharedDefaults = UserDefaults(suiteName: DeviceActivityMonitorHandler.sharedDefaultsSuiteName)
            if let currentApp = sharedDefaults?.string(forKey: DeviceActivityMonitorHandler.currentAppKey) {
                sharedDefaults?.set(currentApp, forKey: DeviceActivityMonitorHandler.lastForegroundAppKey)
            }
        }
    }

    override func intervalWillStartWarning(for activity: DeviceActivityName) {
        super.intervalWillStartWarning(for: activity)
    }

    override func intervalWillEndWarning(for activity: DeviceActivityName) {
        super.intervalWillEndWarning(for: activity)
    }
}

extension DeviceActivityEvent.Name {
    static let appSwitched = DeviceActivityEvent.Name("appSwitched")
}
