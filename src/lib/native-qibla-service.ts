import { Capacitor } from '@capacitor/core';
import { Motion, type OrientationListenerHandle } from '@capacitor/motion';
import { GeolocationService, type LocationCoordinates } from './geolocation-service';
import { calculateQiblaBearing, normalizeDegrees } from './qibla';

export interface QiblaDirectionData {
  isFacingQibla: boolean;
  compassAngle: number;
  needleAngle: number;
  qiblaBearing: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface PermissionStatus {
  permissions: {
    ACCESS_FINE_LOCATION: boolean;
    ACCESS_COARSE_LOCATION: boolean;
  };
  allGranted: boolean;
}

export class NativeQiblaService {
  private static instance: NativeQiblaService;
  private isNative = Capacitor.isNativePlatform();
  private isListening = false;
  private listeners: Set<(data: QiblaDirectionData) => void> = new Set();

  private location: LocationCoordinates | null = null;
  private lastHeading: number | null = null;
  private orientationListener: OrientationListenerHandle | null = null;
  private watchId: string | null = null;

  // Smoothing state
  private lastCompassAngle: number | null = null;
  private smoothingFactor = 0.15;

  static getInstance(): NativeQiblaService {
    if (!NativeQiblaService.instance) {
      NativeQiblaService.instance = new NativeQiblaService();
    }
    return NativeQiblaService.instance;
  }

  async startCompass(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.isListening) {
        return { success: true, message: 'Compass already started' };
      }

      // 1. Get initial location
      try {
        const coords = await GeolocationService.getCurrentPosition();
        this.location = coords;
      } catch (err) {
        console.warn('NativeQiblaService: Initial location failed, using default', err);
        this.location = { latitude: 21.4225, longitude: 39.8262, accuracy: 1000 };
      }

      // 2. Setup Location Watch
      this.watchId = await GeolocationService.watchPosition((coords) => {
        this.location = coords;
        this.updateQiblaData();
      });

      // 3. Setup Orientation Listener using Capacitor Motion
      this.orientationListener = await Motion.addListener('orientation', (event) => {
        if (event.alpha !== null) {
          // alpha is the rotation around the z-axis (0 to 360)
          this.lastHeading = normalizeDegrees(360 - event.alpha);
          this.updateQiblaData();
        }
      });

      this.isListening = true;
      return { success: true, message: 'Compass started successfully' };
    } catch (error) {
      console.error('Failed to start compass:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async stopCompass(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isListening) {
        return { success: true, message: 'Compass already stopped' };
      }

      if (this.orientationListener) {
        this.orientationListener.remove();
        this.orientationListener = null;
      }

      if (this.watchId) {
        await GeolocationService.clearWatch(this.watchId);
        this.watchId = null;
      }

      this.isListening = false;
      return { success: true, message: 'Compass stopped successfully' };
    } catch (error) {
      console.error('Failed to stop compass:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getQiblaDirection(): Promise<{
    success: boolean;
    message: string;
    isListening?: boolean;
  }> {
    return {
      success: true,
      message: 'Qibla tracking status',
      isListening: this.isListening
    };
  }

  async checkPermissions(): Promise<PermissionStatus> {
    const status = await GeolocationService.checkPermissions();
    const granted = status.location === 'granted';
    return {
      permissions: {
        ACCESS_FINE_LOCATION: granted,
        ACCESS_COARSE_LOCATION: granted,
      },
      allGranted: granted,
    };
  }

  onQiblaDirectionChange(callback: (data: QiblaDirectionData) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private updateQiblaData(): void {
    if (!this.location || this.lastHeading === null || !this.isListening) return;

    const qiblaBearing = calculateQiblaBearing(this.location.latitude, this.location.longitude);
    const rawCompass = this.lastHeading;

    // Apply low-pass filter to smooth out jitter
    let smoothedCompass = rawCompass;
    if (this.lastCompassAngle !== null) {
      let diff = rawCompass - this.lastCompassAngle;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      smoothedCompass = (this.lastCompassAngle + diff * this.smoothingFactor + 360) % 360;
    }
    this.lastCompassAngle = smoothedCompass;

    const diff = Math.abs(normalizeDegrees(smoothedCompass - qiblaBearing));
    const isFacingQibla = diff < 10 || diff > 350;

    const data: QiblaDirectionData = {
      isFacingQibla,
      compassAngle: smoothedCompass,
      needleAngle: qiblaBearing,
      qiblaBearing,
      latitude: this.location.latitude,
      longitude: this.location.longitude,
      accuracy: this.location.accuracy,
    };

    this.listeners.forEach(listener => listener(data));
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsNative(): boolean {
    return this.isNative;
  }
}

export const nativeQiblaService = NativeQiblaService.getInstance();
