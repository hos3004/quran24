package com.quran24.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
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
import android.webkit.JavascriptInterface
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
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import androidx.webkit.WebViewCompat
import org.json.JSONObject

class MainActivity : Activity() {
    private lateinit var root: FrameLayout
    private var webView: WebView? = null
    private var nativePlayer: ExoPlayer? = null
    private var nativePlayerView: PlayerView? = null
    private var nativePlaybackItemId: String? = null
    private var nativePlaybackSource: String? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var pageLoadedAtElapsedMs = 0L
    private var lastHeartbeatElapsedMs = 0L
    private var lastWatchdogReloadElapsedMs = 0L
    private var consecutiveWatchdogReloads = 0
    private var activeBridgeItemId: String? = null
    private var activeBridgePage: Int? = null
    private val watchdogRunnable = object : Runnable {
        override fun run() {
            checkHeartbeatWatchdog()
            mainHandler.postDelayed(this, WATCHDOG_CHECK_INTERVAL_MS)
        }
    }
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
        startWatchdog()
        loadChannel(resetWatchdogAttempts = true)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (applyIntentChannelUrl(intent)) {
            loadChannel(resetWatchdogAttempts = true)
        }
    }

    override fun onDestroy() {
        mainHandler.removeCallbacks(watchdogRunnable)
        unregisterBackHandler()
        releaseNativePlayer(sendResumeCommand = false)
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
        nativePlayer?.play()
    }

    override fun onPause() {
        nativePlayer?.pause()
        super.onPause()
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (nativePlayerView == null && isSettingsShortcut(event)) {
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
        if (nativePlayerView != null) {
            releaseNativePlayer(sendResumeCommand = true)
            return
        }

        val currentWebView = webView
        if (currentWebView?.canGoBack() == true) {
            currentWebView.goBack()
        } else {
            moveTaskToBack(true)
        }
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    private fun loadChannel(resetWatchdogAttempts: Boolean = false) {
        val channelUrl = ChannelPreferences.getChannelUrl(this)
        if (resetWatchdogAttempts) {
            consecutiveWatchdogReloads = 0
        }
        releaseNativePlayer(sendResumeCommand = false)
        markChannelLoading()
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
            addJavascriptInterface(ChannelAndroidBridge(), "Quran24Android")
            addJavascriptInterface(ChannelAndroidBridge(), "AndroidBridge")
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
        releaseNativePlayer(sendResumeCommand = false)
        webView?.destroy()
        webView = null
        pageLoadedAtElapsedMs = 0L
        lastHeartbeatElapsedMs = 0L
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
        val retry = recoveryButton(getString(R.string.retry)) { loadChannel(resetWatchdogAttempts = true) }
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

    private fun startWatchdog() {
        mainHandler.removeCallbacks(watchdogRunnable)
        mainHandler.postDelayed(watchdogRunnable, WATCHDOG_CHECK_INTERVAL_MS)
    }

    private fun markChannelLoading() {
        val now = SystemClock.elapsedRealtime()
        pageLoadedAtElapsedMs = now
        lastHeartbeatElapsedMs = now
        activeBridgeItemId = null
        activeBridgePage = null
    }

    private fun markChannelLoaded() {
        val now = SystemClock.elapsedRealtime()
        pageLoadedAtElapsedMs = now
        lastHeartbeatElapsedMs = now
        consecutiveWatchdogReloads = 0
    }

    private fun handleBridgeMessage(message: String) {
        if (message.length > MAX_BRIDGE_MESSAGE_CHARS) {
            Log.w(TAG, "Ignoring oversized bridge message")
            return
        }

        val event = runCatching { JSONObject(message) }.getOrElse { error ->
            Log.w(TAG, "Ignoring malformed bridge message: ${error.message}")
            return
        }

        when (val type = event.optString("type")) {
            "HEARTBEAT" -> {
                lastHeartbeatElapsedMs = SystemClock.elapsedRealtime()
                consecutiveWatchdogReloads = 0
                activeBridgeItemId = event.optString("currentItemId").takeIf { it.isNotBlank() }
                activeBridgePage = event.optInt("currentPage", 0).takeIf { it > 0 }
                Log.d(TAG, "Heartbeat item=$activeBridgeItemId page=$activeBridgePage")
            }
            "PLAY_VIDEO",
            "PLAY_LIVE_STREAM" -> {
                playNativeMedia(event, isLiveStream = type == "PLAY_LIVE_STREAM")
            }
            "REQUEST_RELOAD" -> {
                Log.w(TAG, "Web runtime requested reload: ${event.optString("reason")}")
                reloadChannel("bridge_request")
            }
            "RUNTIME_ERROR" -> {
                Log.e(TAG, "Web runtime error: ${event.optString("message")}")
            }
            else -> Log.w(TAG, "Unknown bridge event type: $type")
        }
    }

    private fun checkHeartbeatWatchdog() {
        val currentWebView = webView ?: return
        val now = SystemClock.elapsedRealtime()
        val lastHeartbeat = lastHeartbeatElapsedMs.takeIf { it > 0L } ?: pageLoadedAtElapsedMs
        if (lastHeartbeat <= 0L) return

        val stalledForMs = now - lastHeartbeat
        if (stalledForMs < WATCHDOG_STALL_THRESHOLD_MS) return
        if (now - lastWatchdogReloadElapsedMs < WATCHDOG_RELOAD_COOLDOWN_MS) return

        consecutiveWatchdogReloads += 1
        if (consecutiveWatchdogReloads > MAX_CONSECUTIVE_WATCHDOG_RELOADS) {
            Log.e(TAG, "Heartbeat stalled after $consecutiveWatchdogReloads watchdog reload attempts")
            showRecovery(getString(R.string.watchdog_recovery_message))
            return
        }

        lastWatchdogReloadElapsedMs = now
        Log.w(
            TAG,
            "Heartbeat stalled for ${stalledForMs}ms; reloading WebView attempt $consecutiveWatchdogReloads"
        )
        currentWebView.post { reloadChannel("heartbeat_watchdog") }
    }

    private fun reloadChannel(reason: String) {
        val currentWebView = webView
        releaseNativePlayer(sendResumeCommand = false)
        markChannelLoading()
        if (currentWebView == null) {
            Log.w(TAG, "Reload requested without WebView: $reason")
            loadChannel()
            return
        }

        Log.w(TAG, "Reloading channel WebView: $reason")
        currentWebView.reload()
    }

    private fun playNativeMedia(event: JSONObject, isLiveStream: Boolean) {
        val itemId = event.optString("itemId").takeIf { it.isNotBlank() }
        val source = event.optString("source").takeIf { it.isNotBlank() }
        val title = event.optString("title").takeIf { it.isNotBlank() } ?: itemId ?: getString(R.string.app_name)

        if (itemId == null || source == null) {
            Log.w(TAG, "Ignoring native media event with missing itemId or source")
            return
        }

        if (nativePlaybackItemId == itemId && nativePlaybackSource == source && nativePlayer != null) {
            Log.d(TAG, "Native player already active for item=$itemId")
            return
        }

        releaseNativePlayer(sendResumeCommand = false)
        activeBridgeItemId = itemId
        nativePlaybackItemId = itemId
        nativePlaybackSource = source

        val playerView = PlayerView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.BLACK)
            useController = true
            keepScreenOn = true
            isFocusable = true
        }

        val player = ExoPlayer.Builder(this).build().apply {
            addListener(NativePlayerListener(itemId))
            val mediaItem = MediaItem.Builder()
                .setMediaId(itemId)
                .setUri(source)
                .setMediaMetadata(
                    androidx.media3.common.MediaMetadata.Builder()
                        .setTitle(title)
                        .build()
                )
                .apply {
                    if (isLiveStream || source.contains(".m3u8", ignoreCase = true)) {
                        setMimeType(MimeTypes.APPLICATION_M3U8)
                    }
                }
                .build()

            setMediaItem(mediaItem)
            val offsetMs = (event.optDouble("offsetSec", 0.0).takeIf { it > 0.0 } ?: 0.0) * 1000
            if (offsetMs > 0) {
                seekTo(offsetMs.toLong())
            }
            prepare()
            playWhenReady = true
        }

        nativePlayer = player
        nativePlayerView = playerView
        playerView.player = player
        root.addView(playerView)
        playerView.requestFocus()
        Log.i(TAG, "Native Media3 playback started item=$itemId live=$isLiveStream source=$source")
    }

    private fun releaseNativePlayer(sendResumeCommand: Boolean) {
        val releasedItemId = nativePlaybackItemId
        nativePlayerView?.player = null
        nativePlayer?.release()
        nativePlayer = null
        nativePlaybackItemId = null
        nativePlaybackSource = null
        nativePlayerView?.let { view ->
            if (view.parent === root) {
                root.removeView(view)
            }
        }
        nativePlayerView = null
        webView?.requestFocus()

        if (sendResumeCommand) {
            sendWebRuntimeCommand(JSONObject().put("type", "RESUME_CHANNEL"))
            Log.i(TAG, "Native playback released item=$releasedItemId")
        }
    }

    private fun sendWebRuntimeCommand(command: JSONObject) {
        val serialized = JSONObject.quote(command.toString())
        webView?.evaluateJavascript(
            "window.quran24ReceiveCommand && window.quran24ReceiveCommand($serialized);",
            null
        )
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
        override fun onPageFinished(view: WebView, url: String) {
            markChannelLoaded()
            sendWebRuntimeCommand(JSONObject().put("type", "RESUME_CHANNEL"))
        }

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

    private inner class ChannelAndroidBridge {
        @JavascriptInterface
        fun postMessage(message: String) {
            mainHandler.post { handleBridgeMessage(message) }
        }
    }

    private inner class NativePlayerListener(private val itemId: String) : Player.Listener {
        override fun onPlaybackStateChanged(playbackState: Int) {
            if (playbackState == Player.STATE_ENDED) {
                sendWebRuntimeCommand(JSONObject()
                    .put("type", "VIDEO_FINISHED")
                    .put("itemId", itemId)
                )
                releaseNativePlayer(sendResumeCommand = true)
            }
        }

        override fun onPlayerError(error: PlaybackException) {
            Log.e(TAG, "Native Media3 playback failed item=$itemId: ${error.message}", error)
            sendWebRuntimeCommand(JSONObject()
                .put("type", "VIDEO_FAILED")
                .put("itemId", itemId)
                .put("message", error.message ?: "Native playback failed")
            )
            releaseNativePlayer(sendResumeCommand = true)
        }
    }

    companion object {
        private const val TAG = "Quran24TV"
        private const val WATCHDOG_CHECK_INTERVAL_MS = 5_000L
        private const val WATCHDOG_STALL_THRESHOLD_MS = 20_000L
        private const val WATCHDOG_RELOAD_COOLDOWN_MS = 15_000L
        private const val MAX_CONSECUTIVE_WATCHDOG_RELOADS = 3
        private const val MAX_BRIDGE_MESSAGE_CHARS = 16_384
        const val EXTRA_CHANNEL_URL = "channel_url"
    }
}
