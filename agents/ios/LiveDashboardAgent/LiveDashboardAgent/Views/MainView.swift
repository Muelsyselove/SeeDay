import SwiftUI
import FamilyControls

struct MainView: View {
    @State private var isMonitoring = false
    @State private var foregroundApp = ""
    @State private var lastReportTime: String = "--"
    @State private var connectionStatus: String = "未检测"
    @State private var showSettings = false
    @State private var showPermissionGuide = false
    @State private var hasPermission = false
    @State private var refreshTimer: Timer?

    private let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "HH:mm:ss"
        return f
    }()

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                statusCard

                infoCard

                Spacer()

                controlSection

                Spacer()
                    .frame(height: 20)
            }
            .padding()
            .navigationTitle("LiveDashboard")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showSettings = true }) {
                        Image(systemName: "gearshape")
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .sheet(isPresented: $showPermissionGuide) {
                PermissionGuideView()
            }
            .onAppear {
                startAutoRefresh()
                checkPermissionStatus()
            }
            .onDisappear {
                stopAutoRefresh()
            }
        }
    }

    private var statusCard: some View {
        VStack(spacing: 12) {
            HStack {
                Circle()
                    .fill(statusColor)
                    .frame(width: 12, height: 12)
                Text(statusText)
                    .font(.headline)
                Spacer()
            }

            if !hasPermission {
                Button(action: { showPermissionGuide = true }) {
                    Text("授予权限")
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 6)
                        .background(Color.orange)
                        .cornerRadius(8)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var infoCard: some View {
        VStack(spacing: 12) {
            InfoRow(label: "当前前台应用", value: foregroundApp.isEmpty ? "无" : foregroundApp)
            InfoRow(label: "上次上报时间", value: lastReportTime)
            InfoRow(label: "服务器连接", value: connectionStatus)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var controlSection: some View {
        VStack(spacing: 16) {
            HStack {
                Text(isMonitoring ? "监控运行中" : "监控已停止")
                    .font(.body)
                Spacer()
                Toggle("", isOn: Binding(
                    get: { isMonitoring },
                    set: { newValue in
                        toggleMonitoring(newValue)
                    }
                ))
                .labelsHidden()
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }

    private var statusColor: Color {
        if !hasPermission { return .orange }
        return isMonitoring ? .green : .red
    }

    private var statusText: String {
        if !hasPermission { return "权限未授予" }
        return isMonitoring ? "监控运行中" : "监控已停止"
    }

    private func toggleMonitoring(_ on: Bool) {
        if on {
            if !hasPermission {
                showPermissionGuide = true
                isMonitoring = false
                return
            }
            if !ConfigManager.shared.isConfigured() {
                showSettings = true
                isMonitoring = false
                return
            }
            MonitorManager.shared.startMonitoring()
        } else {
            MonitorManager.shared.stopMonitoring()
        }
        isMonitoring = on
    }

    private func checkPermissionStatus() {
        hasPermission = MonitorManager.shared.checkPermission()
    }

    private func startAutoRefresh() {
        refreshUI()
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { _ in
            refreshUI()
        }
    }

    private func stopAutoRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    private func refreshUI() {
        isMonitoring = MonitorManager.shared.isMonitoring
        foregroundApp = MonitorManager.shared.currentForegroundApp
        hasPermission = MonitorManager.shared.checkPermission()

        if let lastReport = MonitorManager.shared.lastReport {
            lastReportTime = dateFormatter.string(from: lastReport)
        }

        let config = ConfigManager.shared.getConfig()
        connectionStatus = config.serverUrl.isEmpty ? "未配置" : connectionStatus
    }
}

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
    }
}
