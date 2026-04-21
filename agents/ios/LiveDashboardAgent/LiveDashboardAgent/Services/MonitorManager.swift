import Foundation
import UIKit
import DeviceActivity
import FamilyControls

class MonitorManager {
    static let shared = MonitorManager()

    private var reportTimer: Timer?
    private var foregroundAppId: String = ""
    private var backgroundApps: Set<String> = []
    private var lastReportTime: Date?

    let systemAppBlacklist: Set<String> = [
        "com.apple.springboard", "com.apple.Preferences", "com.apple.MobileStore",
        "com.apple.AppStore", "com.apple.Music", "com.apple.mobilephone",
        "com.apple.MobileSMS", "com.apple.mail", "com.apple.mobilecal",
        "com.apple.MobileNotes", "com.apple.reminders", "com.apple.Maps",
        "com.apple.camera", "com.apple.Health", "com.apple.Bridge",
        "com.apple.Passbook", "com.apple.stocks", "com.apple.weather",
        "com.apple.VoiceMemos", "com.apple.podcasts", "com.apple.news",
        "com.apple.translate", "com.apple.FindMy", "com.apple.shortcuts",
        "com.apple.Files", "com.apple.Tips", "com.apple.Measure",
        "com.apple.Compass", "com.apple.Contacts", "com.apple.facetime"
    ]

    var onStatusChanged: (() -> Void)?

    private init() {
        loadCurrentForegroundApp()
    }

    var isMonitoring: Bool {
        return reportTimer != nil
    }

    var currentForegroundApp: String {
        return foregroundAppId
    }

    var lastReport: Date? {
        return lastReportTime
    }

    func startMonitoring() {
        guard !isMonitoring else { return }

        let config = ConfigManager.shared.getConfig()
        let interval = max(config.reportIntervalSeconds, 10)

        ConfigManager.shared.saveMonitoringEnabled(true)
        startDeviceActivityMonitor()

        reportTimer = Timer.scheduledTimer(withTimeInterval: TimeInterval(interval), repeats: true) { [weak self] _ in
            self?.performReport()
        }

        performReport()
        onStatusChanged?()
    }

    func stopMonitoring() {
        reportTimer?.invalidate()
        reportTimer = nil
        ConfigManager.shared.saveMonitoringEnabled(false)
        onStatusChanged?()
    }

    func updateForegroundApp(_ bundleId: String) {
        if !systemAppBlacklist.contains(bundleId) {
            foregroundAppId = bundleId
        }
    }

    func addBackgroundApp(_ bundleId: String) {
        if !systemAppBlacklist.contains(bundleId) {
            backgroundApps.insert(bundleId)
        }
    }

    func removeBackgroundApp(_ bundleId: String) {
        backgroundApps.remove(bundleId)
    }

    private func startDeviceActivityMonitor() {
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true,
            warningTime: nil
        )

        let monitor = DeviceActivityMonitor()
        do {
            try monitor.startMonitoring(.daily, during: schedule)
        } catch {
            print("Failed to start DeviceActivityMonitor: \(error)")
        }
    }

    private func performReport() {
        let config = ConfigManager.shared.getConfig()
        let extra = ApiClient.shared.collectExtraInfo()
        let now = Date()
        let cal = Calendar.current
        let year = cal.component(.year, from: now)
        let month = String(format: "%02d", cal.component(.month, from: now))
        let day = String(format: "%02d", cal.component(.day, from: now))
        let hour = String(format: "%02d", cal.component(.hour, from: now))
        let minute = String(format: "%02d", cal.component(.minute, from: now))
        let timestamp = "\(year);\(month);\(day);\(hour):\(minute)"

        var payloads: [ReportPayload] = []

        if !foregroundAppId.isEmpty {
            let fgPayload = ReportPayload(
                appId: foregroundAppId,
                windowTitle: appNameForBundleId(foregroundAppId),
                isForeground: true,
                timestamp: timestamp,
                extra: extra
            )
            payloads.append(fgPayload)
        }

        for bgApp in backgroundApps {
            let bgPayload = ReportPayload(
                appId: bgApp,
                windowTitle: appNameForBundleId(bgApp),
                isForeground: false,
                timestamp: timestamp,
                extra: extra
            )
            payloads.append(bgPayload)
        }

        guard !payloads.isEmpty else { return }

        ApiClient.shared.reportApps(payloads) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.lastReportTime = Date()
                    self?.onStatusChanged?()
                case .failure(let error):
                    print("Report failed: \(error.localizedDescription)")
                }
            }
        }
    }

    private func loadCurrentForegroundApp() {
        let sharedDefaults = UserDefaults(suiteName: DeviceActivityMonitorHandler.sharedDefaultsSuiteName)
        foregroundAppId = sharedDefaults?.string(forKey: DeviceActivityMonitorHandler.currentAppKey) ?? ""
    }

    private func appNameForBundleId(_ bundleId: String) -> String {
        return bundleId
    }

    func refreshForegroundApp() {
        loadCurrentForegroundApp()
    }

    func checkPermission() -> Bool {
        return AuthorizationCenter.shared.currentAuthorizationStatus == .approved
    }
}

extension DeviceActivityEvent.Name {
    static let appSwitched = DeviceActivityEvent.Name("appSwitched")
}

extension DeviceActivitySchedule {
    static var daily: DeviceActivitySchedule {
        DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true,
            warningTime: nil
        )
    }
}
