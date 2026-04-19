package com.livedashboard.agent

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class SettingsActivity : AppCompatActivity() {

    private lateinit var configManager: ConfigManager
    private lateinit var etServerUrl: EditText
    private lateinit var etDeviceToken: EditText
    private lateinit var etReportInterval: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        configManager = ConfigManager.getInstance(this)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        etServerUrl = findViewById(R.id.et_server_url)
        etDeviceToken = findViewById(R.id.et_device_token)
        etReportInterval = findViewById(R.id.et_report_interval)

        val config = configManager.getConfig()
        etServerUrl.setText(config.serverUrl)
        etDeviceToken.setText(config.deviceToken)
        etReportInterval.setText(config.reportIntervalSeconds.toString())

        findViewById<Button>(R.id.btn_save).setOnClickListener {
            saveConfig()
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
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
