package com.noorconnect.app.widgets.nextprayer

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.noorconnect.app.MainActivity
import com.noorconnect.app.R
import com.noorconnect.app.widgets.WidgetAlarmScheduler
import com.noorconnect.app.widgets.WidgetDeeplink
import com.noorconnect.app.widgets.WidgetForegroundService
import com.noorconnect.app.widgets.WidgetPrefs
import com.noorconnect.app.widgets.WidgetRefreshWorker
import java.util.concurrent.TimeUnit

/**
 * Next Prayer Widget (4×2)
 *
 * Shows:
 *  - Hijri date chip
 *  - "NEXT PRAYER" section label
 *  - Prayer name
 *  - Location
 *  - Progress ring around a live TextClock (zero battery cost — system-rendered)
 *  - Countdown label ("in 3h 24m")
 *
 * The TextClock ticks every second automatically. The countdown label is
 * a static TextView updated by [WidgetRefreshWorker] every 30 min and by
 * [WidgetAlarmReceiver] at each prayer transition.
 *
 * Tap → deep-link to /prayers?focus=next
 */
class NextPrayerWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "NextPrayerWidget"

        fun updateWidget(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_next_prayer)

            val payload = WidgetPrefs.getPrayerPayload(context)

            if (payload == null || payload.prayers.isEmpty()) {
                // Empty state — app never opened
                views.setViewVisibility(R.id.widget_root, View.GONE)
                views.setViewVisibility(R.id.layout_empty, View.VISIBLE)

                // Set empty state message with call-to-action
                views.setTextViewText(R.id.empty_message, context.getString(R.string.widget_empty_message))
                views.setTextViewText(R.id.empty_action, context.getString(R.string.widget_empty_action))

                // Set click listener to open app
                val deeplink = WidgetDeeplink.buildPrayers(focus = "setup")
                val intent = WidgetDeeplink.toIntent(context, deeplink)
                val pi = PendingIntent.getActivity(
                    context,
                    101,
                    intent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.layout_empty, pi)

                mgr.updateAppWidget(appWidgetId, views)
                return
            }

            views.setViewVisibility(R.id.layout_empty, View.GONE)
            views.setViewVisibility(R.id.widget_root, View.VISIBLE)

            val nextIdx = payload.nextPrayerIndex
            val prayers = payload.prayers
            val nextPrayer = prayers.getOrNull(nextIdx)

            if (nextPrayer == null) {
                views.setViewVisibility(R.id.widget_root, View.GONE)
                views.setViewVisibility(R.id.layout_empty, View.VISIBLE)

                // Set empty state message with call-to-action
                views.setTextViewText(R.id.empty_message, context.getString(R.string.widget_empty_message))
                views.setTextViewText(R.id.empty_action, context.getString(R.string.widget_empty_action))

                // Set click listener to open app
                val deeplink = WidgetDeeplink.buildPrayers(focus = "setup")
                val intent = WidgetDeeplink.toIntent(context, deeplink)
                val pi = PendingIntent.getActivity(
                    context,
                    101,
                    intent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.layout_empty, pi)

                mgr.updateAppWidget(appWidgetId, views)
                return
            }

            // ─── Header ───
            views.setTextViewText(R.id.widget_hijri_date, payload.hijriDate.ifEmpty { context.getString(R.string.widget_hijri_default) })
            views.setTextViewText(R.id.widget_location, payload.locationLabel.ifEmpty { context.getString(R.string.widget_location_default) })

            // ─── Prayer name + time ───
            views.setTextViewText(R.id.widget_prayer_name, nextPrayer.name)
            views.setTextViewText(R.id.widget_prayer_time, nextPrayer.formattedTime)

            // ─── Countdown ───
            val now = System.currentTimeMillis()
            val remaining = nextPrayer.time - now
            val countdownStr = formatCountdown(remaining)
            views.setTextViewText(R.id.widget_countdown, countdownStr)

            // ─── Progress ring fill ───
            // NOTE: Do NOT use RemoteViews reflection for setRotation here.
            // View.setRotation only became @RemotableViewMethod in Android 12 (API 31);
            // on API <= 30 the reflection action throws ActionException and the whole
            // widget fails to render ("Problem loading widget"). The level-based arc
            // (setImageLevel on a useLevel=true ring drawable) works on all supported
            // API levels, so it is the single source of truth for ring progress.
            val prevTime = if (nextIdx > 0) {
                prayers[nextIdx - 1].time
            } else {
                // Start of today
                val cal = java.util.Calendar.getInstance()
                cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
                cal.set(java.util.Calendar.MINUTE, 0)
                cal.set(java.util.Calendar.SECOND, 0)
                cal.set(java.util.Calendar.MILLISECOND, 0)
                cal.timeInMillis
            }
            val total = nextPrayer.time - prevTime
            val progress = if (total > 0) {
                ((now - prevTime).toFloat() / total.toFloat()).coerceIn(0f, 1f)
            } else 0f
            views.setInt(R.id.widget_ring_progress, "setImageLevel", (progress * 10000).toInt())

            // ─── Stale data badge (if data is older than 2 hours) ───
            val staleThreshold = 2 * 60 * 60 * 1000L // 2 hours
            val isStale = (now - payload.lastUpdated) > staleThreshold
            views.setViewVisibility(R.id.widget_stale_badge, if (isStale) View.VISIBLE else View.GONE)

            // ─── Accessibility content description ───
            val contentDesc = context.getString(R.string.widget_a11y_next_prayer, nextPrayer.name, countdownStr)
            views.setContentDescription(R.id.widget_root, contentDesc)

            // ─── Tap → deep-link /prayers?focus=next ───
            val deeplink = WidgetDeeplink.buildPrayers(focus = "next")
            val intent = WidgetDeeplink.toIntent(context, deeplink)
            val pi = PendingIntent.getActivity(
                context,
                100,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            mgr.updateAppWidget(appWidgetId, views)
        }

        private fun formatCountdown(remainingMs: Long): String {
            return when {
                remainingMs <= 0 -> "Now"
                remainingMs > 3_600_000L -> {
                    val hours = TimeUnit.MILLISECONDS.toHours(remainingMs)
                    val minutes = TimeUnit.MILLISECONDS.toMinutes(remainingMs) - hours * 60
                    "in ${hours}h ${minutes}m"
                }
                else -> {
                    val minutes = TimeUnit.MILLISECONDS.toMinutes(remainingMs)
                    val seconds = TimeUnit.MILLISECONDS.toSeconds(remainingMs) - minutes * 60
                    "in ${minutes}m ${seconds}s"
                }
            }
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
        // Handle widget resize - update layout based on new size
        val minWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val minHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        val maxWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
        val maxHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
        
        Log.d(TAG, "Widget resized: min=${minWidth}x${minHeight}, max=${maxWidth}x${maxHeight}")
        
        // Trigger update with new dimensions
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onEnabled(context: Context) {
        // Start the foreground service for step detection + location monitoring
        WidgetForegroundService.start(context)
        // Schedule next prayer alarm if we have data
        WidgetPrefs.getPrayerPayload(context)?.let {
            WidgetAlarmScheduler.scheduleNextPrayerAlarm(context, it)
        }
        Log.d(TAG, "Widget enabled — foreground service + alarm scheduled")
    }

    override fun onDisabled(context: Context) {
        // Only stop the shared foreground service / cancel alarms when NO widget
        // of ANY type remains, because other widget types may still need them.
        if (!WidgetForegroundService.hasActiveWidgets(context)) {
            WidgetAlarmScheduler.cancelAllAlarms(context)
            WidgetForegroundService.stop(context)
        }
        Log.d(TAG, "Widget disabled")
    }
}
