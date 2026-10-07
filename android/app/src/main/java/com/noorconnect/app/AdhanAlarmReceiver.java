package com.noorconnect.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.util.Log;

/**
 * Receives exact alarm events and starts native adhan playback service.
 * Acquires a WakeLock to prevent the CPU from sleeping before the
 * foreground service has a chance to call startForeground().
 */
public class AdhanAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AdhanAlarmReceiver";

    public static final String ACTION_TRIGGER = "com.noorconnect.app.ACTION_ADHAN_TRIGGER";
    public static final String EXTRA_ALARM_ID = "alarmId";
    public static final String EXTRA_PRAYER_NAME = "prayerName";
    public static final String EXTRA_ADHAN_URL = "adhanUrl";
    public static final String EXTRA_OVERRIDE_SILENT = "overrideSilent";
    public static final String EXTRA_MAX_VOLUME = "maxVolume";

    // Static WakeLock so AdhanPlaybackService can release it
    private static PowerManager.WakeLock sWakeLock;
    private static final Object LOCK = new Object();

    /**
     * Acquire a partial WakeLock that keeps the CPU running until the
     * foreground service is fully started. Times out after 60 seconds
     * as a safety net (longer for tablets with aggressive battery savers).
     */
    static void acquireWakeLock(Context context) {
        synchronized (LOCK) {
            if (sWakeLock != null && sWakeLock.isHeld()) {
                return; // Already held
            }
            PowerManager pm = (PowerManager) context.getApplicationContext()
                    .getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                sWakeLock = pm.newWakeLock(
                        PowerManager.PARTIAL_WAKE_LOCK,
                        "noorconnect:adhan_alarm");
                sWakeLock.setReferenceCounted(false);
                sWakeLock.acquire(60_000); // 60-second safety timeout for slow tablets
                Log.d(TAG, "WakeLock acquired (60s timeout)");
            }
        }
    }

    /**
     * Release the WakeLock (called by AdhanPlaybackService once
     * startForeground() has been invoked).
     */
    public static void releaseWakeLock() {
        synchronized (LOCK) {
            if (sWakeLock != null && sWakeLock.isHeld()) {
                sWakeLock.release();
                Log.d(TAG, "WakeLock released");
            }
            sWakeLock = null;
        }
    }

    /**
     * Trigger haptic feedback for adhan notification
     * Three gentle pulses to indicate prayer time
     */
    private void triggerHapticFeedback(Context context) {
        try {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    // Three gentle pulses for prayer time
                    long[] pattern = {0, 100, 200, 100, 200, 100};
                    VibrationEffect effect = VibrationEffect.createWaveform(pattern, -1);
                    vibrator.vibrate(effect);
                } else {
                    // Legacy vibration for older devices
                    long[] pattern = {0, 100, 200, 100, 200, 100};
                    vibrator.vibrate(pattern, -1);
                }
                Log.d(TAG, "Haptic feedback triggered for adhan");
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to trigger haptic feedback", e);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION_TRIGGER.equals(intent.getAction())) {
            return;
        }

        if (!NativeAdhanScheduler.isEnabled(context)) {
            Log.d(TAG, "Native adhan playback disabled; skipping trigger");
            return;
        }

        // Acquire WakeLock BEFORE starting the service to prevent Doze race condition
        acquireWakeLock(context);

        // Trigger haptic feedback for adhan notification
        triggerHapticFeedback(context);

        int alarmId = intent.getIntExtra(EXTRA_ALARM_ID, -1);
        String prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME);
        String adhanUrl = intent.getStringExtra(EXTRA_ADHAN_URL);
        boolean overrideSilent = intent.getBooleanExtra(EXTRA_OVERRIDE_SILENT, false);
        boolean maxVolume = intent.getBooleanExtra(EXTRA_MAX_VOLUME, false);

        if (alarmId > -1) {
            NativeAdhanScheduler.removeAlarm(context, alarmId);
        }

        Intent playbackIntent = new Intent(context, AdhanPlaybackService.class);
        playbackIntent.setAction(AdhanPlaybackService.ACTION_PLAY);
        playbackIntent.putExtra(EXTRA_ALARM_ID, alarmId);
        playbackIntent.putExtra(EXTRA_PRAYER_NAME, prayerName);
        playbackIntent.putExtra(EXTRA_ADHAN_URL, adhanUrl);
        playbackIntent.putExtra(AdhanPlaybackService.EXTRA_OVERRIDE_SILENT, overrideSilent);
        playbackIntent.putExtra(AdhanPlaybackService.EXTRA_MAX_VOLUME, maxVolume);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(playbackIntent);
            } else {
                context.startService(playbackIntent);
            }
            Log.d(TAG, "Started adhan playback service for " + prayerName);
        } catch (Exception serviceError) {
            Log.e(TAG, "Failed to start adhan playback service", serviceError);
            releaseWakeLock(); // Release if service failed to start
        }
    }
}
