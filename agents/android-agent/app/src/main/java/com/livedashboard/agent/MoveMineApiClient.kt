package com.livedashboard.agent

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.ConnectionSpec
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.TlsVersion
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class MoveMineApiClient(private val configManager: ConfigManager) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
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

    suspend fun sendMessage(sourceApp: String, sender: String, content: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            try {
                val config = configManager.getConfig()
                if (config.movemineServerUrl.isEmpty() || config.movemineToken.isEmpty()) {
                    return@withContext Result.failure(IllegalStateException("MoveMine 服务器地址或 Token 未配置"))
                }

                val timestamp = SimpleDateFormat("yyyy;MM;dd;HH:mm", Locale.getDefault()).format(Date())
                val deviceId = extractDeviceId(config.deviceToken)

                val bodyMap = mapOf(
                    "source_app" to sourceApp,
                    "sender" to sender,
                    "content" to content,
                    "timestamp" to timestamp
                )

                val jsonBody = gson.toJson(bodyMap)
                val url = "${config.movemineServerUrl}/api/movemine/message"

                val request = Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer ${config.movemineToken}:$deviceId")
                    .addHeader("Content-Type", "application/json")
                    .post(jsonBody.toRequestBody(jsonMediaType))
                    .build()

                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    Result.success(Unit)
                } else {
                    val errorBody = response.body?.string() ?: "Unknown error"
                    Result.failure(Exception("服务器返回 ${response.code}: $errorBody"))
                }
            } catch (e: Exception) {
                Result.failure(Exception("${e.javaClass.simpleName}: ${e.message}", e))
            }
        }

    suspend fun uploadFile(fileUri: Uri, context: Context): Result<Unit> =
        withContext(Dispatchers.IO) {
            try {
                val config = configManager.getConfig()
                if (config.movemineServerUrl.isEmpty() || config.movemineToken.isEmpty()) {
                    return@withContext Result.failure(IllegalStateException("MoveMine 服务器地址或 Token 未配置"))
                }

                val deviceId = extractDeviceId(config.deviceToken)
                val contentResolver = context.contentResolver

                val fileSize = contentResolver.openAssetFileDescriptor(fileUri, "r")?.use {
                    it.declaredLength
                } ?: -1L

                if (fileSize > MAX_FILE_SIZE) {
                    return@withContext Result.failure(IllegalStateException("文件大小超过 2GB 限制"))
                }

                val fileName = queryFileName(contentResolver, fileUri)
                val mimeType = contentResolver.getType(fileUri) ?: "application/octet-stream"

                val inputStream = contentResolver.openInputStream(fileUri)
                    ?: return@withContext Result.failure(IllegalStateException("无法读取文件"))

                val tempFile = java.io.File.createTempFile("upload_", ".tmp", context.cacheDir)
                tempFile.outputStream().use { output ->
                    inputStream.copyTo(output)
                }
                inputStream.close()

                val requestBody = tempFile.asRequestBody(mimeType.toMediaType())
                val multipartBody = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("file", fileName, requestBody)
                    .build()

                val url = "${config.movemineServerUrl}/api/movemine/file/upload"

                val request = Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer ${config.movemineToken}:$deviceId")
                    .post(multipartBody)
                    .build()

                val response = client.newCall(request).execute()
                tempFile.delete()

                if (response.isSuccessful) {
                    Result.success(Unit)
                } else {
                    val errorBody = response.body?.string() ?: "Unknown error"
                    Result.failure(Exception("服务器返回 ${response.code}: $errorBody"))
                }
            } catch (e: Exception) {
                Result.failure(Exception("${e.javaClass.simpleName}: ${e.message}", e))
            }
        }

    private fun extractDeviceId(deviceToken: String): String {
        val parts = deviceToken.split(":")
        return if (parts.size > 1) parts[1] else deviceToken
    }

    private fun queryFileName(contentResolver: android.content.ContentResolver, uri: Uri): String {
        var name = "unknown_file"
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (cursor.moveToFirst() && nameIndex >= 0) {
                name = cursor.getString(nameIndex)
            }
        }
        return name
    }

    companion object {
        private const val MAX_FILE_SIZE = 2147483648L

        @Volatile
        private var instance: MoveMineApiClient? = null

        fun getInstance(configManager: ConfigManager): MoveMineApiClient {
            return instance ?: synchronized(this) {
                instance ?: MoveMineApiClient(configManager).also { instance = it }
            }
        }
    }
}
