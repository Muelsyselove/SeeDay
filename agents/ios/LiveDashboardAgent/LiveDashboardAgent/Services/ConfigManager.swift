import Foundation

class ConfigManager {
    static let shared = ConfigManager()

    private let prefix = "live_dashboard_agent_"
    private let defaults = UserDefaults.standard

    private init() {}

    func getConfig() -> AppConfig {
        AppConfig(
            serverUrl: defaults.string(forKey: prefix + "server_url") ?? "",
            deviceToken: defaults.string(forKey: prefix + "device_token") ?? "",
            reportIntervalSeconds: defaults.integer(forKey: prefix + "report_interval_seconds") == 0
                ? 30
                : defaults.integer(forKey: prefix + "report_interval_seconds"),
            isMonitoringEnabled: defaults.bool(forKey: prefix + "monitoring_enabled")
        )
    }

    func saveServerUrl(_ url: String) {
        defaults.set(url, forKey: prefix + "server_url")
    }

    func saveDeviceToken(_ token: String) {
        defaults.set(token, forKey: prefix + "device_token")
    }

    func saveReportInterval(_ interval: Int) {
        defaults.set(interval, forKey: prefix + "report_interval_seconds")
    }

    func saveMonitoringEnabled(_ enabled: Bool) {
        defaults.set(enabled, forKey: prefix + "monitoring_enabled")
    }

    func isConfigured() -> Bool {
        let config = getConfig()
        return !config.serverUrl.isEmpty && !config.deviceToken.isEmpty
    }
}
