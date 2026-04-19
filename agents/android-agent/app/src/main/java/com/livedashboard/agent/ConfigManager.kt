package com.livedashboard.agent

import android.content.Context
import android.content.SharedPreferences

class ConfigManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("live_dashboard_agent", Context.MODE_PRIVATE)

    fun getConfig(): AppConfig {
        return AppConfig(
            serverUrl = prefs.getString(KEY_SERVER_URL, "") ?: "",
            deviceToken = prefs.getString(KEY_DEVICE_TOKEN, "") ?: "",
            reportIntervalSeconds = prefs.getInt(KEY_REPORT_INTERVAL, 30),
            isMonitoringEnabled = prefs.getBoolean(KEY_MONITORING_ENABLED, false)
        )
    }

    fun saveServerUrl(url: String) {
        prefs.edit().putString(KEY_SERVER_URL, url.trimEnd('/')).apply()
    }

    fun saveDeviceToken(token: String) {
        prefs.edit().putString(KEY_DEVICE_TOKEN, token.trim()).apply()
    }

    fun saveReportInterval(seconds: Int) {
        prefs.edit().putInt(KEY_REPORT_INTERVAL, seconds.coerceIn(10, 3600)).apply()
    }

    fun saveMonitoringEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_MONITORING_ENABLED, enabled).apply()
    }

    fun isConfigured(): Boolean {
        val config = getConfig()
        return config.serverUrl.isNotEmpty() && config.deviceToken.isNotEmpty()
    }

    companion object {
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_REPORT_INTERVAL = "report_interval"
        private const val KEY_MONITORING_ENABLED = "monitoring_enabled"

        @Volatile
        private var instance: ConfigManager? = null

        fun getInstance(context: Context): ConfigManager {
            return instance ?: synchronized(this) {
                instance ?: ConfigManager(context.applicationContext).also { instance = it }
            }
        }
    }
}
