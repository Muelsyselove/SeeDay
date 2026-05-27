package com.livedashboard.agent

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MessageListenerService : NotificationListenerService() {

    private val scope = CoroutineScope(Dispatchers.IO)

    private val appMap = mapOf(
        "com.tencent.mobileqq" to "QQ",
        "com.tencent.mm" to "微信",
        "com.alibaba.android.rimet" to "钉钉"
    )

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        if (!appMap.containsKey(packageName)) return

        val configManager = ConfigManager.getInstance(this)
        val config = configManager.getConfig()
        if (!config.messageForwardEnabled) return
        if (config.movemineServerUrl.isEmpty()) return

        val extras = sbn.notification.extras
        val sourceApp = appMap[packageName] ?: return
        val sender = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val content = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val timestamp = SimpleDateFormat("yyyy;MM;dd;HH:mm", Locale.getDefault()).format(Date())

        if (sender.isEmpty() && content.isEmpty()) return

        val client = MoveMineApiClient.getInstance(configManager)
        scope.launch {
            client.sendMessage(sourceApp, sender, content)
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        isServiceRunning = true
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        isServiceRunning = false
    }

    companion object {
        @Volatile
        var isServiceRunning: Boolean = false
    }
}
