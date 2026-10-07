/**
 * Local Notifications Service
 * Handles prayer time reminders using Capacitor Local Notifications
 * FOSS-friendly - no proprietary wake lock libraries
 */

import { LocalNotifications, type LocalNotificationSchema, LocalNotificationActionType } from '@capacitor/local-notifications';
import { AladhanAPI, type AladhanPrayerTime } from './aladhan-api';
import { getEffectiveAladhanMethodId } from './prayer-method-resolver';
import { getMadhab } from './storage';
import { Capacitor } from '@capacitor/core';
import { getAdhanUrlForPrayer, type PrayerName } from './adhan-preferences';
import { nativeAdhan, type NativeAdhanAlarm } from './native-adhan';
import { adhanService, type AdhanConfig } from './adhan-service';
import { PRAYER_QUOTES } from './prayer-quotes';

// Task 2: Use SW registration for more robust "Native" notifications
let swRegistration: ServiceWorkerRegistration | null = null;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(reg => {
    swRegistration = reg;
  });
}

const LOCATION_STORAGE_KEY = 'location-storage';
const PRAYER_NOTIFICATIONS_ENABLED_KEY = 'prayer-notifications-enabled';
const PRAYER_ALARM_ENABLED_KEY = 'prayer-alarm-enabled';
const LAST_SCHEDULE_SIGNATURE_KEY = 'last-prayer-notification-signature';
const SCHEDULE_WINDOW_DAYS = 30;

if (localStorage.getItem(PRAYER_NOTIFICATIONS_ENABLED_KEY) === null) {
  localStorage.setItem(PRAYER_NOTIFICATIONS_ENABLED_KEY, 'true');
}

type NativeNotificationData = Record<string, unknown> & {
  url?: string;
  tag?: string;
};

type ServiceWorkerPrayerTimings = Record<string, { time: string }>;

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

const getPrayerNotificationMessage = (prayerName: string, prayerTime: string): { title: string; body: string } => {
  const quotes = PRAYER_QUOTES[prayerName] || PRAYER_QUOTES['Default'];
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  return {
    title: `${prayerName} Prayer Time`,
    body: `It's time for ${prayerName} prayer (${prayerTime}).\n${randomQuote}`,
  };
};

export interface PrayerTime {
  name: string;
  time: string;
  date: Date;
}

export interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  scheduleTime: Date;
  prayerName: string;
}

export class LocalNotificationManager {
  private isInitialized: boolean = false;
  private static hasStarted: boolean = false; // Global flag to prevent multiple starts
  private scheduledNotifications: Map<number, ScheduledNotification> = new Map();

  constructor() {
    // Check if LocalNotifications plugin is available
    if (!LocalNotifications) {
      console.warn('LocalNotifications plugin not available');
      return;
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      const permission = await LocalNotifications.checkPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
      return false;
    }
  }

  /**
   * Request notification permissions (call this only when user toggles switch)
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const permission = await LocalNotifications.requestPermissions();

      if (permission.display !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Start the notification service (only runs once per app load)
   */
  async start(): Promise<void> {
    // Prevent multiple starts
    if (LocalNotificationManager.hasStarted) {
      return;
    }

    LocalNotificationManager.hasStarted = true;
    await this.initialize();
  }

  /**
   * Initialize the local notifications service (without requesting permissions)
   */
  async initialize(): Promise<boolean> {
    try {
      // Only check permissions, don't request them
      const hasPermission = await this.checkPermissions();

      if (!hasPermission) {
        return false;
      }

      // Listen for notification actions (e.g., "Stop Adhan")
      LocalNotifications.addListener('localNotificationActionPerformed', (action: ActionPerformed) => {
        const actionId = action.actionId;
        const notification = action.notification;
        const prayerName = notification?.extra?.prayerName;

        if (actionId === 'stop_adhan') {
          console.log('Stop Adhan action triggered for:', prayerName);
          adhanService.stopAdhan();
        }
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize local notifications:', error);
      return false;
    }
  }

  /**
   * Schedule prayer time notifications using Aladhan API for accurate times
   * Only schedules when location is successfully resolved and times have actually changed
   */
  async schedulePrayerNotificationsFromAPI(): Promise<void> {
    if (!this.arePrayerNotificationsEnabled()) {
      return;
    }

    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return;
    }

    try {
      const storedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (!storedLocation) {
        return;
      }

      const locationData = JSON.parse(storedLocation) as {
        latitude?: number;
        longitude?: number;
        source?: string;
      };

      if (typeof locationData.latitude !== 'number' || typeof locationData.longitude !== 'number') {
        return;
      }

      const now = new Date();
      // Use the same effective calculation method/madhab as the rest of the app
      // (was hardcoded to Karachi method id 1 regardless of the user's choice).
      const method = getEffectiveAladhanMethodId(locationData.latitude, locationData.longitude);
      const school = getMadhab() === 'hanafi' ? 1 : 0;
      const adhanPreferenceSignature = localStorage.getItem('adhan-preferences') || 'default';
      const adhanConfigText = localStorage.getItem('adhan-config') || '{}';
      const adhanEnabledSignature = this.isPrayerAlarmEnabled() ? 'adhan-on' : 'adhan-off';
      const signature = [
        now.toDateString(),
        locationData.latitude.toFixed(3),
        locationData.longitude.toFixed(3),
        locationData.source || 'unknown',
        `window-${SCHEDULE_WINDOW_DAYS}`,
        `method-${method}`,
        `school-${school}`,
        adhanPreferenceSignature,
        adhanEnabledSignature,
        adhanConfigText
      ].join('|');

      const previousSignature = localStorage.getItem(LAST_SCHEDULE_SIGNATURE_KEY);
      if (previousSignature === signature) {
        return;
      }

      await this.clearPrayerNotifications();

      const notifications: LocalNotificationSchema[] = [];
      const nativeAlarms: NativeAdhanAlarm[] = [];
      const monthsFetched = new Set<string>();
      const syncTimings: ServiceWorkerPrayerTimings = {};

      for (let dayOffset = 0; dayOffset < SCHEDULE_WINDOW_DAYS; dayOffset += 1) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + dayOffset);
        targetDate.setHours(0, 0, 0, 0);

        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        const monthKey = `${year}-${month}`;

        if (!monthsFetched.has(monthKey)) {
          await AladhanAPI.fetchMonthlyCalendar(
            locationData.latitude,
            locationData.longitude,
            year,
            month,
            method,
            school
          );
          monthsFetched.add(monthKey);
        }

        const dayData = AladhanAPI.getPrayerTimesForDate(
          targetDate,
          locationData.latitude,
          locationData.longitude
        );
        if (!dayData) {
          continue;
        }

        const adhanConfig = adhanService.getAdhanConfig();
        const prayerToggleMap: Record<string, keyof AdhanConfig> = {
          'Fajr': 'fajrEnabled',
          'Dhuhr': 'dhuhrEnabled',
          'Asr': 'asrEnabled',
          'Maghrib': 'maghribEnabled',
          'Isha': 'ishaEnabled'
        };

        for (const prayerName of PRAYER_NAMES) {
          // Check if this prayer is enabled
          const toggleKey = prayerToggleMap[prayerName];
          if (toggleKey && !adhanConfig[toggleKey]) {
            continue;
          }

          const prayerTime = dayData.timings[prayerName];
          const cleaned = prayerTime.replace(/\s*\(.*?\)\s*/g, '').trim();
          const [hours, minutes] = cleaned.split(':').map(Number);
          const prayerDate = new Date(targetDate);
          prayerDate.setHours(hours, minutes, 0, 0);

          if (prayerDate <= now) {
            continue;
          }

          const notificationId = this.getNotificationId(prayerName, prayerDate);
          const message = getPrayerNotificationMessage(prayerName, cleaned);
          const notification: LocalNotificationSchema = {
            id: notificationId,
            title: message.title,
            body: message.body,
            schedule: {
              at: prayerDate,
              allowWhileIdle: true,
              repeats: false,
            },
            sound: 'default',
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            iconColor: '#1a4a4a',
            extra: {
              prayerName,
              prayerTime: cleaned,
              type: 'prayer_reminder',
              location: locationData,
              scheduledDate: targetDate.toISOString(),
            },
          };

          notifications.push(notification);
          this.scheduledNotifications.set(notificationId, {
            id: notificationId,
            title: message.title,
            body: message.body,
            scheduleTime: prayerDate,
            prayerName,
          });

          const validPrayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

          if (!validPrayerNames.includes(prayerName as typeof validPrayerNames[number])) {
            console.warn(`Invalid prayer name "${prayerName}", skipping native alarm`);
            continue;
          }

          nativeAlarms.push({
            id: notificationId,
            triggerAt: prayerDate.getTime(),
            prayerName,
            adhanUrl: await getAdhanUrlForPrayer(prayerName as PrayerName),
            overrideSilent: adhanService.getAdhanConfig().overrideSilentMode,
            maxVolume: adhanService.getAdhanConfig().playAtMaxVolume,
          });

          if (dayOffset === 0) {
            syncTimings[prayerName.toLowerCase()] = { time: cleaned };
          }
        }
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({
          notifications
        });

        if (Capacitor.isNativePlatform()) {
          if (this.isPrayerAlarmEnabled()) {
            try {
              await nativeAdhan.schedule(nativeAlarms, true);
            } catch (error) {
              console.warn('Failed to schedule native adhan alarms:', error);
            }
          } else {
            await nativeAdhan.clear();
          }
        }

        localStorage.setItem(LAST_SCHEDULE_SIGNATURE_KEY, signature);

        if (Object.keys(syncTimings).length > 0) {
          this.syncWithServiceWorker(syncTimings);
        }
      } else {
        localStorage.removeItem(LAST_SCHEDULE_SIGNATURE_KEY);
        if (Capacitor.isNativePlatform()) {
          await nativeAdhan.clear();
        }
      }

    } catch (error) {
      console.error('Failed to schedule prayer notifications from API:', error);
      throw error;
    }
  }
  async schedulePrayerNotifications(prayerTimes: PrayerTime[]): Promise<void> {
    if (!this.arePrayerNotificationsEnabled()) {
      return;
    }

    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return;
    }

    try {
      // Clear existing prayer notifications
      await this.clearPrayerNotifications();

      const now = new Date();
      const notifications: LocalNotificationSchema[] = [];

      const adhanConfig = adhanService.getAdhanConfig();
      const prayerToggleMap: Record<string, keyof AdhanConfig> = {
        'Fajr': 'fajrEnabled',
        'Dhuhr': 'dhuhrEnabled',
        'Asr': 'asrEnabled',
        'Maghrib': 'maghribEnabled',
        'Isha': 'ishaEnabled'
      };

      for (const prayer of prayerTimes) {
        // Only schedule future prayers for today if enabled in settings
        const toggleKey = prayerToggleMap[prayer.name];
        if (toggleKey && !adhanConfig[toggleKey]) continue;

        if (prayer.date > now) {
          const notificationId = this.getNotificationId(prayer.name, prayer.date);

          const notification = {
            id: notificationId,
            title: `${prayer.name} Prayer Time`,
            body: `It's time for ${prayer.name} prayer. ${prayer.time}`,
            schedule: {
              at: prayer.date,
              allowWhileIdle: true, // Wake up device
              repeats: false,
            },
            sound: 'default',
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            iconColor: '#1a4a4a',
            actions: [
              {
                id: 'stop_adhan',
                title: '⏹ Stop Adhan',
                type: LocalNotificationActionType.Button,
                requiresAuthentication: false
              },
              {
                id: 'open_app',
                title: '🕌 Open App',
                type: LocalNotificationActionType.Button,
                requiresAuthentication: false
              }
            ],
            extra: {
              prayerName: prayer.name,
              prayerTime: prayer.time,
              type: 'prayer_reminder'
            }
          };

          notifications.push(notification);

          // Store for tracking
          this.scheduledNotifications.set(notificationId, {
            id: notificationId,
            title: notification.title,
            body: notification.body,
            scheduleTime: prayer.date,
            prayerName: prayer.name
          });
        }
      }

      // Schedule all notifications
      if (notifications.length > 0) {
        await LocalNotifications.schedule({
          notifications
        });

        // Sync with Service Worker
        const swTimings: Record<string, { time: string }> = {};
        for (const p of prayerTimes) {
          swTimings[p.name.toLowerCase()] = { time: p.time };
        }
        this.syncWithServiceWorker(swTimings);

        // Native Alarm scheduling (Audio)
        if (Capacitor.isNativePlatform()) {
          const nativeAlarms: NativeAdhanAlarm[] = [];
          for (const prayer of prayerTimes) {
            const key = prayerToggleMap[prayer.name];
            if (key && !adhanConfig[key]) continue;

            if (prayer.date > now) {
              const validPrayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
              if (!validPrayerNames.includes(prayer.name as typeof validPrayerNames[number])) {
                console.warn(`Invalid prayer name "${prayer.name}", skipping native alarm`);
                continue;
              }

              nativeAlarms.push({
                id: this.getNotificationId(prayer.name, prayer.date),
                triggerAt: prayer.date.getTime(),
                prayerName: prayer.name,
                adhanUrl: await getAdhanUrlForPrayer(prayer.name as PrayerName),
                overrideSilent: adhanService.getAdhanConfig().overrideSilentMode,
                maxVolume: adhanService.getAdhanConfig().playAtMaxVolume,
              });
            }
          }

          if (this.isPrayerAlarmEnabled()) {
            try {
              await nativeAdhan.schedule(nativeAlarms, true);
            } catch (error) {
              console.warn('Failed to schedule native adhan alarms:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to schedule prayer notifications:', error);
    }
  }

  /**
   * Schedule a single prayer notification
   */
  async scheduleSinglePrayerNotification(
    prayerName: string,
    prayerTime: string,
    prayerDate: Date
  ): Promise<void> {
    if (!this.arePrayerNotificationsEnabled()) {
      return;
    }

    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return;
    }

    try {
      const notificationId = this.getNotificationId(prayerName, prayerDate);

      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title: `${prayerName} Prayer Time`,
          body: `It's time for ${prayerName} prayer. ${prayerTime}`,
          schedule: {
            at: prayerDate,
            allowWhileIdle: true, // Wake up device
            repeats: false,
          },
          sound: 'default',
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
          iconColor: '#1a4a4a',
          actions: [
            {
              id: 'stop_adhan',
              title: '⏹ Stop Adhan',
              type: LocalNotificationActionType.Button,
              requiresAuthentication: false
            },
            {
              id: 'open_app',
              title: '🕌 Open App',
              type: LocalNotificationActionType.Button,
              requiresAuthentication: false
            }
          ],
          extra: {
            prayerName,
            prayerTime,
            type: 'prayer_reminder'
          }
        }]
      });

      this.scheduledNotifications.set(notificationId, {
        id: notificationId,
        title: `${prayerName} Prayer Time`,
        body: `It's time for ${prayerName} prayer. ${prayerTime}`,
        scheduleTime: prayerDate,
        prayerName
      });
    } catch (error) {
      console.error(`Failed to schedule ${prayerName} notification:`, error);
    }
  }

  /**
   * Get notification ID for a prayer
   */
  private getNotificationId(prayerName: string, prayerDate?: Date): number {
    const prayerIndex: Record<string, number> = {
      Fajr: 1,
      Dhuhr: 2,
      Asr: 3,
      Maghrib: 4,
      Isha: 5,
    };

    if (prayerDate) {
      const year = prayerDate.getFullYear();
      const month = String(prayerDate.getMonth() + 1).padStart(2, '0');
      const day = String(prayerDate.getDate()).padStart(2, '0');
      // Full date number YYYYMMDD fits in 32-bit signed int until year 2147
      // Multiply by 10 and add prayer index (1-5) for uniqueness
      const dateNumber = parseInt(`${year}${month}${day}`, 10);
      const index = prayerIndex[prayerName] || 9;
      return dateNumber * 10 + index;
    }

    return 1000 + (prayerIndex[prayerName] || 9);
  }

  /**
   * Clear all prayer notifications
   */
  async clearPrayerNotifications(): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending();
      const prayerNotificationIds = pending.notifications
        .filter(n => n.extra?.type === 'prayer_reminder')
        .map(n => n.id);

      if (prayerNotificationIds.length > 0) {
        await LocalNotifications.cancel({
          notifications: prayerNotificationIds.map(id => ({ id }))
        });

        // Clear from our tracking
        prayerNotificationIds.forEach(id => this.scheduledNotifications.delete(id));
      }
    } catch (error) {
      console.error('Failed to clear prayer notifications:', error);
    } finally {
      if (Capacitor.isNativePlatform()) {
        await nativeAdhan.clear();
      }
    }
  }

  /**
   * Get all scheduled prayer notifications
   */
  async getScheduledPrayerNotifications(): Promise<ScheduledNotification[]> {
    try {
      const pending = await LocalNotifications.getPending();
      const prayerNotifications = pending.notifications
        .filter(n => n.extra?.type === 'prayer_reminder')
        .map(n => ({
          id: n.id,
          title: n.title || '',
          body: n.body || '',
          scheduleTime: n.schedule?.at || new Date(),
          prayerName: n.extra?.prayerName || ''
        }));

      return prayerNotifications;
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const permission = await LocalNotifications.checkPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
      return false;
    }
  }

  arePrayerNotificationsEnabled(): boolean {
    return localStorage.getItem(PRAYER_NOTIFICATIONS_ENABLED_KEY) !== 'false';
  }

  private isPrayerAlarmEnabled(): boolean {
    return localStorage.getItem(PRAYER_ALARM_ENABLED_KEY) !== 'false';
  }

  async ensureExactAlarmPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;

    try {
      const status = await LocalNotifications.checkExactNotificationSetting() as { exact_alarm?: string };
      if (status.exact_alarm === 'granted') {
        return true;
      }

      const changed = await LocalNotifications.changeExactNotificationSetting() as { exact_alarm?: string };
      return changed.exact_alarm === 'granted';
    } catch (error) {
      console.warn('Unable to verify exact alarm permission, using fallback scheduling:', error);
      return false;
    }
  }

  async setPrayerNotificationsEnabled(enabled: boolean): Promise<void> {
    localStorage.setItem(PRAYER_NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');

    if (!enabled) {
      await this.clearPrayerNotifications();
      localStorage.removeItem(LAST_SCHEDULE_SIGNATURE_KEY);
      return;
    }

    await this.ensureExactAlarmPermission();
    await this.schedulePrayerNotificationsFromAPI();
  }

  /**
   * Schedule a custom notification (for Islamic events, etc.)
   */
  async scheduleNotification(
    id: string,
    title: string,
    body: string,
    scheduleTime: Date
  ): Promise<void> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return;
    }

    try {
      const notificationId = this.generateCustomNotificationId(id);

      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title,
          body,
          schedule: {
            at: scheduleTime,
            allowWhileIdle: true,
            repeats: false,
          },
          sound: 'default',
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
          iconColor: '#1a4a4a',
          extra: {
            type: 'islamic_event',
            eventId: id
          }
        }]
      });

    } catch (error) {
      console.error(`Failed to schedule custom notification ${id}:`, error);
    }
  }

  /**
   * Cancel a specific notification by ID
   */
  async cancelNotification(id: string): Promise<void> {
    try {
      const notificationId = this.generateCustomNotificationId(id);

      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }]
      });

    } catch (error) {
      console.error(`Failed to cancel notification ${id}:`, error);
    }
  }

  /**
   * Generate numeric ID for custom notifications
   */
  private generateCustomNotificationId(id: string): number {
    // Generate a consistent numeric ID from string
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Use high range to avoid conflicts with prayer notifications
    return Math.abs(hash) + 100000;
  }

  /**
   * Show an immediate notification using Service Worker Registration
   * Task 2: Native Push Notifications logic
   */
  /**
   * Helper to get the active SW registration
   */
  private async getSWRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (swRegistration) return swRegistration;
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        swRegistration = reg;
        return reg;
      } catch (e) {
        console.error('Error getting SW registration:', e);
      }
    }
    return null;
  }

  /**
   * Show an immediate notification using Service Worker Registration
   * Task 2: Native Push Notifications logic
   */
  async showNativeNotification(
    title: string,
    body: string,
    data: NativeNotificationData = {}
  ): Promise<void> {
    try {
      const reg = await this.getSWRegistration();

      if (!reg) {
        // Fallback for Safari/No-SW environments
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            requireInteraction: true,
            data: { ...data, url: data.url || '/dashboard' }
          });
        }
        return;
      }

      const options: NotificationOptions = {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        requireInteraction: true, // task 2 requirement
        data: {
          ...data,
          url: data.url || '/dashboard' // opens dashboard by default
        },
        tag: data.tag || 'prayer-reminder'
      };

      await reg.showNotification(title, options);
    } catch (error) {
      console.error('Failed to show native notification:', error);
    }
  }

  /**
   * Schedule daily notification reset (for next day's prayers)
   */
  async scheduleDailyReset(): Promise<void> {
    // Daily reset is handled on app open — no visible notification needed
  }

  /**
   * Sync prayer times to Service Worker for persistent background checks
   */
  private syncWithServiceWorker(timings: ServiceWorkerPrayerTimings): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_PRAYER_TIMES',
        data: { timings }
      });
    } else if (swRegistration?.active) {
      swRegistration.active.postMessage({
        type: 'UPDATE_PRAYER_TIMES',
        data: { timings }
      });
    }
  }
}

export const localNotifications = new LocalNotificationManager();

// If the user changes Adhan preferences, reschedule future alarms so each prayer
// uses the newly selected sound (especially important for native background alarms).
declare global {
  interface Window {
    __noorConnectAdhanPrefsListenerAttached?: boolean;
    __noorConnectAdhanPrefsRescheduleTimer?: number;
  }
}

if (typeof window !== 'undefined' && !window.__noorConnectAdhanPrefsListenerAttached) {
  window.__noorConnectAdhanPrefsListenerAttached = true;

  // Listen for preference or config changes to reschedule background tasks
  const handleReschedule = () => {
    if (window.__noorConnectAdhanPrefsRescheduleTimer) {
      window.clearTimeout(window.__noorConnectAdhanPrefsRescheduleTimer);
    }
    window.__noorConnectAdhanPrefsRescheduleTimer = window.setTimeout(() => {
      localNotifications.schedulePrayerNotificationsFromAPI().catch((error) => {
        console.warn('Failed to reschedule after setting change:', error);
      });
    }, 600);
  };

  window.addEventListener('adhan-preferences-changed', handleReschedule);
  window.addEventListener('adhan-config-changed', handleReschedule);
}
