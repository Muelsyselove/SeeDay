package com.livedashboard.agent

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val configManager = ConfigManager.getInstance(context)
        if (!configManager.getConfig().isMonitoringEnabled) return
        if (!configManager.isConfigured()) return

        val serviceIntent = Intent(context, MonitorService::class.java).apply {
            action = MonitorService.ACTION_START
        }
        context.startForegroundService(serviceIntent)
    }
}
