import SwiftUI

struct PermissionGuideView: View {
    @Environment(\.presentationMode) var presentationMode

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    headerSection

                    screenTimeSection

                    notificationSection

                    Spacer()
                        .frame(height: 20)
                }
                .padding()
            }
            .navigationTitle("权限引导")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("需要以下权限才能正常工作")
                .font(.title2)
                .fontWeight(.bold)

            Text("本应用需要屏幕使用时间权限来检测前台应用，以及通知权限来发送后台报告提醒。")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }

    private var screenTimeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("屏幕使用时间 / 家庭控制", systemImage: "hourglass")
                .font(.headline)

            StepRow(number: 1, text: "打开「设置」App")
            StepRow(number: 2, text: "进入「屏幕使用时间」")
            StepRow(number: 3, text: "确保屏幕使用时间已启用")
            StepRow(number: 4, text: "返回本应用，系统将弹出授权请求")
            StepRow(number: 5, text: "在弹窗中选择「允许」以授予家庭控制权限")

            Button(action: openScreenTimeSettings) {
                HStack {
                    Image(systemName: "arrow.right.circle")
                    Text("前往设置")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            .padding(.top, 4)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var notificationSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("通知权限", systemImage: "bell")
                .font(.headline)

            StepRow(number: 1, text: "打开「设置」App")
            StepRow(number: 2, text: "找到本应用「LiveDashboard Agent」")
            StepRow(number: 3, text: "开启「通知」权限")

            Button(action: openNotificationSettings) {
                HStack {
                    Image(systemName: "arrow.right.circle")
                    Text("前往设置")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            .padding(.top, 4)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func openScreenTimeSettings() {
        if let url = URL(string: "App-prefs:SCREEN_TIME") {
            UIApplication.shared.open(url)
        } else if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }

    private func openNotificationSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

struct StepRow: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 24, height: 24)
                .background(Color.blue)
                .clipShape(Circle())

            Text(text)
                .font(.subheadline)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
