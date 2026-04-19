package com.livedashboard.agent

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.ConnectionSpec
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.TlsVersion
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.TimeUnit

class SettingsActivity : AppCompatActivity() {

    private lateinit var configManager: ConfigManager
    private lateinit var etServerUrl: EditText
    private lateinit var etDeviceToken: EditText
    private lateinit var etReportInterval: EditText
    private lateinit var btnTestConnection: Button
    private lateinit var tvTestResult: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        configManager = ConfigManager.getInstance(this)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        etServerUrl = findViewById(R.id.et_server_url)
        etDeviceToken = findViewById(R.id.et_device_token)
        etReportInterval = findViewById(R.id.et_report_interval)
        btnTestConnection = findViewById(R.id.btn_test_connection)
        tvTestResult = findViewById(R.id.tv_test_result)

        val config = configManager.getConfig()
        etServerUrl.setText(config.serverUrl)
        etDeviceToken.setText(config.deviceToken)
        etReportInterval.setText(config.reportIntervalSeconds.toString())

        findViewById<Button>(R.id.btn_save).setOnClickListener {
            saveConfig()
        }

        btnTestConnection.setOnClickListener {
            testConnection()
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    private fun testConnection() {
        val serverUrl = etServerUrl.text.toString().trim().trimEnd('/')
        val token = etDeviceToken.text.toString().trim()

        if (serverUrl.isEmpty()) {
            etServerUrl.error = "请输入服务器地址"
            return
        }

        btnTestConnection.isEnabled = false
        tvTestResult.visibility = View.VISIBLE
        tvTestResult.text = "测试中..."

        lifecycleScope.launch {
            val result = performConnectionTest(serverUrl, token)
            tvTestResult.text = result
            btnTestConnection.isEnabled = true
        }
    }

    private suspend fun performConnectionTest(serverUrl: String, token: String): String = withContext(Dispatchers.IO) {
        val sb = StringBuilder()

        val url = if (serverUrl.startsWith("http://") || serverUrl.startsWith("https://")) serverUrl else "https://$serverUrl"
        val isHttps = url.startsWith("https://")
        val host: String
        val port: Int

        try {
            val uri = java.net.URI(url)
            host = uri.host ?: ""
            port = if (uri.port > 0) uri.port else if (isHttps) 443 else 80
        } catch (e: Exception) {
            return@withContext "URL 解析失败: ${e.message}"
        }

        sb.appendLine("目标: $host:$port (HTTPS=$isHttps)")

        sb.append("DNS 解析: ")
        try {
            val addresses = InetAddress.getAllByName(host)
            sb.appendLine(addresses.joinToString(", ") { it.hostAddress })
        } catch (e: Exception) {
            sb.appendLine("失败 - ${e.javaClass.simpleName}: ${e.message}")
            return@withContext sb.toString()
        }

        sb.append("TCP 连接 ($host:$port): ")
        try {
            val socket = Socket()
            socket.connect(InetSocketAddress(host, port), 10000)
            val latency = socket.soTimeout
            socket.close()
            sb.appendLine("成功")
        } catch (e: Exception) {
            sb.appendLine("失败 - ${e.javaClass.simpleName}: ${e.message}")
            return@withContext sb.toString()
        }

        sb.append("HTTP 请求 (/api/health): ")
        try {
            val client = OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .connectionSpecs(listOf(
                    ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
                        .tlsVersions(TlsVersion.TLS_1_2, TlsVersion.TLS_1_3)
                        .build(),
                    ConnectionSpec.COMPATIBLE_TLS
                ))
                .retryOnConnectionFailure(true)
                .build()

            val requestUrl = "$url/api/health"
            val requestBuilder = Request.Builder().url(requestUrl).get()
            if (token.isNotEmpty()) {
                requestBuilder.addHeader("Authorization", "Bearer $token")
            }
            val request = requestBuilder.build()
            val response = client.newCall(request).execute()
            val body = response.body?.string()?.take(100) ?: ""
            sb.appendLine("HTTP ${response.code} - $body")
        } catch (e: Exception) {
            sb.appendLine("失败 - ${e.javaClass.simpleName}: ${e.message}")
        }

        return@withContext sb.toString()
    }

    private fun saveConfig() {
        val serverUrl = etServerUrl.text.toString().trim()
        val deviceToken = etDeviceToken.text.toString().trim()
        val intervalStr = etReportInterval.text.toString().trim()

        if (serverUrl.isEmpty()) {
            etServerUrl.error = "服务器地址不能为空"
            return
        }

        if (deviceToken.isEmpty()) {
            etDeviceToken.error = "设备 Token 不能为空"
            return
        }

        val interval = intervalStr.toIntOrNull()
        if (interval == null || interval < 10) {
            etReportInterval.error = "上报间隔最少 10 秒"
            return
        }

        configManager.saveServerUrl(serverUrl)
        configManager.saveDeviceToken(deviceToken)
        configManager.saveReportInterval(interval)

        Toast.makeText(this, "配置已保存", Toast.LENGTH_SHORT).show()
        finish()
    }
}
