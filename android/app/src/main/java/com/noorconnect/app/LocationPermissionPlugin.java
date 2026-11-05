package com.noorconnect.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Location runtime-permission bridge — pure Android framework APIs, no
 * Google Play services. The WebView's navigator.permissions API cannot see
 * the Android permission state (so the Privacy page showed a stale status),
 * and navigator.geolocation re-requests silently fail on many devices.
 * Uses Capacitor's annotation permission system, which handles the runtime
 * dialog and its callbacks (including the "denied forever" case).
 */
@CapacitorPlugin(
    name = "LocationPermission",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        )
    }
)
public class LocationPermissionPlugin extends Plugin {

    private static final String PREFS = "location_permission";
    private static final String KEY_ASKED_BEFORE = "asked_before";

    private boolean isGranted() {
        Context ctx = getContext();
        boolean fine = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
        boolean coarse = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
        return fine || coarse;
    }

    private JSObject result(String status) {
        JSObject r = new JSObject();
        r.put("location", status);
        r.put("coarseLocation", status);
        return r;
    }

    /**
     * Live Android permission state: "granted", "prompt" (can still ask) or
     * "denied" (asked before and permanently refused — user must open the
     * OS settings, which the Privacy page offers).
     */
    @PluginMethod
    public void check(PluginCall call) {
        if (isGranted()) {
            call.resolve(result("granted"));
            return;
        }
        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        boolean askedBefore = prefs.getBoolean(KEY_ASKED_BEFORE, false);
        android.app.Activity activity = getActivity();
        if (!askedBefore || activity == null) {
            call.resolve(result("prompt"));
            return;
        }
        boolean canAskAgain = ActivityCompat.shouldShowRequestPermissionRationale(
            activity, Manifest.permission.ACCESS_FINE_LOCATION)
            || ActivityCompat.shouldShowRequestPermissionRationale(
                activity, Manifest.permission.ACCESS_COARSE_LOCATION);
        call.resolve(result(canAskAgain ? "prompt" : "denied"));
    }

    @PluginMethod
    public void request(PluginCall call) {
        if (isGranted()) {
            call.resolve(result("granted"));
            return;
        }
        // Marker so check() can distinguish "never asked" from "denied forever".
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_ASKED_BEFORE, true).apply();
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "onLocationPermissionResult");
        }
    }

    @PermissionCallback
    private void onLocationPermissionResult(PluginCall call) {
        call.resolve(result(isGranted() ? "granted" : "denied"));
    }
}
