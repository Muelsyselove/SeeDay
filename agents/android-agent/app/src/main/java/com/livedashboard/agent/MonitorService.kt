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
import android.util.Log
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

    private fun isScreenOn(): Boolean {
        val pm = getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
        return pm.isInteractive
    }

    private val BACKGROUND_BLACKLIST = setOf(
        "com.android.systemui",
        "com.android.launcher",
        "com.android.launcher3",
        "com.android.settings",
        "com.android.packageinstaller",
        "com.android.vending",
        "com.google.android.packageinstaller",
        "com.android.permissioncontroller",
        "com.android.inputmethod.latin",
        "com.google.android.inputmethod.latin",
        "com.sohu.inputmethod.sogou",
        "com.iflytek.inputmethod",
        packageName
    )

    private fun getBackgroundApps(foregroundAppId: String): List<Pair<String, String>> {
        val backgroundApps = mutableListOf<Pair<String, String>>()
        try {
            val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val endTime = System.currentTimeMillis()
            val startTime = endTime - 5 * 60 * 1000L
            val usageStatsList = usm.queryUsageStats(UsageStatsManager.INTERVAL_BEST, startTime, endTime)

            val recentApps = usageStatsList
                .filter { it.packageName != packageName && it.lastTimeUsed > 0 }
                .filter { it.packageName !in BACKGROUND_BLACKLIST }
                .filter { it.packageName != foregroundAppId }
                .sortedByDescending { it.lastTimeUsed }
                .take(10)

            for (stat in recentApps) {
                backgroundApps.add(Pair(stat.packageName, ""))
            }

            Log.d(TAG, "getBackgroundApps: found ${backgroundApps.size} background apps (fg=$foregroundAppId)")
        } catch (e: Exception) {
            Log.w(TAG, "getBackgroundApps: query failed", e)
        }
        return backgroundApps
    }

    private fun getForegroundApp(): Pair<String, String> {
        if (MonitorAccessibilityService.isServiceRunning && MonitorAccessibilityService.currentPackageName.isNotEmpty()) {
            Log.d(TAG, "getForegroundApp: accessibility -> ${MonitorAccessibilityService.currentPackageName}")
            return Pair(
                MonitorAccessibilityService.currentPackageName,
                MonitorAccessibilityService.currentWindowTitle
            )
        }

        Log.d(TAG, "getForegroundApp: accessibility not available (running=${MonitorAccessibilityService.isServiceRunning}, pkg=${MonitorAccessibilityService.currentPackageName}), trying UsageStatsManager")

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
                Log.d(TAG, "getForegroundApp: events -> $lastApp")
                return Pair(lastApp, lastClass)
            }
        } catch (e: Exception) {
            Log.w(TAG, "getForegroundApp: events query failed", e)
        }

        try {
            val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val endTime = System.currentTimeMillis()
            val startTime = endTime - 60000
            val usageStatsList = usm.queryUsageStats(UsageStatsManager.INTERVAL_BEST, startTime, endTime)
            val foregroundStat = usageStatsList
                .filter { it.packageName != packageName && it.lastTimeUsed > 0 }
                .maxByOrNull { it.lastTimeUsed }
            if (foregroundStat != null) {
                Log.d(TAG, "getForegroundApp: usageStats -> ${foregroundStat.packageName}")
                return Pair(foregroundStat.packageName, "")
            }
            Log.d(TAG, "getForegroundApp: usageStats returned ${usageStatsList.size} entries, none usable")
        } catch (e: Exception) {
            Log.w(TAG, "getForegroundApp: usageStats query failed", e)
        }

        Log.w(TAG, "getForegroundApp: all methods failed, returning empty")
        return Pair("", "")
    }

    private suspend fun performReport() {
        val (appId, windowTitle) = getForegroundApp()

        if (appId.isEmpty()) {
            val a11yRunning = MonitorAccessibilityService.isServiceRunning
            val a11yPkg = MonitorAccessibilityService.currentPackageName
            updateNotification("运行中 | 无前台应用 (a11y=$a11yRunning pkg=$a11yPkg)")
            return
        }

        val extra = apiClient.getBatteryInfo(this).copy(screenOn = isScreenOn())
        val c = java.util.Calendar.getInstance()
        val timestamp = "${c.get(java.util.Calendar.YEAR)};${c.get(java.util.Calendar.MONTH) + 1};${c.get(java.util.Calendar.DAY_OF_MONTH)};${String.format("%02d", c.get(java.util.Calendar.HOUR_OF_DAY))}:${String.format("%02d", c.get(java.util.Calendar.MINUTE))}"

        val payloads = mutableListOf(
            ReportPayload(
                appId = appId,
                windowTitle = windowTitle,
                isForeground = true,
                timestamp = timestamp,
                extra = extra
            )
        )

        val bgApps = getBackgroundApps(appId)
        for ((bgAppId, bgTitle) in bgApps) {
            payloads.add(ReportPayload(
                appId = bgAppId,
                windowTitle = bgTitle,
                isForeground = false,
                timestamp = timestamp,
                extra = extra
            ))
        }

        updateNotification("运行中 | 上报中: $appId +${bgApps.size}后台")
        val result = apiClient.report(payloads, this)
        if (result.isSuccess) {
            val lastTime = apiClient.getLastReportTime()
            val timeStr = if (lastTime > 0) {
                val sdf = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
                sdf.format(java.util.Date(lastTime))
            } else "--:--:--"
            updateNotification("运行中 | 上次上报: $timeStr")
        } else {
            val errMsg = result.exceptionOrNull()?.message?.take(50) ?: "unknown"
            Log.e(TAG, "performReport: report failed: $errMsg")
            updateNotification("运行中 | 上报失败: $errMsg")
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
        private const val TAG = "MonitorService"
        const val CHANNEL_ID = "monitor_service_channel"
        const val NOTIFICATION_ID = 1
        const val ACTION_START = "com.livedashboard.agent.START"
        const val ACTION_STOP = "com.livedashboard.agent.STOP"

        @Volatile
        var isMonitorRunning: Boolean = false
            private set
    }
}
