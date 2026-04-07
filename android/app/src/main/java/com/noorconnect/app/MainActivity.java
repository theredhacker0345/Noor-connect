package com.noorconnect.app;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        registerPlugin(NativeAdhanPlugin.class);
        super.onCreate(savedInstanceState);

        // Enable Motion Event Splitting on the WebView
        WebView webView = this.getBridge().getWebView();
        if (webView != null) {
            webView.setMotionEventSplittingEnabled(true);
        }

        // No persistent foreground service needed.
        // Adhan alarms use setAlarmClock() which is Doze-immune.
        // Adhan playback uses a short-lived foreground service started
        // by AdhanAlarmReceiver only when it's time to play.
    }
}
