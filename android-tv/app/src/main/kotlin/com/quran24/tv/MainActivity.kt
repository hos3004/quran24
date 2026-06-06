package com.quran24.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import android.webkit.SslErrorHandler
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.webkit.WebViewCompat

class MainActivity : Activity() {
    private lateinit var root: FrameLayout
    private var webView: WebView? = null
    private val backCallback = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        OnBackInvokedCallback { handleBack() }
    } else {
        null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        applyIntentChannelUrl(intent)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        root = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
            isFocusable = true
            isFocusableInTouchMode = true
        }
        setContentView(root)
        registerBackHandler()
        enterImmersiveMode()
        loadChannel()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (applyIntentChannelUrl(intent)) {
            loadChannel()
        }
    }

    override fun onDestroy() {
        unregisterBackHandler()
        webView?.destroy()
        webView = null
        super.onDestroy()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enterImmersiveMode()
    }

    override fun onResume() {
        super.onResume()
        enterImmersiveMode()
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (isSettingsShortcut(event)) {
            openSettings()
            return true
        }

        return super.dispatchKeyEvent(event)
    }

    @SuppressLint("GestureBackNavigation")
    @Deprecated("Used only on Android versions before OnBackInvokedCallback.")
    override fun onBackPressed() {
        handleBack()
    }

    private fun handleBack() {
        val currentWebView = webView
        if (currentWebView?.canGoBack() == true) {
            currentWebView.goBack()
        } else {
            moveTaskToBack(true)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun loadChannel() {
        val channelUrl = ChannelPreferences.getChannelUrl(this)
        root.removeAllViews()

        val view = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            isFocusable = true
            isFocusableInTouchMode = true
            setBackgroundColor(Color.BLACK)
            webChromeClient = WebChromeClient()
            webViewClient = ChannelWebViewClient()
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            settings.userAgentString = "${settings.userAgentString} Quran24AndroidTV/0.1"
            loadUrl(channelUrl)
        }

        webView = view
        root.addView(view)
        view.requestFocus()
    }

    private fun applyIntentChannelUrl(intent: Intent): Boolean {
        val channelUrl = intent.getStringExtra(EXTRA_CHANNEL_URL)?.takeIf { it.isNotBlank() } ?: return false
        ChannelPreferences.setChannelUrl(this, channelUrl)
        return true
    }

    private fun showRecovery(message: String) {
        webView?.destroy()
        webView = null
        root.removeAllViews()

        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(64, 64, 64, 64)
            setBackgroundColor(Color.rgb(5, 8, 12))
        }

        val title = TextView(this).apply {
            text = getString(R.string.app_name)
            setTextColor(Color.rgb(247, 241, 223))
            textSize = 36f
            gravity = Gravity.CENTER
        }
        val detail = TextView(this).apply {
            text = message
            setTextColor(Color.rgb(145, 163, 175))
            textSize = 20f
            gravity = Gravity.CENTER
            setPadding(0, 18, 0, 30)
        }
        val retry = recoveryButton(getString(R.string.retry)) { loadChannel() }
        val settings = recoveryButton(getString(R.string.settings)) { openSettings() }

        panel.addView(title)
        panel.addView(detail)
        panel.addView(retry)
        panel.addView(settings)
        root.addView(panel, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))
        retry.requestFocus()
    }

    private fun recoveryButton(label: String, action: () -> Unit): Button {
        return Button(this).apply {
            text = label
            textSize = 20f
            isFocusable = true
            minWidth = 260
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

    private fun openSettings() {
        startActivity(Intent(this, HiddenSettingsActivity::class.java))
    }

    private fun isSettingsShortcut(event: KeyEvent): Boolean {
        if (event.action != KeyEvent.ACTION_DOWN) return false

        return when (event.keyCode) {
            KeyEvent.KEYCODE_MENU,
            KeyEvent.KEYCODE_SETTINGS -> true
            KeyEvent.KEYCODE_DPAD_CENTER,
            KeyEvent.KEYCODE_ENTER -> event.isLongPress || event.repeatCount > 0
            else -> false
        }
    }

    private fun registerBackHandler() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                backCallback ?: return
            )
        }
    }

    private fun unregisterBackHandler() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backCallback?.let(onBackInvokedDispatcher::unregisterOnBackInvokedCallback)
        }
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

    private inner class ChannelWebViewClient : WebViewClient() {
        override fun onReceivedError(
            view: WebView,
            request: WebResourceRequest,
            error: WebResourceError
        ) {
            if (request.isForMainFrame) {
                showRecovery("Channel load failed: ${error.description}")
            }
        }

        override fun onReceivedHttpError(
            view: WebView,
            request: WebResourceRequest,
            errorResponse: WebResourceResponse
        ) {
            if (request.isForMainFrame) {
                showRecovery("Channel returned HTTP ${errorResponse.statusCode}")
            }
        }

        override fun onReceivedSslError(
            view: WebView,
            handler: SslErrorHandler,
            error: SslError
        ) {
            handler.cancel()
            showRecovery("Channel SSL error")
        }

        override fun onRenderProcessGone(
            view: WebView,
            detail: RenderProcessGoneDetail
        ): Boolean {
            val packageInfo = WebViewCompat.getCurrentWebViewPackage(this@MainActivity)
            showRecovery("WebView renderer stopped: ${packageInfo?.packageName ?: "unknown"}")
            return true
        }
    }

    companion object {
        const val EXTRA_CHANNEL_URL = "channel_url"
    }
}
