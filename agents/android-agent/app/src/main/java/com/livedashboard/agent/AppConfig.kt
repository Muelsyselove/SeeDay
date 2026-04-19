package com.livedashboard.agent

data class AppConfig(
    val serverUrl: String = "",
    val deviceToken: String = "",
    val reportIntervalSeconds: Int = 30,
    val isMonitoringEnabled: Boolean = false
)
