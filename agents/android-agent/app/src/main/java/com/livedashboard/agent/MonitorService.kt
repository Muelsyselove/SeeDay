package com.livedashboard.agent

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*

class MonitorService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var reportJob: Job? = null
    private lateinit var configManager: ConfigManager
    private lateinit var apiClient: ApiClient

    override fun onCreate() {
        super.onCreate()
        configManager = ConfigManager.getInstance(this)
        apiClient = ApiClient.getInstance(configManager)
        createNotificationChannel()
        val notification = buildNotification("监控服务运行中")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startMonitoring()
            ACTION_STOP -> stopMonitoring()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        reportJob?.cancel()
        serviceScope.cancel()
        isMonitorRunning = false
    }

    private fun startMonitoring() {
        if (reportJob?.isActive == true) return
        isMonitorRunning = true

        val interval = configManager.getConfig().reportIntervalSeconds * 1000L

        reportJob = serviceScope.launch {
            while (isActive) {
                performReport()
                delay(interval)
            }
        }

        updateNotification("监控服务运行中 - 上报间隔 ${configManager.getConfig().reportIntervalSeconds}s")
    }

    private fun stopMonitoring() {
        reportJob?.cancel()
        reportJob = null
        isMonitorRunning = false
        updateNotification("监控服务已暂停")
        configManager.saveMonitoringEnabled(false)
    }

    private fun getForegroundApp(): Pair<String, String> {
        if (MonitorAccessibilityService.isServiceRunning && MonitorAccessibilityService.currentPackageName.isNotEmpty()) {
            return Pair(
                MonitorAccessibilityService.currentPackageName,
                MonitorAccessibilityService.currentWindowTitle
            )
        }

        try {
            val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val endTime = System.currentTimeMillis()
            val startTime = endTime - 60000
            val events = usm.queryEvents(startTime, endTime)
            var lastApp = ""
            var lastClass = ""
            while (events.hasNextEvent()) {
                val event = UsageEvents.Event()
                events.getNextEvent(event)
                if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                    lastApp = event.packageName
                    lastClass = event.className
                }
            }
            if (lastApp.isNotEmpty() && lastApp != packageName) {
                return Pair(lastApp, lastClass)
            }
        } catch (_: Exception) {
        }

        // Fallback: use queryUsageStats for more reliable detection
        try {
            val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val endTime = System.currentTimeMillis()
            val startTime = endTime - 60000
            val usageStatsList = usm.queryUsageStats(UsageStatsManager.INTERVAL_BEST, startTime, endTime)
            val foregroundStat = usageStatsList
                .filter { it.packageName != packageName && it.lastTimeUsed > 0 }
                .maxByOrNull { it.lastTimeUsed }
            if (foregroundStat != null) {
                return Pair(foregroundStat.packageName, "")
            }
        } catch (_: Exception) {
        }

        return Pair("", "")
    }

    private suspend fun performReport() {
        val (appId, windowTitle) = getForegroundApp()

        if (appId.isEmpty()) {
            updateNotification("运行中 | 等待检测前台应用...")
            return
        }

        val extra = apiClient.getBatteryInfo(this)
        val c = java.util.Calendar.getInstance()
        val timestamp = "${c.get(java.util.Calendar.YEAR)};${c.get(java.util.Calendar.MONTH) + 1};${c.get(java.util.Calendar.DAY_OF_MONTH)};${String.format("%02d", c.get(java.util.Calendar.HOUR_OF_DAY))}:${String.format("%02d", c.get(java.util.Calendar.MINUTE))}"

        val payload = ReportPayload(
            appId = appId,
            windowTitle = windowTitle,
            isForeground = true,
            timestamp = timestamp,
            extra = extra
        )

        val result = apiClient.report(listOf(payload), this)
        if (result.isSuccess) {
            val lastTime = apiClient.getLastReportTime()
            val timeStr = if (lastTime > 0) {
                val sdf = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
                sdf.format(java.util.Date(lastTime))
            } else "--:--:--"
            updateNotification("运行中 | 上次上报: $timeStr")
        } else {
            updateNotification("运行中 | 上报失败: ${result.exceptionOrNull()?.message?.take(30)}")
        }
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "监控服务",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Live Dashboard Agent 后台监控服务"
            setShowBadge(false)
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun updateNotification(text: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(text))
    }

    companion object {
        const val CHANNEL_ID = "monitor_service_channel"
        const val NOTIFICATION_ID = 1
        const val ACTION_START = "com.livedashboard.agent.START"
        const val ACTION_STOP = "com.livedashboard.agent.STOP"

        @Volatile
        var isMonitorRunning: Boolean = false
            private set
    }
}
