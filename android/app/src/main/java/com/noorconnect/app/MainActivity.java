package com.noorconnect.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private static final int EXACT_ALARM_PERMISSION_REQUEST = 9001;
    private static final int BATTERY_OPTIMIZATION_REQUEST = 9002;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Versioned WebView data directory prevents cache corruption across installs/updates
        WebView.setDataDirectorySuffix(BuildConfig.VERSION_NAME);

        registerPlugin(NativeAdhanPlugin.class);
        registerPlugin(BatteryOptimizationPlugin.class);
        super.onCreate(savedInstanceState);

        // Create default notification channel for Capacitor LocalNotifications
        createDefaultNotificationChannel();

        // Request SCHEDULE_EXACT_ALARM permission on Android 12+ (API 31+)
        requestExactAlarmPermission();

        // Request battery optimization whitelist for reliable background playback
        requestBatteryOptimizationWhitelist();

        // Enable Motion Event Splitting on the WebView
        WebView webView = this.getBridge().getWebView();
        if (webView != null) {
            webView.setMotionEventSplittingEnabled(true);
            installRenderProcessCrashHandler(webView);
        }

        // No persistent foreground service needed.
        // Adhan alarms use setAlarmClock() which is Doze-immune.
        // Adhan playback uses a short-lived foreground service started
        // by AdhanAlarmReceiver only when it's time to play.
    }

    /**
     * Register a render-process crash handler.
     *
     * When the WebView renderer process dies (OOM, heavy JS, WebView bugs) the
     * default behaviour is to tear down the whole app — the classic "app closes
     * itself" crash. Returning {@code true} from onRenderProcessGone keeps the
     * app alive; we then reload the page so the user lands back where they were
     * instead of losing the session.
     *
     * Capacitor's BridgeWebViewClient already forwards onRenderProcessGone to
     * registered WebViewListeners, so we hook the Bridge's listener API instead
     * of installing a custom WebViewClient (which would bypass Capacitor's
     * local-server/intercept logic).
     */
    private void installRenderProcessCrashHandler(WebView webView) {
        try {
            getBridge().addWebViewListener(new WebViewListener() {
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    boolean didCrash = detail != null && detail.didCrash();
                    Log.w("MainActivity", "WebView renderer gone. didCrash=" + didCrash
                            + " — reloading instead of killing the app.");
                    // The renderer process is dead; the WebView must be reloaded.
                    view.post(() -> {
                        try {
                            view.loadUrl(getBridge().getLocalUrl());
                        } catch (Exception e) {
                            Log.e("MainActivity", "Failed to reload after renderer crash", e);
                            view.reload();
                        }
                    });
                    return true; // Handle it: keep the app process alive.
                }
            });
        } catch (Throwable t) {
            Log.w("MainActivity", "Could not install render process crash handler", t);
        }
    }

    /**
     * Request SCHEDULE_EXACT_ALARM permission on Android 12+ (API 31+).
     * This is required for exact adhan alarm scheduling (NativeAdhanScheduler).
     */
    private void requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!canScheduleExactAlarms()) {
                // Request the permission
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                startActivityForResult(intent, EXACT_ALARM_PERMISSION_REQUEST);
            } else {
                // Permission already granted
            }
        }
    }

    /**
     * Request battery optimization whitelist so background adhan alarms are not deferred or killed.
     */
    private void requestBatteryOptimizationWhitelist() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getPackageName()));
                startActivityForResult(intent, BATTERY_OPTIMIZATION_REQUEST);
            }
        }
    }

    private boolean canScheduleExactAlarms() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            return am != null && am.canScheduleExactAlarms();
        }
        return true;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == EXACT_ALARM_PERMISSION_REQUEST) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (canScheduleExactAlarms()) {
                    // Permission granted; background work can now run without optimization limits.
                }
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
    }

    /**
     * Forward deep-link intents (noorconnect://app/...) to the JS layer
     * via the App plugin's appUrlOpen event. With launchMode="singleTask",
     * taps on a notification or external link while the app is already
     * running arrive here instead of onCreate.
     */
    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Uri data = intent.getData();
        if (data != null && "noorconnect".equals(data.getScheme())) {
            // BridgeActivity forwards new intents to the App plugin, which fires
            // appUrlOpen on the JS side. Setting the intent first ensures
            // getLaunchUrl() / getIntent() also reflect the deep link.
        }
    }

    /**
     * Create default notification channel for Capacitor LocalNotifications
     * Required for Android 8.0+ (API 26+)
     */
    private void createDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelId = "default";
            String channelName = "Default";
            String channelDescription = "Default notification channel for Noor Connect";

            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    channelName,
                    NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription(channelDescription);
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setShowBadge(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
