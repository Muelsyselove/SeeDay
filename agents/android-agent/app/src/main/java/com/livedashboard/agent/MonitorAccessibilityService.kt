package com.livedashboard.agent

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.view.accessibility.AccessibilityEvent

class MonitorAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        serviceInfo = serviceInfo.apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.DEFAULT or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 100
        }
        currentPackageName = ""
        currentWindowTitle = ""
        isServiceRunning = true
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val packageName = event.packageName?.toString() ?: return
        if (packageName == this.packageName) return

        val title = event.text?.joinToString("") ?: ""

        currentPackageName = packageName
        currentWindowTitle = title
        currentIsForeground = true
    }

    override fun onInterrupt() {
        isServiceRunning = false
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        currentPackageName = ""
        currentWindowTitle = ""
    }

    companion object {
        @Volatile
        var isServiceRunning: Boolean = false
            private set

        @Volatile
        var currentPackageName: String = ""
            private set

        @Volatile
        var currentWindowTitle: String = ""
            private set

        @Volatile
        var currentIsForeground: Boolean = true
            private set
    }
}
