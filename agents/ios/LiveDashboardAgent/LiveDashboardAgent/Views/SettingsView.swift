import SwiftUI

struct SettingsView: View {
    @Environment(\.presentationMode) var presentationMode

    @State private var serverUrl: String = ""
    @State private var deviceToken: String = ""
    @State private var reportInterval: String = ""
    @State private var testStep: ApiClient.TestConnectionStep?
    @State private var testError: String?
    @State private var isTesting = false
    @State private var testSuccess = false
    @State private var saveMessage: String?

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("服务器配置")) {
                    TextField("服务器 URL", text: $serverUrl)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .keyboardType(.URL)

                    SecureField("设备令牌 (Device Token)", text: $deviceToken)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)

                    TextField("上报间隔（秒，最小10）", text: $reportInterval)
                        .keyboardType(.numberPad)
                }

                Section(header: Text("连接测试")) {
                    Button(action: testConnection) {
                        HStack {
                            if isTesting {
                                ProgressView()
                                    .scaleEffect(0.8)
                            }
                            Text(isTesting ? "测试中..." : "测试连接")
                        }
                    }
                    .disabled(isTesting || serverUrl.isEmpty)

                    if let step = testStep {
                        testResultView(step: step)
                    }
                }

                Section {
                    Button(action: saveConfig) {
                        Text("保存配置")
                            .frame(maxWidth: .infinity)
                            .fontWeight(.semibold)
                    }
                    .disabled(!isFormValid)

                    if let msg = saveMessage {
                        Text(msg)
                            .font(.caption)
                            .foregroundColor(saveMessage == "保存成功" ? .green : .red)
                    }
                }
            }
            .navigationTitle("设置")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("关闭") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
            .onAppear {
                loadConfig()
            }
        }
    }

    private var isFormValid: Bool {
        !serverUrl.isEmpty && !deviceToken.isEmpty
    }

    private func loadConfig() {
        let config = ConfigManager.shared.getConfig()
        serverUrl = config.serverUrl
        deviceToken = config.deviceToken
        reportInterval = String(config.reportIntervalSeconds)
    }

    private func saveConfig() {
        guard !serverUrl.isEmpty else {
            saveMessage = "服务器URL不能为空"
            return
        }
        guard !deviceToken.isEmpty else {
            saveMessage = "设备令牌不能为空"
            return
        }

        let interval = Int(reportInterval) ?? 30
        let clampedInterval = max(interval, 10)

        ConfigManager.shared.saveServerUrl(serverUrl.trimmingCharacters(in: .whitespacesAndNewlines))
        ConfigManager.shared.saveDeviceToken(deviceToken.trimmingCharacters(in: .whitespacesAndNewlines))
        ConfigManager.shared.saveReportInterval(clampedInterval)

        saveMessage = "保存成功"
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            saveMessage = nil
        }
    }

    private func testConnection() {
        isTesting = true
        testStep = nil
        testError = nil
        testSuccess = false

        let url = serverUrl.trimmingCharacters(in: .whitespacesAndNewlines)

        ApiClient.shared.testConnection(serverUrl: url) { step, error in
            DispatchQueue.main.async {
                testStep = step

                if let error = error {
                    testError = error.localizedDescription
                    isTesting = false
                    testSuccess = false
                } else if step == .done {
                    isTesting = false
                    testSuccess = true
                }
            }
        }
    }

    @ViewBuilder
    private func testResultView(step: ApiClient.TestConnectionStep) -> some View {
        HStack {
            Image(systemName: stepIcon(step))
                .foregroundColor(stepColor(step))
            Text(stepLabel(step))
                .font(.subheadline)

            Spacer()

            if step == .done && testSuccess {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
            } else if let error = testError, step != .done {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .lineLimit(2)
            }
        }
    }

    private func stepIcon(_ step: ApiClient.TestConnectionStep) -> String {
        switch step {
        case .dns: return "network"
        case .tcp: return "link"
        case .http: return "globe"
        case .done: return "checkmark.circle"
        }
    }

    private func stepColor(_ step: ApiClient.TestConnectionStep) -> Color {
        switch step {
        case .dns: return testError != nil ? .red : .blue
        case .tcp: return testError != nil ? .red : .blue
        case .http: return testError != nil ? .red : .blue
        case .done: return .green
        }
    }

    private func stepLabel(_ step: ApiClient.TestConnectionStep) -> String {
        switch step {
        case .dns: return "DNS 解析"
        case .tcp: return "TCP 连接"
        case .http: return "HTTP 请求"
        case .done: return "连接成功"
        }
    }
}
