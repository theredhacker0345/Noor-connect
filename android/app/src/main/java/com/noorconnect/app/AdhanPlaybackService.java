package com.noorconnect.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Foreground service that plays adhan audio when native alarms fire.
 */
public class AdhanPlaybackService extends Service {
    private static final String TAG = "AdhanPlaybackService";

    public static final String ACTION_PLAY = "com.noorconnect.app.ACTION_ADHAN_PLAY";
    public static final String ACTION_STOP = "com.noorconnect.app.ACTION_ADHAN_STOP";

    public static final String EXTRA_OVERRIDE_SILENT = "com.noorconnect.app.EXTRA_OVERRIDE_SILENT";
    public static final String EXTRA_MAX_VOLUME = "com.noorconnect.app.EXTRA_MAX_VOLUME";

    private static final String CHANNEL_ID = "adhan_playback_channel";
    private static final int NOTIFICATION_ID = 2102;
    private static final String DEFAULT_ADHAN_URL = "/audio/adhan-makkah.mp3";

    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private int originalVolume;
    private int originalRingerMode;
    private boolean volumeRestored = true;

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_PLAY;

        if (ACTION_STOP.equals(action)) {
            stopPlayback();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        String prayerName = intent != null
                ? intent.getStringExtra(AdhanAlarmReceiver.EXTRA_PRAYER_NAME)
                : "Prayer";
        if (prayerName == null || prayerName.trim().isEmpty()) {
            prayerName = "Prayer";
        }

        String adhanUrl = intent != null
                ? intent.getStringExtra(AdhanAlarmReceiver.EXTRA_ADHAN_URL)
                : DEFAULT_ADHAN_URL;
        if (adhanUrl == null || adhanUrl.trim().isEmpty()) {
            adhanUrl = DEFAULT_ADHAN_URL;
        }

        boolean overrideSilent = intent != null && intent.getBooleanExtra(EXTRA_OVERRIDE_SILENT, false);
        boolean maxVolume = intent != null && intent.getBooleanExtra(EXTRA_MAX_VOLUME, false);

        startForeground(NOTIFICATION_ID, createNotification(prayerName));

        // Release the WakeLock now that startForeground() has been called.
        // This closes the Doze race-condition window opened by AdhanAlarmReceiver.
        AdhanAlarmReceiver.releaseWakeLock();

        playAdhan(adhanUrl, prayerName, overrideSilent, maxVolume);

        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopPlayback();
        super.onDestroy();
    }

    private void playAdhan(String adhanUrl, String prayerName, boolean overrideSilent, boolean maxVolume) {
        stopPlayback();

        // Store original volume and ringer mode before making any changes
        originalVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
        originalRingerMode = audioManager.getRingerMode();
        volumeRestored = false;

        // Override silent mode and set max volume if requested
        if (overrideSilent || maxVolume) {
            try {
                // Request audio focus for alarm usage
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    AudioAttributes audioAttributes = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build();
                    AudioFocusRequest focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                            .setAudioAttributes(audioAttributes)
                            .build();
                    int result = audioManager.requestAudioFocus(focusRequest);
                    if (result != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                        Log.w(TAG, "Failed to get exclusive audio focus");
                    }
                } else {
                    audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC,
                            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
                }

                // For Android P+ (API 28+), we need to check if we can modify ringer mode
                // On newer Android versions, apps cannot easily change ringer mode due to Do Not Disturb restrictions
                if (overrideSilent && Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
                    // Only change ringer mode on older Android versions
                    if (originalRingerMode == AudioManager.RINGER_MODE_SILENT ||
                            originalRingerMode == AudioManager.RINGER_MODE_VIBRATE) {
                        audioManager.setRingerMode(AudioManager.RINGER_MODE_NORMAL);
                        Log.d(TAG, "Overriding silent mode - changed ringer to normal");
                    }
                }

                // Set to max volume for the music stream (adhan will play through this stream)
                if (maxVolume) {
                    int maxMusicVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxMusicVolume,
                            AudioManager.FLAG_SHOW_UI);
                    Log.d(TAG, "Setting volume to maximum: " + maxMusicVolume);
                } else {
                    // If not max volume but overriding silent, set to a reasonable volume (80%)
                    int maxMusicVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                    int targetVolume = Math.max(originalVolume, (int) (maxMusicVolume * 0.8));
                    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, targetVolume,
                            AudioManager.FLAG_SHOW_UI);
                    Log.d(TAG, "Setting volume to reasonable level: " + targetVolume);
                }
            } catch (SecurityException e) {
                Log.e(TAG, "Security exception when trying to override volume/ringer: " + e.getMessage());
                // Continue anyway - the alarm stream might still work even if we can't control system volume
            }
        }

        String dataSource = resolveAdhanDataSource(adhanUrl);
        mediaPlayer = new MediaPlayer();

        try {
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
            mediaPlayer.setAudioAttributes(audioAttributes);

            // CRITICAL FIX for Lenovo tablets and other aggressive battery savers:
            // Keep CPU awake during playback so MediaPlayer doesn't get killed
            mediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);

            mediaPlayer.setOnPreparedListener(MediaPlayer::start);
            mediaPlayer.setOnCompletionListener(mp -> {
                restoreVolumeSettings();
                stopPlayback();
                // Dismiss notification when adhan finishes
                NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (notificationManager != null) {
                    notificationManager.cancel(NOTIFICATION_ID);
                }
                stopForeground(true);
                stopSelf();
            });
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "Adhan media playback error what=" + what + " extra=" + extra);
                restoreVolumeSettings();
                stopPlayback();
                NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (notificationManager != null) {
                    notificationManager.cancel(NOTIFICATION_ID);
                }
                stopForeground(true);
                stopSelf();
                return true;
            });

            mediaPlayer.setDataSource(dataSource);
            mediaPlayer.prepareAsync();
            Log.d(TAG, "Playing " + prayerName + " adhan from " + dataSource);
        } catch (Exception playbackError) {
            Log.e(TAG, "Failed to play adhan from " + dataSource, playbackError);
            playFallbackAlarmTone(prayerName);
        }
    }

    private void playFallbackAlarmTone(String prayerName) {
        stopPlayback();

        // First try the adhan file bundled in res/raw/
        Uri rawUri = Uri.parse(
                "android.resource://" + getPackageName() + "/" + R.raw.adhan_makkah);

        if (rawUri == null) {
            // Last-resort: system alarm tone
            rawUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        }
        if (rawUri == null) {
            rawUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }
        if (rawUri == null) {
            stopForeground(true);
            stopSelf();
            return;
        }

        mediaPlayer = new MediaPlayer();
        try {
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            mediaPlayer.setAudioAttributes(audioAttributes);
            mediaPlayer.setOnPreparedListener(MediaPlayer::start);
            mediaPlayer.setOnCompletionListener(mp -> {
                stopPlayback();
                stopForeground(true);
                stopSelf();
            });
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "Fallback tone failed what=" + what + " extra=" + extra);
                stopPlayback();
                stopForeground(true);
                stopSelf();
                return true;
            });

            mediaPlayer.setDataSource(getApplicationContext(), rawUri);
            mediaPlayer.prepareAsync();
            Log.d(TAG, "Playing fallback adhan from res/raw for " + prayerName);
        } catch (Exception fallbackError) {
            Log.e(TAG, "Failed to play fallback alarm tone", fallbackError);
            stopPlayback();
            stopForeground(true);
            stopSelf();
        }
    }

    private void restoreVolumeSettings() {
        if (volumeRestored || audioManager == null) {
            return;
        }

        try {
            // Abandon audio focus
            audioManager.abandonAudioFocus(null);

            // Restore original volume
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, originalVolume,
                    AudioManager.FLAG_REMOVE_SOUND_AND_VIBRATE);

            // Restore original ringer mode (only on older Android versions)
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
                int currentRingerMode = audioManager.getRingerMode();
                if (currentRingerMode != originalRingerMode) {
                    audioManager.setRingerMode(originalRingerMode);
                }
            }

            volumeRestored = true;
            Log.d(TAG, "Volume and ringer settings restored");
        } catch (SecurityException e) {
            Log.e(TAG, "Failed to restore volume settings: " + e.getMessage());
        }
    }

    private void stopPlayback() {
        if (mediaPlayer == null) {
            return;
        }

        try {
            if (mediaPlayer.isPlaying()) {
                mediaPlayer.stop();
            }
        } catch (IllegalStateException ignored) {
            // Ignore invalid player state on shutdown.
        }

        mediaPlayer.reset();
        mediaPlayer.release();
        mediaPlayer = null;

        // Restore volume settings when playback stops
        restoreVolumeSettings();
    }

    private String resolveAdhanDataSource(String adhanUrl) {
        if (adhanUrl == null || adhanUrl.trim().isEmpty()) {
            return "file:///android_asset/public" + DEFAULT_ADHAN_URL;
        }

        String normalized = adhanUrl.trim();
        if (normalized.startsWith("file://")
                || normalized.startsWith("http://")
                || normalized.startsWith("https://")) {
            return normalized;
        }

        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }

        return "file:///android_asset/public" + normalized;
    }

    private String getPrayerEmoji(String prayerName) {
        if (prayerName == null)
            return "🕌";
        switch (prayerName.toLowerCase(Locale.ROOT)) {
            case "fajr":
                return "🌅";
            case "dhuhr":
                return "☀️";
            case "asr":
                return "🌤️";
            case "maghrib":
                return "🌇";
            case "isha":
                return "🌙";
            default:
                return "🕌";
        }
    }

    private String getPrayerArabic(String prayerName) {
        if (prayerName == null)
            return "الصلاة";
        switch (prayerName.toLowerCase(Locale.ROOT)) {
            case "fajr":
                return "صلاة الفجر";
            case "dhuhr":
                return "صلاة الظهر";
            case "asr":
                return "صلاة العصر";
            case "maghrib":
                return "صلاة المغرب";
            case "isha":
                return "صلاة العشاء";
            default:
                return "الصلاة";
        }
    }

    private Notification createNotification(String prayerName) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int openFlags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        int stopFlags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, openIntent, openFlags);

        Intent stopIntent = new Intent(this, AdhanPlaybackService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(this, 1, stopIntent, stopFlags);

        String emoji = getPrayerEmoji(prayerName);
        String arabic = getPrayerArabic(prayerName);
        String currentTime = new SimpleDateFormat("h:mm a", Locale.getDefault()).format(new Date());

        // Rich expanded text shown in BigText style
        String bigText = arabic + "\n"
                + "It is time to pray " + prayerName + ".\n"
                + "\"Hayya 'ala as-Salah — Come to Prayer\"\n"
                + "Tap to open Noor Connect ✦ " + currentTime;

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(emoji + " " + prayerName + " Prayer Time")
                .setContentText(arabic + " — " + currentTime)
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText(bigText)
                        .setBigContentTitle(emoji + " " + prayerName + " Prayer — " + currentTime)
                        .setSummaryText("Noor Connect 🕌"))
                .setSmallIcon(R.drawable.ic_notification)
                .setColor(0xFF22C55E) // Green accent
                .setColorized(true)
                .setContentIntent(contentIntent)
                .setFullScreenIntent(contentIntent, true)
                .setOngoing(true)
                .setAutoCancel(false)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .addAction(R.drawable.ic_notification, "⏹ Stop Adhan", stopPendingIntent)
                .addAction(R.drawable.ic_notification, "🕌 Open App", contentIntent)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Adhan & Prayer Alerts",
                NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(
                "Shows rich prayer-time notifications and plays the adhan. Disable sound here — the adhan audio is played separately.");
        channel.setSound(null, null);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[] { 0, 250, 150, 250 });
        channel.setShowBadge(true);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
