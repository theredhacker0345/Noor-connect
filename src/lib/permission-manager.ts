/**
 * Unified Permission Manager
 * Centralized permission handling for web and mobile platforms
 */

import { unifiedNotifications } from './unified-notifications';
import { GeolocationService } from './geolocation-service';
import { App } from '@capacitor/app';

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
    // Only notify on actual changes: getPermissionStatus() runs a live check on
    // every refresh, and notifying with an unchanged value would make the
    // subscribed UI call it again in an endless loop.
    if (this.permissionCache.get(type) === status) return;
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
        title: 'permLocationTitle',
        description: 'permLocationDesc',
        rationale: 'permLocationRationale',
        benefits: [
          'permLocationBenefit1',
          'permLocationBenefit2',
          'permLocationBenefit3',
          'permLocationBenefit4'
        ],
        instructions: {
          web: 'permLocationWebInstructions',
          mobile: 'permLocationMobileInstructions'
        }
      },
      notifications: {
        status,
        platform: this.platform,
        title: 'permNotifTitle',
        description: 'permNotifDesc',
        rationale: 'permNotifRationale',
        benefits: [
          'permNotifBenefit1',
          'permNotifBenefit2',
          'permNotifBenefit3',
          'permNotifBenefit4',
          'permNotifBenefit5'
        ],
        instructions: {
          web: 'permNotifWebInstructions',
          mobile: 'permNotifMobileInstructions'
        }
      }
    };

    return { type, ...permissionMap[type] };
  }

  async getPermissionStatus(type: PermissionType): Promise<PermissionStatus> {
    // Always perform the live check. The cache is only a synchronous initial
    // value (read by getPermissionInfo) until the first check resolves, plus a
    // change signal for subscribers. Never trust it as the source of truth:
    // the user can grant/revoke permissions in the OS settings at any time.
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

  // Open the OS settings page for this app. Resolves to true when the settings
  // page was opened. On web this returns false: browsers block programmatic
  // navigation to their internal settings pages (e.g. chrome://settings), so
  // the UI falls back to showing step-by-step instructions instead.
  async openSettings(type: PermissionType): Promise<boolean> {
    if (this.platform === 'mobile') {
      try {
        await App.openSettings();
        return true;
      } catch (e) {
        console.warn('Failed to open app settings:', e);
        return false;
      }
    }
    // Web: keep `type` referenced for API symmetry; nothing to open.
    void type;
    return false;
  }
}

// Singleton instance
export const permissionManager = new PermissionManager();
