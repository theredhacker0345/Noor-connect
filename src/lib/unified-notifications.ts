/**
 * Unified Notification System
 * Consolidates all notification functionality into a single, reliable system
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { PRAYER_QUOTES } from './prayer-quotes';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, unknown>;
}

class UnifiedNotificationService {
  private isSupported: boolean;
  private permission: NotificationPermission = 'default';
  private isCapacitor: boolean;

  constructor() {
    this.isSupported = 'Notification' in window;
    this.isCapacitor = !!(window as unknown as { Capacitor?: unknown }).Capacitor;
    this.permission = this.isSupported ? Notification.permission : 'default';
  }

  // Check if notifications are supported
  isNotificationSupported(): boolean {
    // Web notifications require HTTPS (except localhost)
    if (!this.isCapacitor && this.isSupported) {
      const isSecure = location.protocol === 'https:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1';
      return isSecure;
    }
    return this.isCapacitor;
  }

  // Helper to generate safe 32-bit integer ID for Android LocalNotifications (max 2,147,483,647)
  private generateSafeId(): number {
    return Math.floor(Math.random() * 1000000000) + 1000;
  }

  // Ensure high-importance notification channel exists on Android 8.0+ (API 26+)
  private async ensureChannelCreated(): Promise<string> {
    const channelId = 'noor_notifications_channel';
    if (this.isCapacitor) {
      try {
        await LocalNotifications.createChannel({
          id: channelId,
          name: 'Noor Connect Notifications',
          description: 'Prayer times and daily spiritual reminders',
          importance: 5, // High importance (shows heads-up banner + sound)
          visibility: 1, // Visible on lock screen
          sound: 'default',
          vibration: true,
        });
      } catch (err) {
        console.warn('Failed to create notification channel:', err);
      }
    }
    return channelId;
  }

  // Get current permission status
  async getPermissionStatus(): Promise<NotificationPermission> {
    if (this.isCapacitor) {
      try {
        const result = await LocalNotifications.checkPermissions();
        if (result.display === 'granted') return 'granted';
        if (result.display === 'denied') return 'denied';
        return 'default';
      } catch (error) {
        console.warn('Failed to check Capacitor notification permissions:', error);
        return 'denied';
      }
    }

    // Web fallback
    if (!this.isSupported) return 'denied';
    return Notification.permission;
  }

  // Check if we are running in an app wrapper
  isRunningAsNativeApp(): boolean {
    return this.isCapacitor;
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!this.isNotificationSupported()) {
      console.warn('Notifications not supported on this device');
      return false;
    }

    if (this.isCapacitor) {
      try {
        const result = await LocalNotifications.requestPermissions();
        this.permission = result.display === 'granted' ? 'granted' : 'denied';
        if (this.permission === 'granted') {
          await this.ensureChannelCreated();
        }
        return this.permission === 'granted';
      } catch (error) {
        console.error('Failed to request Capacitor notification permission:', error);
        return false;
      }
    }

    // Web Notifications
    try {
      // Compatibility for older browsers that don't return a promise
      const permission = await new Promise<NotificationPermission>((resolve) => {
        const result = Notification.requestPermission(resolve);
        if (result && (result as any).then) {
          (result as any).then(resolve);
        }
      });

      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request web notification permission:', error);
      return false;
    }
  }

  // Show a notification
  async showNotification(options: NotificationOptions, immediate: boolean = false): Promise<boolean> {
    const hasPermission = await this.getPermissionStatus();
    if (hasPermission !== 'granted') {
      const requested = await this.requestPermission();
      if (!requested) {
        console.warn('Notification permission not granted');
        return false;
      }
    }

    try {
      if (this.isCapacitor) {
        const channelId = await this.ensureChannelCreated();
        const notificationId = this.generateSafeId();
        const scheduleTime = immediate ? new Date(Date.now() + 500) : new Date();

        await LocalNotifications.schedule({
          notifications: [{
            id: notificationId,
            title: options.title,
            body: options.body,
            schedule: { at: scheduleTime },
            channelId: channelId,
            sound: 'default',
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            iconColor: '#1a4a4a',
            extra: options.data || {}
          }]
        });
      } else {
        // Use Web Notifications API
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: options.tag || 'default',
          requireInteraction: options.requireInteraction || false,
          data: options.data || {}
        });

        // Auto-close after 10 seconds unless interaction is required
        if (!options.requireInteraction) {
          setTimeout(() => notification.close(), 10000);
        }

        // Handle click events
        notification.onclick = () => {
          notification.close();
          window.focus();

          // Navigate if URL provided (only allow relative URLs or same-origin)
          const url = options.data?.url;
          if (typeof url === 'string') {
            try {
              const parsed = new URL(url, window.location.origin);
              if (parsed.origin === window.location.origin) {
                window.location.href = url;
              } else {
                console.warn('Blocked navigation to external URL:', url);
              }
            } catch {
              // Treat as relative URL
              window.location.href = url;
            }
          }
        };
      }

      console.log('Notification sent successfully:', options.title);
      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  // Test notification with detailed debugging
  async testNotification(): Promise<{ success: boolean; details: string; error?: string }> {
    const details: string[] = [];

    details.push(`Platform: ${this.isCapacitor ? 'Capacitor (Mobile)' : 'Web'}`);
    details.push(`Protocol: ${location.protocol}`);
    details.push(`Hostname: ${location.hostname}`);
    details.push(`Supported: ${this.isNotificationSupported()}`);

    // Check HTTPS requirement for web
    if (!this.isCapacitor && this.isSupported) {
      const isSecure = location.protocol === 'https:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1';
      details.push(`Secure context: ${isSecure}`);

      if (!isSecure) {
        const error = 'Web notifications require HTTPS (except localhost)';
        details.push(`ERROR: ${error}`);
        return {
          success: false,
          details: details.join('\n'),
          error
        };
      }
    }

    const permission = await this.getPermissionStatus();
    details.push(`Permission: ${permission}`);

    if (!this.isNotificationSupported()) {
      const error = 'Notifications not supported on this device';
      details.push(`ERROR: ${error}`);
      return {
        success: false,
        details: details.join('\n'),
        error
      };
    }

    if (permission !== 'granted') {
      details.push('Requesting permission...');
      const granted = await this.requestPermission();
      details.push(`Permission requested: ${granted ? 'granted' : 'denied'}`);

      if (!granted) {
        const error = this.isCapacitor 
          ? 'Notification permission denied. Please enable notifications in Android Settings → Apps → Noor Connect → Notifications'
          : 'Notification permission denied. Please enable notifications in your browser settings';
        details.push(`ERROR: ${error}`);
        return {
          success: false,
          details: details.join('\n'),
          error
        };
      }
    }

    // Test immediate notification
    try {
      const directSuccess = await this.showNotification({
        title: '🕌 Test Notification',
        body: 'If you see this, notifications are working correctly!',
        tag: 'test-immediate',
        requireInteraction: false,
        data: { test: true, source: 'immediate' }
      }, true); // Use immediate delivery

      details.push(`Immediate notification: ${directSuccess ? 'success' : 'failed'}`);

      if (!directSuccess) {
        const error = 'Failed to send notification. Check device notification settings.';
        details.push(`ERROR: ${error}`);
        return {
          success: false,
          details: details.join('\n'),
          error
        };
      }

      details.push('Overall test: success');
      return {
        success: true,
        details: details.join('\n')
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      details.push(`ERROR: ${errorMessage}`);
      return {
        success: false,
        details: details.join('\n'),
        error: errorMessage
      };
    }
  }

  // Schedule prayer notification
  async schedulePrayerNotification(
    prayerName: string,
    prayerTime: Date,
    options?: Partial<NotificationOptions>
  ): Promise<boolean> {
    const now = new Date();
    const delay = prayerTime.getTime() - now.getTime();

    if (delay <= 0) {
      console.warn(`Prayer time ${prayerName} is in the past`);
      return false;
    }

    const randomQuote = PRAYER_QUOTES[Math.floor(Math.random() * PRAYER_QUOTES.length)];

    const notificationOptions: NotificationOptions = {
      title: `🕌 ${prayerName} Prayer Time`,
      body: `It's time for ${prayerName} prayer.\n${randomQuote}`,
      tag: `prayer-${prayerName.toLowerCase()}`,
      requireInteraction: true,
      data: { prayerName, url: '/' },
      ...options
    };

    if (this.isCapacitor) {
      try {
        await LocalNotifications.schedule({
          notifications: [{
            id: this.getPrayerNotificationId(prayerName),
            title: notificationOptions.title,
            body: notificationOptions.body,
            schedule: {
              at: prayerTime,
              allowWhileIdle: true
            },
            sound: 'default',
            smallIcon: 'ic_notification',
            iconColor: '#22c55e',
            extra: notificationOptions.data
          }]
        });
        console.log(`Scheduled ${prayerName} notification for ${prayerTime}`);
        return true;
      } catch (error) {
        console.error(`Failed to schedule ${prayerName} notification:`, error);
        return false;
      }
    } else {
      // Web - use setTimeout for scheduling
      setTimeout(async () => {
        try {
          await this.showNotification(notificationOptions);
        } catch (error) {
          console.error('Scheduled notification failed:', error);
        }
      }, delay);

      console.log(`Scheduled ${prayerName} notification for ${prayerTime}`);
      return true;
    }
  }

  // Get notification ID for prayer
  private getPrayerNotificationId(prayerName: string): number {
    const ids: Record<string, number> = {
      'Fajr': 1001,
      'Dhuhr': 1002,
      'Asr': 1003,
      'Maghrib': 1004,
      'Isha': 1005,
      'Suhoor': 2001,
      'Iftar': 2002,
      'Tarawih': 2003,
      'Quran': 2004,
      'Charity': 2005
    };
    if (prayerName.startsWith('Water-')) {
      const minutes = parseInt(prayerName.split('-')[1]);
      return 2100 + (minutes || 0);
    }
    return ids[prayerName] || 1000 + Math.floor(Math.random() * 100);
  }

  // Clear ONLY Ramadan related notifications (avoids clearing daily prayers)
  async clearRamadanNotifications(): Promise<void> {
    if (this.isCapacitor) {
      try {
        const pending = await LocalNotifications.getPending();
        const ramadanTypes = ['Suhoor', 'Iftar', 'Tarawih', 'Quran', 'Charity', 'Water-'];
        const toCancel = pending.notifications.filter(n => {
          if (n.extra && n.extra.prayerName) {
            return ramadanTypes.some(t => n.extra.prayerName.startsWith(t));
          }
          if (n.title && n.title.includes('Ramadan')) {
             return true;
          }
          return false;
        });
        
        if (toCancel.length > 0) {
          await LocalNotifications.cancel({
            notifications: toCancel.map(n => ({ id: n.id }))
          });
          console.log('Cleared Ramadan notifications:', toCancel.length);
        }
      } catch (error) {
        console.error('Failed to clear Capacitor Ramadan notifications:', error);
      }
    }
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    if (this.isCapacitor) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({
            notifications: pending.notifications.map(n => ({ id: n.id }))
          });
        }
      } catch (error) {
        console.error('Failed to clear Capacitor notifications:', error);
      }
    }

    // Close any active web notifications
    if (this.isSupported) {
      // Web notifications don't have a clear all method, but they auto-close
      console.log('Web notifications will auto-close');
    }
  }

  // Get scheduled notifications (Capacitor only)
  async getScheduledNotifications(): Promise<Array<{ id: number; title: string; body: string }>> {
    if (!this.isCapacitor) return [];

    try {
      const pending = await LocalNotifications.getPending();
      return pending.notifications.map(n => ({
        id: n.id,
        title: n.title || '',
        body: n.body || ''
      }));
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }
}

// Singleton instance
export const unifiedNotifications = new UnifiedNotificationService();
