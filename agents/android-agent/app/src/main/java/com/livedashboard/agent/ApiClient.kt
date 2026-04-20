package com.livedashboard.agent

import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.ConnectionSpec
import okhttp3.TlsVersion
import java.util.concurrent.TimeUnit

class ApiClient(private val configManager: ConfigManager) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .connectionSpecs(listOf(
            ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
                .tlsVersions(TlsVersion.TLS_1_2, TlsVersion.TLS_1_3)
                .build(),
            ConnectionSpec.COMPATIBLE_TLS
        ))
        .retryOnConnectionFailure(true)
        .build()

    private val gson = Gson()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    private val pendingReports = mutableListOf<String>()
    @Volatile
    private var lastReportTime: Long = 0

    suspend fun report(payloads: List<ReportPayload>, context: Context): Result<Unit> =
        withContext(Dispatchers.IO) {
            try {
                val config = configManager.getConfig()
                if (config.serverUrl.isEmpty() || config.deviceToken.isEmpty()) {
                    return@withContext Result.failure(IllegalStateException("服务器地址或设备 Token 未配置"))
                }

                val appIds = payloads.joinToString(";;") { it.appId }
                val windowTitles = payloads.joinToString(";;") { it.windowTitle }
                val isForegrounds = payloads.joinToString(";;") { if (it.isForeground) "1" else "0" }
                val timestamp = payloads.firstOrNull()?.timestamp ?: formatTimestamp()
                val tzOffset = java.util.TimeZone.getDefault().getOffset(System.currentTimeMillis()) / 60000

                val extraObj = mutableMapOf<String, Any>()
                val firstPayload = payloads.firstOrNull()
                firstPayload?.extra?.batteryPercent?.let { extraObj["battery_percent"] = it }
                firstPayload?.extra?.batteryCharging?.let { extraObj["battery_charging"] = it }
                firstPayload?.extra?.screenOn?.let { extraObj["screen_on"] = it }

                val bodyMap = mapOf(
                    "app_id" to appIds,
                    "window_title" to windowTitles,
                    "is_foreground" to isForegrounds,
                    "timestamp" to timestamp,
                    "tz" to tzOffset,
                    "extra" to extraObj
                )

                val jsonBody = gson.toJson(bodyMap)
                val url = "${config.serverUrl}/api/report"

                val request = Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer ${config.deviceToken}")
                    .addHeader("Content-Type", "application/json")
                    .post(jsonBody.toRequestBody(jsonMediaType))
                    .build()

                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    lastReportTime = System.currentTimeMillis()
                    retryPendingReports(config.serverUrl, config.deviceToken)
                    Result.success(Unit)
                } else {
                    val errorBody = response.body?.string() ?: "Unknown error"
                    cacheReport(jsonBody)
                    Result.failure(Exception("服务器返回 ${response.code}: $errorBody"))
                }
            } catch (e: Exception) {
                val jsonBody = buildCacheJson(payloads)
                cacheReport(jsonBody)
                val detail = "${e.javaClass.simpleName}: ${e.message}"
                Result.failure(Exception(detail, e))
            }
        }

    fun getLastReportTime(): Long = lastReportTime

    fun getBatteryInfo(context: Context): ExtraInfo {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val percent = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val charging = bm.isCharging
        return ExtraInfo(batteryPercent = percent, batteryCharging = charging)
    }

    private fun formatTimestamp(): String {
        val c = java.util.Calendar.getInstance()
        return "${c.get(java.util.Calendar.YEAR)};${c.get(java.util.Calendar.MONTH) + 1};${c.get(java.util.Calendar.DAY_OF_MONTH)};${String.format("%02d", c.get(java.util.Calendar.HOUR_OF_DAY))}:${String.format("%02d", c.get(java.util.Calendar.MINUTE))}"
    }

    private fun cacheReport(json: String) {
        synchronized(pendingReports) {
            if (pendingReports.size < 50) {
                pendingReports.add(json)
            }
        }
    }

    private fun buildCacheJson(payloads: List<ReportPayload>): String {
        val appIds = payloads.joinToString(";;") { it.appId }
        val windowTitles = payloads.joinToString(";;") { it.windowTitle }
        val isForegrounds = payloads.joinToString(";;") { if (it.isForeground) "1" else "0" }
        val timestamp = payloads.firstOrNull()?.timestamp ?: formatTimestamp()
        val tzOffset = java.util.TimeZone.getDefault().getOffset(System.currentTimeMillis()) / 60000
        val extraObj = mutableMapOf<String, Any>()
        val firstPayload = payloads.firstOrNull()
        firstPayload?.extra?.batteryPercent?.let { extraObj["battery_percent"] = it }
        firstPayload?.extra?.batteryCharging?.let { extraObj["battery_charging"] = it }
        firstPayload?.extra?.screenOn?.let { extraObj["screen_on"] = it }
        val bodyMap = mapOf(
            "app_id" to appIds,
            "window_title" to windowTitles,
            "is_foreground" to isForegrounds,
            "timestamp" to timestamp,
            "tz" to tzOffset,
            "extra" to extraObj
        )
        return gson.toJson(bodyMap)
    }

    private fun retryPendingReports(serverUrl: String, token: String) {
        val toRetry = synchronized(pendingReports) {
            val copy = pendingReports.toList()
            pendingReports.clear()
            copy
        }
        for (json in toRetry) {
            try {
                val request = Request.Builder()
                    .url("$serverUrl/api/report")
                    .addHeader("Authorization", "Bearer $token")
                    .addHeader("Content-Type", "application/json")
                    .post(json.toRequestBody(jsonMediaType))
                    .build()
                client.newCall(request).execute().close()
            } catch (_: Exception) {
                synchronized(pendingReports) {
                    if (pendingReports.size < 50) pendingReports.add(json)
                }
            }
        }
    }

    companion object {
        @Volatile
        private var instance: ApiClient? = null

        fun getInstance(configManager: ConfigManager): ApiClient {
            return instance ?: synchronized(this) {
                instance ?: ApiClient(configManager).also { instance = it }
            }
        }
    }
}
