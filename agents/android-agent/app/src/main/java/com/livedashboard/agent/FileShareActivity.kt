package com.livedashboard.agent

import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class FileShareActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            padding = 48
        }

        val tvFileName = TextView(this).apply {
            textSize = 16f
            text = "文件："
        }
        layout.addView(tvFileName)

        val btnSend = Button(this).apply {
            text = "发送"
            isEnabled = false
        }
        layout.addView(btnSend)

        setContentView(layout)

        val fileUri: Uri? = intent?.getParcelableExtra(Intent.EXTRA_STREAM)
        if (fileUri == null) {
            Toast.makeText(this, "未获取到文件", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        val fileName = queryFileName(fileUri)
        tvFileName.text = "文件：$fileName"
        btnSend.isEnabled = true

        btnSend.setOnClickListener {
            btnSend.isEnabled = false
            lifecycleScope.launch {
                val result = uploadFile(fileUri)
                if (result.isSuccess) {
                    Toast.makeText(this@FileShareActivity, "发送成功", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@FileShareActivity, "发送失败：${result.exceptionOrNull()?.message}", Toast.LENGTH_LONG).show()
                }
                finish()
            }
        }
    }

    private suspend fun uploadFile(fileUri: Uri): Result<Unit> = withContext(Dispatchers.IO) {
        val contentResolver = contentResolver
        val fileSize = contentResolver.openAssetFileDescriptor(fileUri, "r")?.use {
            it.declaredLength
        } ?: -1L

        if (fileSize > MAX_FILE_SIZE) {
            return@withContext Result.failure(IllegalStateException("文件大小超过 2GB 限制"))
        }

        val configManager = ConfigManager.getInstance(this@FileShareActivity)
        val client = MoveMineApiClient.getInstance(configManager)
        client.uploadFile(fileUri, this@FileShareActivity)
    }

    private fun queryFileName(uri: Uri): String {
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
    }
}
