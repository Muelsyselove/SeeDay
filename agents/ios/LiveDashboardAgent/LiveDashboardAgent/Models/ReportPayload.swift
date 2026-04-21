import Foundation

struct ReportPayload {
    let appId: String
    let windowTitle: String
    let isForeground: Bool
    let timestamp: String
    let extra: ExtraInfo

    func toDict() -> [String: Any] {
        var extraDict: [String: Any] = [:]
        if let bp = extra.batteryPercent { extraDict["battery_percent"] = bp }
        if let bc = extra.batteryCharging { extraDict["battery_charging"] = bc }
        if let so = extra.screenOn { extraDict["screen_on"] = so }

        return [
            "app_id": appId,
            "window_title": windowTitle,
            "is_foreground": isForeground ? "1" : "0",
            "timestamp": timestamp,
            "extra": extraDict
        ]
    }
}
