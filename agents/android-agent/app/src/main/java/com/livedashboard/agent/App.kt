package com.livedashboard.agent

import android.app.Application
import android.util.Log

class App : Application() {

    override fun onCreate() {
        super.onCreate()
        CrashHandler.install(this)
        Log.i(TAG, "Application initialized, crash handler installed")
    }

    companion object {
        private const val TAG = "App"
    }
}
