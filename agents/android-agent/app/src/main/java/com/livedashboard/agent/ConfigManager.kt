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
            isMonitoringEnabled = prefs.getBoolean(KEY_MONITORING_ENABLED, false),
            movemineServerUrl = prefs.getString(KEY_MOVEMINE_SERVER_URL, "") ?: "",
            movemineToken = prefs.getString(KEY_MOVEMINE_TOKEN, "") ?: "",
            messageForwardEnabled = prefs.getBoolean(KEY_MESSAGE_FORWARD_ENABLED, false),
            fileShareEnabled = prefs.getBoolean(KEY_FILE_SHARE_ENABLED, false)
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

    fun saveMovemineServerUrl(url: String) {
        prefs.edit().putString(KEY_MOVEMINE_SERVER_URL, url.trimEnd('/')).apply()
    }

    fun saveMovemineToken(token: String) {
        prefs.edit().putString(KEY_MOVEMINE_TOKEN, token.trim()).apply()
    }

    fun saveMessageForwardEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_MESSAGE_FORWARD_ENABLED, enabled).apply()
    }

    fun saveFileShareEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_FILE_SHARE_ENABLED, enabled).apply()
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
        private const val KEY_MOVEMINE_SERVER_URL = "movemine_server_url"
        private const val KEY_MOVEMINE_TOKEN = "movemine_token"
        private const val KEY_MESSAGE_FORWARD_ENABLED = "message_forward_enabled"
        private const val KEY_FILE_SHARE_ENABLED = "file_share_enabled"

        @Volatile
        private var instance: ConfigManager? = null

        fun getInstance(context: Context): ConfigManager {
            return instance ?: synchronized(this) {
                instance ?: ConfigManager(context.applicationContext).also { instance = it }
            }
        }
    }
}
