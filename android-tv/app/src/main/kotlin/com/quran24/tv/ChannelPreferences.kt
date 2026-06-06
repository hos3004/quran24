package com.quran24.tv

import android.content.Context

object ChannelPreferences {
    private const val PREFERENCES_NAME = "quran24-channel"
    private const val CHANNEL_URL_KEY = "channel_url"

    fun getChannelUrl(context: Context): String {
        val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        return preferences.getString(CHANNEL_URL_KEY, null)?.takeIf { it.isNotBlank() }
            ?: context.getString(R.string.default_channel_url)
    }

    fun setChannelUrl(context: Context, url: String) {
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(CHANNEL_URL_KEY, url.trim())
            .apply()
    }
}
