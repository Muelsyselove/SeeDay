import Foundation

struct DeviceActivityMonitorHandler {
    static let sharedDefaultsSuiteName = "group.com.livedashboard.agent"
    static let currentAppKey = "current_foreground_app"
    static let lastForegroundAppKey = "last_foreground_app"
    static let lastUpdateTimeKey = "last_app_update_time"

    static var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: sharedDefaultsSuiteName)
    }

    static func setCurrentApp(_ bundleId: String) {
        let defaults = sharedDefaults
        let previous = defaults?.string(forKey: currentAppKey)
        if let prev = previous {
            defaults?.set(prev, forKey: lastForegroundAppKey)
        }
        defaults?.set(bundleId, forKey: currentAppKey)
        defaults?.set(Date(), forKey: lastUpdateTimeKey)
    }

    static func getCurrentApp() -> String? {
        return sharedDefaults?.string(forKey: currentAppKey)
    }

    static func getLastForegroundApp() -> String? {
        return sharedDefaults?.string(forKey: lastForegroundAppKey)
    }

    static func getLastUpdateTime() -> Date? {
        return sharedDefaults?.object(forKey: lastUpdateTimeKey) as? Date
    }

    static func clearCurrentApp() {
        sharedDefaults?.removeObject(forKey: currentAppKey)
        sharedDefaults?.removeObject(forKey: lastUpdateTimeKey)
    }
}
