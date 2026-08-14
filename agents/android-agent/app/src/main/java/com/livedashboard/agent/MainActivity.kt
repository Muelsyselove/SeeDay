package com.livedashboard.agent

import android.app.AppOpsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Process
import android.provider.Settings
import android.util.Log
import android.view.View
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var configManager: ConfigManager
    private lateinit var tvStatus: TextView
    private lateinit var tvCurrentApp: TextView
    private lateinit var tvLastReport: TextView
    private lateinit var tvServerStatus: TextView
    private lateinit var switchMonitor: Switch
    private lateinit var switchMessageForward: Switch
    private lateinit var switchFileShare: Switch
    private lateinit var tvMovemineStatus: TextView

    private val refreshHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val refreshRunnable = object : Runnable {
        override fun run() {
            updateStatusDisplay()
            refreshHandler.postDelayed(this, 2000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        configManager = ConfigManager.getInstance(this)

        tvStatus = findViewById(R.id.tv_status)
        tvCurrentApp = findViewById(R.id.tv_current_app)
        tvLastReport = findViewById(R.id.tv_last_report)
        tvServerStatus = findViewById(R.id.tv_server_status)
        switchMonitor = findViewById(R.id.switch_monitor)
        switchMessageForward = findViewById(R.id.switch_message_forward)
        switchFileShare = findViewById(R.id.switch_file_share)
        tvMovemineStatus = findViewById(R.id.tv_movemine_status)

        findViewById<View>(R.id.btn_settings).setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        switchMonitor.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                if (!configManager.isConfigured()) {
                    Toast.makeText(this, "请先完成服务器和 Token 配置", Toast.LENGTH_SHORT).show()
                    switchMonitor.isChecked = false
                    return@setOnCheckedChangeListener
                }
                if (!isAccessibilityServiceEnabled()) {
                    Toast.makeText(this, "请先开启无障碍服务", Toast.LENGTH_LONG).show()
                    startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                    switchMonitor.isChecked = false
                    return@setOnCheckedChangeListener
                }
                if (!isUsageStatsGranted()) {
                    Toast.makeText(this, "请授予使用统计权限以获取更准确的前台应用信息", Toast.LENGTH_LONG).show()
                    startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
                }
                startMonitorService()
                configManager.saveMonitoringEnabled(true)
            } else {
                stopMonitorService()
                configManager.saveMonitoringEnabled(false)
            }
        }

        val config = configManager.getConfig()
        switchMessageForward.setOnCheckedChangeListener { _, isChecked ->
            configManager.saveMessageForwardEnabled(isChecked)
            if (isChecked) {
                if (!isNotificationListenerEnabled()) {
                    Toast.makeText(this, "请开启通知监听权限以转发消息", Toast.LENGTH_LONG).show()
                    startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                }
            }
        }

        switchFileShare.setOnCheckedChangeListener { _, isChecked ->
            configManager.saveFileShareEnabled(isChecked)
        }
    }

    override fun onResume() {
        super.onResume()
        updateStatusDisplay()
        refreshHandler.post(refreshRunnable)
    }

    override fun onPause() {
        super.onPause()
        refreshHandler.removeCallbacks(refreshRunnable)
    }

    private fun updateStatusDisplay() {
        val accessibilityEnabled = isAccessibilityServiceEnabled()
        val monitorRunning = MonitorService.isMonitorRunning

        tvStatus.text = when {
            !accessibilityEnabled -> "无障碍服务未启用"
            !monitorRunning -> "监控已停止"
            else -> "监控运行中"
        }

        val currentApp = MonitorAccessibilityService.currentPackageName
        tvCurrentApp.text = if (MonitorAccessibilityService.isServiceRunning && currentApp.isNotEmpty()) {
            currentApp
        } else if (MonitorAccessibilityService.isServiceRunning) {
            "等待应用切换..."
        } else {
            "无障碍服务未连接"
        }

        val lastTime = ApiClient.getInstance(configManager).getLastReportTime()
        tvLastReport.text = if (lastTime > 0) {
            val sdf = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
            sdf.format(java.util.Date(lastTime))
        } else {
            "尚未上报"
        }

        val config = configManager.getConfig()
        tvServerStatus.text = if (config.serverUrl.isNotEmpty()) {
            config.serverUrl
        } else {
            "未配置"
        }

        if (switchMonitor.isChecked != monitorRunning) {
            switchMonitor.setOnCheckedChangeListener(null)
            switchMonitor.isChecked = monitorRunning
            switchMonitor.setOnCheckedChangeListener { _, isChecked ->
                if (isChecked) {
                    if (!configManager.isConfigured()) {
                        Toast.makeText(this, "请先完成服务器和 Token 配置", Toast.LENGTH_SHORT).show()
                        switchMonitor.isChecked = false
                        return@setOnCheckedChangeListener
                    }
                    if (!isAccessibilityServiceEnabled()) {
                        Toast.makeText(this, "请先开启无障碍服务", Toast.LENGTH_LONG).show()
                        startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                        switchMonitor.isChecked = false
                        return@setOnCheckedChangeListener
                    }
                    if (!isUsageStatsGranted()) {
                        Toast.makeText(this, "请授予使用统计权限以获取更准确的前台应用信息", Toast.LENGTH_LONG).show()
                        startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
                    }
                    startMonitorService()
                    configManager.saveMonitoringEnabled(true)
                } else {
                    stopMonitorService()
                    configManager.saveMonitoringEnabled(false)
                }
            }
        }

        val movemineConfigured = config.movemineServerUrl.isNotEmpty() && config.movemineToken.isNotEmpty()
        val notificationEnabled = isNotificationListenerEnabled()

        switchMessageForward.setOnCheckedChangeListener(null)
        switchMessageForward.isChecked = config.messageForwardEnabled
        switchMessageForward.setOnCheckedChangeListener { _, isChecked ->
            configManager.saveMessageForwardEnabled(isChecked)
            if (isChecked && !isNotificationListenerEnabled()) {
                Toast.makeText(this, "请开启通知监听权限以转发消息", Toast.LENGTH_LONG).show()
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        }

        switchFileShare.setOnCheckedChangeListener(null)
        switchFileShare.isChecked = config.fileShareEnabled
        switchFileShare.setOnCheckedChangeListener { _, isChecked ->
            configManager.saveFileShareEnabled(isChecked)
        }

        tvMovemineStatus.text = when {
            !movemineConfigured -> "未配置"
            !notificationEnabled -> "通知监听未开启"
            MessageListenerService.isServiceRunning -> "运行中"
            else -> "已就绪"
        }
    }

    private fun startMonitorService() {
        try {
            val intent = Intent(this, MonitorService::class.java).apply {
                action = MonitorService.ACTION_START
            }
            startForegroundService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "startMonitorService failed", e)
            Toast.makeText(this, "启动监控服务失败：${e.message}", Toast.LENGTH_LONG).show()
            switchMonitor.isChecked = false
        }
    }

    private fun stopMonitorService() {
        try {
            val intent = Intent(this, MonitorService::class.java).apply {
                action = MonitorService.ACTION_STOP
            }
            startService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "stopMonitorService failed", e)
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val expectedComponent = ComponentName(this, MonitorAccessibilityService::class.java)
        val expectedFlat = expectedComponent.flattenToString()
        try {
            val enabledServices = Settings.Secure.getString(
                contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false
            val colonSplitter = android.text.TextUtils.SimpleStringSplitter(':')
            colonSplitter.setString(enabledServices)
            while (colonSplitter.hasNext()) {
                val componentStr = colonSplitter.next()
                if (componentStr.equals(expectedFlat, ignoreCase = true)) {
                    return true
                }
            }
        } catch (_: Exception) {
        }
        return false
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val expectedComponent = ComponentName(this, MessageListenerService::class.java)
        val expectedFlat = expectedComponent.flattenToString()
        try {
            val enabledListeners = Settings.Secure.getString(
                contentResolver,
                "enabled_notification_listeners"
            ) ?: return false
            val colonSplitter = android.text.TextUtils.SimpleStringSplitter(':')
            colonSplitter.setString(enabledListeners)
            while (colonSplitter.hasNext()) {
                val componentStr = colonSplitter.next()
                if (componentStr.equals(expectedFlat, ignoreCase = true)) {
                    return true
                }
            }
        } catch (_: Exception) {
        }
        return false
    }

    private fun isUsageStatsGranted(): Boolean {
        return try {
            val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    packageName
                )
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    packageName
                )
            }
            mode == AppOpsManager.MODE_ALLOWED
        } catch (e: Exception) {
            Log.w(TAG, "isUsageStatsGranted check failed", e)
            false
        }
    }

    companion object {
        private const val TAG = "MainActivity"
    }
}
