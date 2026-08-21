package com.noorconnect.app.widgets.quranprogress

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.noorconnect.app.R
import com.noorconnect.app.widgets.WidgetDeeplink
import com.noorconnect.app.widgets.WidgetForegroundService
import com.noorconnect.app.widgets.WidgetPrefs
import com.noorconnect.app.widgets.WidgetRefreshWorker

/**
 * Quran Progress Widget (4×2)
 *
 * Shows:
 *  - Section label + daily streak badge
 *  - Progress ring (total %) with % text overlay
 *  - Last read label, current Juz, pages read
 *  - Linear progress bar (Ramadan goal)
 *
 * The web side pushes [QuranProgressPayload] whenever the user finishes
 * a reading session in-app. If no payload exists, the widget renders an
 * empty state with "Open the app to sync".
 *
 * Tap → deep-link to /quran/reading
 */
class QuranProgressWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "QuranProgressWidget"

        fun updateWidget(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_quran_progress)

            val payload = WidgetPrefs.getQuranProgress(context)

            if (payload == null) {
                views.setTextViewText(R.id.widget_streak, context.getString(R.string.widget_quran_progress_streak_format, 0))
                views.setTextViewText(R.id.widget_percent, context.getString(R.string.widget_quran_progress_percent_format, 0))
                views.setTextViewText(R.id.widget_last_read, context.getString(R.string.widget_quran_progress_last_read_format, ""))
                views.setTextViewText(R.id.widget_juz, context.getString(R.string.widget_quran_progress_juz_format, 1))
                views.setTextViewText(R.id.widget_pages, context.getString(R.string.widget_quran_progress_pages_format, 0))
                views.setTextViewText(R.id.widget_goal_label, context.getString(R.string.widget_quran_progress_goal_format, 0))
                views.setProgressBar(R.id.widget_goal_bar, 100, 0, false)
                views.setInt(R.id.widget_ring_progress, "setImageLevel", 0)
            } else {
                // Streak
                views.setTextViewText(R.id.widget_streak, context.getString(R.string.widget_quran_progress_streak_format, payload.dailyStreak))

                // Percent (rounded)
                val pctInt = payload.totalPercent.toInt().coerceIn(0, 100)
                views.setTextViewText(R.id.widget_percent, context.getString(R.string.widget_quran_progress_percent_format, pctInt))

                // Last read
                views.setTextViewText(R.id.widget_last_read, context.getString(R.string.widget_quran_progress_last_read_format, payload.lastReadLabel.ifEmpty { "—" }))

                // Juz + pages
                views.setTextViewText(R.id.widget_juz, context.getString(R.string.widget_quran_progress_juz_format, payload.currentJuz))
                views.setTextViewText(R.id.widget_pages, context.getString(R.string.widget_quran_progress_pages_format, payload.totalPagesRead))

                // Goal
                val goalInt = payload.goalPercent.toInt().coerceIn(0, 100)
                views.setTextViewText(R.id.widget_goal_label, context.getString(R.string.widget_quran_progress_goal_format, goalInt))
                views.setProgressBar(R.id.widget_goal_bar, 100, goalInt, false)

                // Ring fill via drawable level (useLevel=true) — works on all API levels.
                // Do NOT use setRotation reflection here (breaks widgets on API <= 30).
                val progressFraction = (payload.totalPercent / 100f).coerceIn(0f, 1f)
                views.setInt(R.id.widget_ring_progress, "setImageLevel", (progressFraction * 10000).toInt())
            }

            // Stale data badge — only show for non-null payload (0L would always be "stale")
            val now = System.currentTimeMillis()
            val isStale = payload?.let { (now - it.lastReadTimestamp) > 4 * 60 * 60 * 1000L } ?: false
            views.setViewVisibility(R.id.widget_stale_badge, if (isStale) View.VISIBLE else View.GONE)

            // Accessibility content description
            val contentDesc = if (payload != null) {
                context.getString(R.string.widget_a11y_quran_progress, payload.totalPercent.toInt())
            } else {
                context.getString(R.string.widget_a11y_quran_progress_empty)
            }
            views.setContentDescription(R.id.widget_root, contentDesc)

            // Tap → deep-link /quran/reading
            val deeplink = WidgetDeeplink.buildQuranReading()
            val intent = WidgetDeeplink.toIntent(context, deeplink)
            val pi = PendingIntent.getActivity(
                context,
                103,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            mgr.updateAppWidget(appWidgetId, views)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle
    ) {
        val minWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val minHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        val maxWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
        val maxHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
        
        Log.d(TAG, "Widget resized: min=${minWidth}x${minHeight}, max=${maxWidth}x${maxHeight}")
        
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onEnabled(context: Context) {
        WidgetForegroundService.start(context)
        Log.d(TAG, "Widget enabled — foreground service started")
    }

    override fun onDisabled(context: Context) {
        // Only stop the shared foreground service when NO widget of ANY type remains
        if (!WidgetForegroundService.hasActiveWidgets(context)) {
            WidgetForegroundService.stop(context)
        }
        Log.d(TAG, "Widget disabled")
    }
}
