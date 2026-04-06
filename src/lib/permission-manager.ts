/**
 * Unified Permission Manager
 * Centralized permission handling for web and mobile platforms
 */

import { unifiedNotifications } from './unified-notifications';
import { GeolocationService } from './geolocation-service';

export type PermissionType = 'location' | 'notifications';

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'not-supported';

export type PlatformType = 'web' | 'mobile';

export interface PermissionInfo {
  type: PermissionType;
  status: PermissionStatus;
  platform: PlatformType;
  title: string;
  description: string;
  rationale: string;
  benefits: string[];
  instructions?: {
    web?: string;
    mobile?: string;
  };
}

export interface PermissionRequestOptions {
  type: PermissionType;
  rationale?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

class PermissionManager {
  private platform: PlatformType;
  private permissionCache: Map<PermissionType, PermissionStatus> = new Map();
  private subscribers: Set<() => void> = new Set();

  constructor() {
    this.platform = this.detectPlatform();
    this.initializeCache();
  }

  private detectPlatform(): PlatformType {
    const capacitor = (window as any).Capacitor;
    if (capacitor && capacitor.isNativePlatform()) {
      return 'mobile';
    }
    return 'web';
  }

  private initializeCache(): void {
    // Initialize cache with default values
    this.permissionCache.set('location', 'prompt');
    this.permissionCache.set('notifications', 'prompt');
  }

  private updateCache(type: PermissionType, status: PermissionStatus): void {
    this.permissionCache.set(type, status);
    this.notifySubscribers();
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(sub => sub());
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getPlatform(): PlatformType {
    return this.platform;
  }

  // Get permission information
  getPermissionInfo(type: PermissionType): PermissionInfo {
    const status = this.permissionCache.get(type) || 'prompt';
    
    const permissionMap: Record<PermissionType, Omit<PermissionInfo, 'type'>> = {
      location: {
        status,
        platform: this.platform,
        title: 'Location Access',
        description: 'Access your device location to provide accurate prayer times based on your current position.',
        rationale: 'Noor Connect needs location access to calculate accurate prayer times for your specific location and provide Qibla direction.',
        benefits: [
          'Accurate prayer times for your location',
          'Automatic Qibla direction',
          'Location-based prayer reminders',
          'Hijri calendar adjustments'
        ],
        instructions: {
          web: 'Click the location icon in your browser address bar and allow location access.',
          mobile: 'Go to Settings → Apps → Noor Connect → Permissions → Location and allow access.'
        }
      },
      notifications: {
        status,
        platform: this.platform,
        title: 'Notification Access',
        description: 'Receive prayer time reminders and Islamic event notifications.',
        rationale: 'Noor Connect needs notification access to remind you of prayer times, Ramadan alerts, and important Islamic events.',
        benefits: [
          'Prayer time reminders (Fajr to Isha)',
          'Ramadan countdowns and alerts',
          'Eid greetings and reminders',
          'Friday Surah Al-Kahf alerts',
          'Daily Hadith notifications'
        ],
        instructions: {
          web: 'Click the lock icon in your browser address bar and allow notifications.',
          mobile: 'Go to Settings → Apps → Noor Connect → Notifications and allow access.'
        }
      }
    };

    return { type, ...permissionMap[type] };
  }

  async getPermissionStatus(type: PermissionType): Promise<PermissionStatus> {
    const cached = this.permissionCache.get(type);
    if (cached && cached !== 'prompt') return cached;

    try {
      let status: PermissionStatus;

      if (type === 'location') {
        status = await this.checkLocationPermission();
      } else if (type === 'notifications') {
        status = await this.checkNotificationPermission();
      } else {
        status = 'not-supported';
      }

      this.updateCache(type, status);
      return status;
    } catch (error) {
      this.updateCache(type, 'denied');
      return 'denied';
    }
  }

  async requestPermission(type: PermissionType): Promise<boolean> {
    try {
      let granted = false;

      if (type === 'location') {
        granted = await this.requestLocationPermission();
      } else if (type === 'notifications') {
        granted = await this.requestNotificationPermission();
      } else {
        throw new Error(`Unsupported permission type: ${type}`);
      }

      this.updateCache(type, granted ? 'granted' : 'denied');
      return granted;
    } catch (error) {
      this.updateCache(type, 'denied');
      return false;
    }
  }

  // Check location permission
  private async checkLocationPermission(): Promise<PermissionStatus> {
    if (!navigator.geolocation) return 'not-supported';

    try {
      const status = await GeolocationService.checkPermissions();
      return status.location as PermissionStatus;
    } catch {
      return 'prompt';
    }
  }

  // Request location permission
  private async requestLocationPermission(): Promise<boolean> {
    try {
      const granted = await GeolocationService.requestPermissions();
      return granted;
    } catch {
      return false;
    }
  }

  // Check notification permission
  private async checkNotificationPermission(): Promise<PermissionStatus> {
    if (this.platform === 'mobile') {
      const status = await unifiedNotifications.getPermissionStatus();
      return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'prompt';
    } else {
      // Web - check if notifications are supported
      if (!('Notification' in window)) return 'not-supported';
      
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      
      return 'prompt';
    }
  }

  // Request notification permission
  private async requestNotificationPermission(): Promise<boolean> {
    return await unifiedNotifications.requestPermission();
  }

  // Get all permissions status
  async getAllPermissions(): Promise<PermissionInfo[]> {
    const permissions: PermissionInfo[] = [];
    
    for (const type of ['location', 'notifications'] as PermissionType[]) {
      await this.getPermissionStatus(type);
      permissions.push(this.getPermissionInfo(type));
    }

    return permissions;
  }

  // Open settings
  openSettings(type: PermissionType): void {
    if (this.platform === 'mobile') {
       // On native, we might use a plugin to open settings, but for now we just log
       console.log(`Opening settings for ${type} on mobile`);
    } else {
       if (type === 'location') {
         window.open('chrome://settings/content/location');
       } else {
         window.open('chrome://settings/content/notifications');
       }
    }
  }
}

// Singleton instance
export const permissionManager = new PermissionManager();
