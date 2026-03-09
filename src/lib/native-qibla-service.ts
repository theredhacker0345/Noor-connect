import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

export interface QiblaDirectionData {
  isFacingQibla: boolean;
  compassAngle: number;
  needleAngle: number;
  qiblaBearing: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface LocationAddress {
  address?: string;
  city?: string;
  country?: string;
}

export interface PermissionStatus {
  permissions: {
    ACCESS_FINE_LOCATION: boolean;
    ACCESS_COARSE_LOCATION: boolean;
  };
  allGranted: boolean;
}

export interface QiblaPlugin {
  startCompass(): Promise<{
    success: boolean;
    message: string;
  }>;

  stopCompass(): Promise<{
    success: boolean;
    message: string;
  }>;

  getQiblaDirection(): Promise<{
    success: boolean;
    message: string;
    isListening?: boolean;
  }>;

  checkPermissions(): Promise<PermissionStatus>;

  addListener(
    eventName: 'qiblaDirectionChange',
    listenerFunc: (data: QiblaDirectionData) => void
  ): Promise<any>;

  addListener(
    eventName: 'permissionGranted',
    listenerFunc: (data: { success: boolean; permission: string; message: string }) => void
  ): Promise<any>;

  addListener(
    eventName: 'permissionDenied',
    listenerFunc: (data: { success: boolean; message: string }) => void
  ): Promise<any>;

  addListener(
    eventName: 'locationAddress',
    listenerFunc: (data: LocationAddress) => void
  ): Promise<any>;

  removeAllListeners(): Promise<void>;
}

const QiblaPlugin = registerPlugin<QiblaPlugin>('Qibla', {
  web: () => import('./web-qibla-fallback').then(m => new m.WebQibla()),
});

export class NativeQiblaService {
  private static instance: NativeQiblaService;
  private isNative = Capacitor.isNativePlatform();
  private isListening = false;
  private listeners: Set<(data: QiblaDirectionData) => void> = new Set();

  // Smoothing state
  private lastCompassAngle: number | null = null;
  private lastNeedleAngle: number | null = null;
  private smoothingFactor = 0.15; // Adjust for smoothness (lower = smoother, higher = more responsive)

  static getInstance(): NativeQiblaService {
    if (!NativeQiblaService.instance) {
      NativeQiblaService.instance = new NativeQiblaService();
    }
    return NativeQiblaService.instance;
  }

  async startCompass(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isNative) {
        // Use web fallback
        const result = await QiblaPlugin.startCompass();
        if (result.success) {
          this.isListening = true;
          await this.setupEventListeners();
        }
        return result;
      }

      const result = await QiblaPlugin.startCompass();
      if (result.success) {
        this.isListening = true;
        await this.setupEventListeners();
      }
      return result;
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
      if (!this.isNative) {
        // Use web fallback
        const result = await QiblaPlugin.stopCompass();
        if (result.success) {
          this.isListening = false;
          await this.removeEventListeners();
        }
        return result;
      }

      const result = await QiblaPlugin.stopCompass();
      if (result.success) {
        this.isListening = false;
        await this.removeEventListeners();
      }
      return result;
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
    try {
      if (!this.isNative) {
        // Use web fallback
        return await QiblaPlugin.getQiblaDirection();
      }

      return await QiblaPlugin.getQiblaDirection();
    } catch (error) {
      console.error('Failed to get Qibla direction:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async checkPermissions(): Promise<PermissionStatus> {
    try {
      if (!this.isNative) {
        // For web, return a default permission status
        return {
          permissions: {
            ACCESS_FINE_LOCATION: false,
            ACCESS_COARSE_LOCATION: false,
          },
          allGranted: false,
        };
      }

      return await QiblaPlugin.checkPermissions();
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return {
        permissions: {
          ACCESS_FINE_LOCATION: false,
          ACCESS_COARSE_LOCATION: false,
        },
        allGranted: false,
      };
    }
  }

  onQiblaDirectionChange(callback: (data: QiblaDirectionData) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private async setupEventListeners(): Promise<void> {
    await QiblaPlugin.addListener('qiblaDirectionChange', (data: QiblaDirectionData) => {
      // Apply low-pass filter to smooth out jitter
      let smoothedCompass = data.compassAngle;
      let smoothedNeedle = data.needleAngle;

      if (this.lastCompassAngle !== null) {
        // Handle 360-degree wrap-around for smoothing
        let diff = data.compassAngle - this.lastCompassAngle;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        smoothedCompass = (this.lastCompassAngle + diff * this.smoothingFactor + 360) % 360;
      }

      if (this.lastNeedleAngle !== null) {
        let diff = data.needleAngle - this.lastNeedleAngle;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        smoothedNeedle = (this.lastNeedleAngle + diff * this.smoothingFactor + 360) % 360;
      }

      this.lastCompassAngle = smoothedCompass;
      this.lastNeedleAngle = smoothedNeedle;

      const smoothedData: QiblaDirectionData = {
        ...data,
        compassAngle: smoothedCompass,
        needleAngle: smoothedNeedle
      };

      this.listeners.forEach(listener => listener(smoothedData));
    });

    if (!this.isNative) return;

    await QiblaPlugin.addListener('permissionGranted', (data) => {
      console.log('Permission granted:', data);
    });

    await QiblaPlugin.addListener('permissionDenied', (data) => {
      console.warn('Permission denied:', data);
    });

    await QiblaPlugin.addListener('locationAddress', (data: LocationAddress) => {
      console.log('Location address:', data);
    });
  }

  private async removeEventListeners(): Promise<void> {
    if (!this.isNative) return;
    await QiblaPlugin.removeAllListeners();
    this.listeners.clear();
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsNative(): boolean {
    return this.isNative;
  }
}

export const nativeQiblaService = NativeQiblaService.getInstance();
