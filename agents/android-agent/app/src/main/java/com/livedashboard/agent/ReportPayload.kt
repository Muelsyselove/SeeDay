package com.livedashboard.agent

data class ReportPayload(
    val appId: String,
    val windowTitle: String,
    val isForeground: Boolean,
    val timestamp: String,
    val extra: ExtraInfo
)

data class ExtraInfo(
    val batteryPercent: Int? = null,
    val batteryCharging: Boolean? = null
)
