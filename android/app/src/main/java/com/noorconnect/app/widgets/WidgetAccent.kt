package com.noorconnect.app.widgets

import android.content.Context
import androidx.core.content.ContextCompat
import com.noorconnect.app.R

/**
 * Resolves the accent color a user picked in [WidgetConfigureActivity] for a
 * given widget instance. Stored per-widget in the "WidgetConfigPrefs" file.
 *
 * Falls back to emerald when nothing was saved (or an unknown key was read).
 * Consumers apply the returned color via RemoteViews#setTextColor, which is
 * safe on all supported API levels.
 */
object WidgetAccent {

    private const val CONFIG_PREFS = "WidgetConfigPrefs"
    private const val KEY_PREFIX = "widget_accent_"

    fun resolve(context: Context, appWidgetId: Int): Int {
        val prefs = context.getSharedPreferences(CONFIG_PREFS, Context.MODE_PRIVATE)
        val saved = prefs.getString("$KEY_PREFIX$appWidgetId", null) ?: "emerald"
        return ContextCompat.getColor(context, resFor(saved))
    }

    private fun resFor(key: String): Int = when (key.lowercase()) {
        "gold" -> R.color.widget_accent_gold
        "amber" -> R.color.widget_accent_amber
        "blue" -> R.color.widget_accent_blue
        "purple" -> R.color.widget_accent_purple
        "teal" -> R.color.widget_accent_teal
        "red" -> R.color.widget_accent_red
        else -> R.color.widget_accent_emerald
    }
}
