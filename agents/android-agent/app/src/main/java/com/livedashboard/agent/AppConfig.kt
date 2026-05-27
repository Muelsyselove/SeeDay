package com.livedashboard.agent

data class AppConfig(
    val serverUrl: String = "",
    val deviceToken: String = "",
    val reportIntervalSeconds: Int = 30,
    val isMonitoringEnabled: Boolean = false,
    val movemineServerUrl: String = "",
    val movemineToken: String = "",
    val messageForwardEnabled: Boolean = false,
    val fileShareEnabled: Boolean = false
)
