package com.quran24.tv

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

class HiddenSettingsActivity : Activity() {
    private lateinit var urlInput: EditText
    private lateinit var status: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        urlInput = EditText(this).apply {
            setSingleLine(true)
            setText(ChannelPreferences.getChannelUrl(this@HiddenSettingsActivity))
            setSelectAllOnFocus(true)
            textSize = 18f
            isFocusable = true
        }
        status = TextView(this).apply {
            setTextColor(Color.rgb(145, 163, 175))
            textSize = 16f
            gravity = Gravity.CENTER
        }

        val saveButton = settingsButton(getString(R.string.save)) {
            ChannelPreferences.setChannelUrl(this, urlInput.text.toString())
            status.text = getString(R.string.saved)
        }
        val launchButton = settingsButton(getString(R.string.launch_channel)) {
            ChannelPreferences.setChannelUrl(this, urlInput.text.toString())
            startActivity(Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            })
            finish()
        }
        val resetButton = settingsButton(getString(R.string.reset)) {
            urlInput.setText(getString(R.string.default_channel_url))
            ChannelPreferences.setChannelUrl(this, getString(R.string.default_channel_url))
            status.text = getString(R.string.reset)
        }

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(72, 72, 72, 72)
            setBackgroundColor(Color.rgb(5, 8, 12))
            addView(TextView(this@HiddenSettingsActivity).apply {
                text = getString(R.string.quran24_settings)
                setTextColor(Color.rgb(247, 241, 223))
                textSize = 34f
                gravity = Gravity.CENTER
            })
            addView(urlInput, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = 28
            })
            addView(saveButton)
            addView(launchButton)
            addView(resetButton)
            addView(status)
        }

        setContentView(layout)
        enterImmersiveMode()
        saveButton.requestFocus()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enterImmersiveMode()
    }

    private fun settingsButton(label: String, action: () -> Unit): Button {
        return Button(this).apply {
            text = label
            textSize = 20f
            isFocusable = true
            minWidth = 280
            setTextColor(Color.rgb(247, 241, 223))
            updateButtonFocusState(false)
            setOnFocusChangeListener { view, hasFocus ->
                (view as Button).updateButtonFocusState(hasFocus)
            }
            setOnClickListener { action() }
        }
    }

    private fun Button.updateButtonFocusState(hasFocus: Boolean) {
        val backgroundColor = if (hasFocus) {
            Color.rgb(229, 187, 100)
        } else {
            Color.rgb(70, 75, 80)
        }
        val borderColor = if (hasFocus) {
            Color.rgb(247, 241, 223)
        } else {
            Color.rgb(101, 108, 115)
        }

        background = GradientDrawable().apply {
            cornerRadius = 8f
            setColor(backgroundColor)
            setStroke(if (hasFocus) 4 else 1, borderColor)
        }
        setTextColor(if (hasFocus) Color.rgb(5, 8, 12) else Color.rgb(247, 241, 223))
    }

    private fun enterImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.decorView.windowInsetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        }
    }
}
