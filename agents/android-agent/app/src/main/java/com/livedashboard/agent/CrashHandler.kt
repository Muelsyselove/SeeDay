package com.livedashboard.agent

import android.content.Context
import android.os.Build
import android.util.Log
import java.io.File
import java.io.FileWriter
import java.io.PrintWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CrashHandler private constructor(private val context: Context) : Thread.UncaughtExceptionHandler {

    private val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()

    override fun uncaughtException(t: Thread, e: Throwable) {
        Log.e(TAG, "Uncaught exception in thread: ${t.name}", e)
        saveCrashLog(e)
        defaultHandler?.uncaughtException(t, e)
    }

    private fun saveCrashLog(e: Throwable) {
        try {
            val crashDir = File(context.filesDir, "crash_logs")
            if (!crashDir.exists()) crashDir.mkdirs()

            val sdf = SimpleDateFormat("yyyy-MM-dd_HH-mm-ss", Locale.getDefault())
            val fileName = "crash_${sdf.format(Date())}.log"
            val crashFile = File(crashDir, fileName)

            FileWriter(crashFile, true).use { writer ->
                PrintWriter(writer).use { pw ->
                    pw.println("=== Crash Log ===")
                    pw.println("Time: ${SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.getDefault()).format(Date())}")
                    pw.println("Device: ${Build.MANUFACTURER} ${Build.MODEL}")
                    pw.println("Android: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
                    pw.println("App: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
                    pw.println("Thread: ${Thread.currentThread().name}")
                    pw.println()
                    e.printStackTrace(pw)
                    pw.println()
                }
            }

            val files = crashDir.listFiles()?.sortedBy { it.lastModified() }
            if (files != null && files.size > MAX_CRASH_LOGS) {
                for (i in 0 until files.size - MAX_CRASH_LOGS) {
                    files[i].delete()
                }
            }
        } catch (ex: Exception) {
            Log.e(TAG, "Failed to save crash log", ex)
        }
    }

    companion object {
        private const val TAG = "CrashHandler"
        private const val MAX_CRASH_LOGS = 10

        fun install(context: Context) {
            Thread.setDefaultUncaughtExceptionHandler(CrashHandler(context.applicationContext))
        }

        fun getCrashLogs(context: Context): List<File> {
            val crashDir = File(context.filesDir, "crash_logs")
            if (!crashDir.exists()) return emptyList()
            return crashDir.listFiles()?.sortedByDescending { it.lastModified() } ?: emptyList()
        }
    }
}
