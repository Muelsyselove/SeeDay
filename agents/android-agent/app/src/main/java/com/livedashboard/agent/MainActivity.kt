package com.livedashboard.agent

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
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
                startMonitorService()
                configManager.saveMonitoringEnabled(true)
            } else {
                stopMonitorService()
                configManager.saveMonitoringEnabled(false)
            }
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

        tvCurrentApp.text = if (MonitorAccessibilityService.isServiceRunning) {
            MonitorAccessibilityService.currentPackageName.ifEmpty { "无"
            }
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
                    startMonitorService()
                    configManager.saveMonitoringEnabled(true)
                } else {
                    stopMonitorService()
                    configManager.saveMonitoringEnabled(false)
                }
            }
        }
    }

    private fun startMonitorService() {
        val intent = Intent(this, MonitorService::class.java).apply {
            action = MonitorService.ACTION_START
        }
        startForegroundService(intent)
    }

    private fun stopMonitorService() {
        val intent = Intent(this, MonitorService::class.java).apply {
            action = MonitorService.ACTION_STOP
        }
        startService(intent)
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val am = getSystemService(ACCESSIBILITY_SERVICE) as android.view.accessibility.AccessibilityManager
        val enabledServices = am.getEnabledAccessibilityServiceList(
            AccessibilityServiceInfo.FEEDBACK_ALL_MASK
        )

        return enabledServices.any { serviceInfo ->
            serviceInfo.resolveInfo.serviceInfo.packageName == packageName &&
            serviceInfo.resolveInfo.serviceInfo.name.contains("MonitorAccessibilityService")
        }
    }
}
