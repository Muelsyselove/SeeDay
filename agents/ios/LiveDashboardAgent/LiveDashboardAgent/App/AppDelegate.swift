import UIKit
import BackgroundTasks

class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        registerBackgroundTasks()
        requestNotificationPermissions()
        UIDevice.current.isBatteryMonitoringEnabled = true
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    private func registerBackgroundTasks() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: "com.livedashboard.agent.report", using: nil) { task in
            self.handleBackgroundReport(task: task as! BGProcessingTask)
        }

        BGTaskScheduler.shared.register(forTaskWithIdentifier: "com.livedashboard.agent.fetch", using: nil) { task in
            self.handleBackgroundFetch(task: task as! BGAppRefreshTask)
        }
    }

    private func scheduleBackgroundReport() {
        let request = BGProcessingTaskRequest(identifier: "com.livedashboard.agent.report")
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false
        request.earliestBeginDate = Date(timeIntervalSinceNow: 60)

        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("Could not schedule background report: \(error)")
        }
    }

    private func scheduleBackgroundFetch() {
        let request = BGAppRefreshTaskRequest(identifier: "com.livedashboard.agent.fetch")
        request.earliestBeginDate = Date(timeIntervalSinceNow: 60)

        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("Could not schedule background fetch: \(error)")
        }
    }

    private func handleBackgroundReport(task: BGProcessingTask) {
        scheduleBackgroundReport()

        if ConfigManager.shared.getConfig().isMonitoringEnabled {
            MonitorManager.shared.performReport()
        }

        task.setTaskCompleted(success: true)
    }

    private func handleBackgroundFetch(task: BGAppRefreshTask) {
        scheduleBackgroundFetch()

        if ConfigManager.shared.getConfig().isMonitoringEnabled {
            MonitorManager.shared.performReport()
        }

        task.setTaskCompleted(success: true)
    }

    private func requestNotificationPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                print("Notification permission error: \(error)")
            }
        }
    }
}
