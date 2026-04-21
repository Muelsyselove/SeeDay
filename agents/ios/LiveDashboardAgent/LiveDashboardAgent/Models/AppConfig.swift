import Foundation

struct AppConfig: Codable {
    var serverUrl: String = ""
    var deviceToken: String = ""
    var reportIntervalSeconds: Int = 30
    var isMonitoringEnabled: Bool = false
}
