/**
 * Geolocation Service
 * Handles location detection: standard browser API on the web, and on
 * Android a tiny in-app native bridge (LocationPermissionPlugin — pure
 * Android framework APIs, no Google services, F-Droid compliant) for
 * permission check/request. The browser APIs cannot see the Android runtime
 * permission state inside the WebView: navigator.permissions.query with
 * name 'geolocation' always throws there (so the status was stuck on
 * 'prompt') and navigator.geolocation re-requests silently fail on many
 * devices. The actual position fetch keeps using the WebView (Capacitor's
 * WebChromeClient forwards it once the Android permission is granted).
 */

import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

interface LocationPermissionResult {
  location: 'granted' | 'denied' | 'prompt';
  coarseLocation: 'granted' | 'denied' | 'prompt';
}

const LocationPermission = registerPlugin<LocationPermissionPluginInterface>('LocationPermission');

interface LocationPermissionPluginInterface {
  check(): Promise<LocationPermissionResult>;
  request(): Promise<LocationPermissionResult>;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  country?: string;
}

export interface PermissionStatus {
  location: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
  coarseLocation: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
}

export class GeolocationService {
  /**
   * Check if geolocation is supported
   */
  static isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Check current permission status
   */
  static async checkPermissions(): Promise<PermissionStatus> {
    // Native: ask Android about the REAL app permission (live — reflects
    // changes made in the OS settings immediately).
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await LocationPermission.check();
        return {
          location: status.location as PermissionStatus['location'],
          coarseLocation: status.coarseLocation as PermissionStatus['coarseLocation'],
        };
      } catch {
        return { location: 'prompt', coarseLocation: 'prompt' };
      }
    }

    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        const state = result.state as 'granted' | 'denied' | 'prompt';
        return {
          location: state,
          coarseLocation: state
        };
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    }

    // Fallback for browsers that don't support permissions.query
    return {
      location: 'prompt',
      coarseLocation: 'prompt'
    };
  }

  static async requestPermissions(): Promise<boolean> {
    // Native: run the real Android runtime-permission dialog via the
    // LocationPermission plugin (no Play services involved).
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await LocationPermission.request();
        if (result.location === 'granted' || result.coarseLocation === 'granted') return true;
        // Re-check live: some OEM dialogs resolve with a stale value.
        const after = await LocationPermission.check();
        return after.location === 'granted' || after.coarseLocation === 'granted';
      } catch {
        return false;
      }
    }
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        (error) => {
          console.warn('Geolocation permission request failed or denied:', error);
          resolve(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }

  static async getCurrentPosition(options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }): Promise<LocationCoordinates> {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000,
      ...options
    };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location access denied. Please enable location permissions.'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information unavailable.'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out.'));
              break;
            default:
              reject(new Error('An unknown error occurred while getting location.'));
              break;
          }
        },
        defaultOptions
      );
    });
  }

  static async watchPosition(
    callback: (position: LocationCoordinates) => void,
    options?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
    }
  ): Promise<string> {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000,
      ...options
    };

    if (!navigator.geolocation) {
      return "";
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        // Silently handle watch errors to avoid spam
      },
      defaultOptions
    );
    return watchId.toString();
  }

  /**
   * Clear position watch
   */
  static async clearWatch(watchId: string): Promise<void> {
    if (watchId) {
      navigator.geolocation.clearWatch(parseInt(watchId, 10));
    }
  }
}
