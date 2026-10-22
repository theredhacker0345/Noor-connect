/**
 * Local Web Notifications for Prayer Reminders
 * Uses Web Notifications API + Capacitor LocalNotifications for native
 */

import { Capacitor } from '@capacitor/core';
import { PRAYER_QUOTES } from './prayer-quotes';
import i18n from './i18n-new';
import { getPrayerDisplayPair } from './prayer-display';

const NOTIFICATION_PERMISSION_KEY = 'prayer-notifications-enabled';

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const isStandaloneMode = (): boolean => {
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean(navigatorWithStandalone.standalone) ||
    document.referrer.includes('android-app://')
  );
};

export interface ScheduledNotification {
  id: string;
  prayerName: string;
  time: Date;
  timeoutId?: number;
}

// Check if notifications are supported
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

// Check current permission status
export const getNotificationPermission = (): NotificationPermission | null => {
  if (!isNotificationSupported()) return null;
  return Notification.permission;
};

// Check if permission should be requested (APK users - persistent asking)
export const shouldRequestPermission = (): boolean => {
  if (!isNotificationSupported()) return false;

  const permission = getNotificationPermission();
  const isNative = Capacitor.isNativePlatform();
  const isStandalone = isStandaloneMode();

  // On native platform, always allow re-prompting even after denial
  // Capacitor can re-trigger the native permission dialog
  if (isNative && permission === 'denied') {
    // Check cooldown — don't spam the user, ask every 24 hours
    const lastAskedTimestamp = localStorage.getItem('notification-last-asked');
    if (lastAskedTimestamp) {
      const oneDay = 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(lastAskedTimestamp) < oneDay) {
        return false;
      }
    }
    return true;
  }

  if (permission !== 'default') return false;

  // We want to ask all users eventually, but maybe prioritize standalone/native
  // For web users, we only ask if permission is 'default' and we haven't asked recently

  // For APK/PWA users, check if we should ask again (more frequent)
  const lastAskedTimestamp = localStorage.getItem('notification-last-asked');
  if (lastAskedTimestamp) {
    const lastAskedTime = parseInt(lastAskedTimestamp);
    const oneDay = 24 * 60 * 60 * 1000; // Ask once a day max
    if (Date.now() - lastAskedTime < oneDay) {
      return false;
    }
  }

  return true;
};

// Record when we asked for permission to respect cooldown
export const recordPermissionAsked = (): void => {
  localStorage.setItem('notification-last-asked', Date.now().toString());
};

// Force request permission (for APK users - bypass cooldown)
export const forceRequestPermission = (): boolean => {
  if (!isNotificationSupported()) return false;

  const permission = getNotificationPermission();
  const isNative = Capacitor.isNativePlatform();
  const isStandalone = isStandaloneMode();

  // On native, allow force even when denied
  if (isNative) return true;

  if (permission !== 'default') return false;

  return Boolean(isStandalone);
};

// Open native notification settings (for APK users who permanently denied)
export const openNotificationSettings = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      // On Android, requesting permissions when denied opens the system settings
      await LocalNotifications.requestPermissions();
    } catch (error) {
      console.error('Failed to open notification settings:', error);
    }
  }
};

// Check if user has enabled notifications in our app
export const isNotificationsEnabled = (): boolean => {
  return localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === 'true';
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) {
    console.log('Notifications not supported');
    return false;
  }

  try {
    const isNative = Capacitor.isNativePlatform();
    const isStandalone = isStandaloneMode();

    // Store when we last asked
    localStorage.setItem('notification-last-asked', Date.now().toString());

    // On native platform, use Capacitor's LocalNotifications API
    // This can re-trigger the native permission dialog even after denial
    if (isNative) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const result = await LocalNotifications.requestPermissions();
        if (result.display === 'granted') {
          localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
          localStorage.setItem('notification-permission-timestamp', Date.now().toString());
          localStorage.removeItem('notification-permission-denied');
          return true;
        } else {
          localStorage.setItem('notification-permission-denied', Date.now().toString());
          return false;
        }
      } catch (capError) {
        console.warn('Capacitor LocalNotifications not available, falling back to Web API:', capError);
      }
    }

    // Fallback to Web Notification API
    // Compatibility for older browsers that don't return a promise
    const permission = await new Promise<NotificationPermission>((resolve) => {
      const result = Notification.requestPermission(resolve);
      if (result && (result as any).then) {
        (result as any).then(resolve);
      }
    });
    if (permission === 'granted') {
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');

      if (isStandalone) {
        localStorage.setItem('notification-permission-timestamp', Date.now().toString());
        localStorage.setItem('app-install-source', 'apk');
        localStorage.removeItem('notification-permission-denied');
      }

      return true;
    } else {
      if (isStandalone) {
        localStorage.setItem('notification-permission-denied', Date.now().toString());
      }
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Disable notifications
export const disableNotifications = (): void => {
  localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'false');
  clearAllScheduledNotifications();
};

// Enable notifications
export const enableNotifications = async (): Promise<boolean> => {
  const granted = await requestNotificationPermission();
  if (granted) {
    localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
  }
  return granted;
};

// Show a notification
export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;
  if (!isNotificationsEnabled()) return;

  try {
    const notification = new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: options?.tag || 'prayer-reminder',
      requireInteraction: false,
      ...options,
    });

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('Error showing notification:', error);
  }
};

// Active timeout IDs for scheduled notifications
const activeTimeouts: Map<string, number> = new Map();

// Schedule a notification for a specific time
export const schedulePrayerNotification = (prayerName: string, prayerTime: Date): string | null => {
  if (!isNotificationsEnabled()) return null;

  const now = new Date();
  const delay = prayerTime.getTime() - now.getTime();

  // Don't schedule if time has passed
  if (delay <= 0) return null;

  const id = `${prayerName}-${prayerTime.getTime()}`;

  // Clear existing timeout for this prayer if exists
  const existingTimeout = activeTimeouts.get(id);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // PRAYER_QUOTES is a Record<prayerName, string[]> — index it per prayer
  // (falling back to the Default pool). The old code treated it as an array
  // (`PRAYER_QUOTES[Math.random() * PRAYER_QUOTES.length]`), which always
  // produced `undefined` and rendered "…prayer.\nundefined".
  const quotes = PRAYER_QUOTES[prayerName] || PRAYER_QUOTES.Default;
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  const { localized, arabic } = getPrayerDisplayPair(prayerName);

  const timeoutId = window.setTimeout(() => {
    showNotification(i18n.t('notifPrayerTimeTitle', { prayer: localized, arabic }), {
      body: i18n.t('notifPrayerTimeBody', { prayer: localized, time: prayerTime.toTimeString().slice(0, 5) }) + `\n${randomQuote}`,
      tag: `prayer-${prayerName.toLowerCase()}`,
    });
    activeTimeouts.delete(id);
  }, delay);

  activeTimeouts.set(id, timeoutId);

  return id;
};

// Schedule pre-prayer reminder (X minutes before)
export const schedulePrePrayerReminder = (
  prayerName: string,
  prayerTime: Date,
  minutesBefore: number
): string | null => {
  if (!isNotificationsEnabled()) return null;

  const reminderTime = new Date(prayerTime.getTime() - minutesBefore * 60 * 1000);
  const now = new Date();
  const delay = reminderTime.getTime() - now.getTime();

  if (delay <= 0) return null;

  const id = `${prayerName}-reminder-${minutesBefore}-${prayerTime.getTime()}`;

  const existingTimeout = activeTimeouts.get(id);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const timeoutId = window.setTimeout(() => {
    showNotification(`${prayerName} in ${minutesBefore} minutes`, {
      body: `Prepare for ${prayerName} prayer. Time remaining: ${minutesBefore} minutes.`,
      tag: `prayer-reminder-${prayerName.toLowerCase()}`,
    });
    activeTimeouts.delete(id);
  }, delay);

  activeTimeouts.set(id, timeoutId);

  return id;
};

// Clear all scheduled notifications
export const clearAllScheduledNotifications = (): void => {
  activeTimeouts.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  activeTimeouts.clear();
};

// Schedule all prayer notifications for today
export const scheduleAllPrayerNotifications = (
  prayers: { name: string; time: Date }[],
  reminderMinutes: number = 10
): void => {
  // Clear existing
  clearAllScheduledNotifications();

  if (!isNotificationsEnabled()) return;

  prayers.forEach(({ name, time }) => {
    // Schedule the main prayer time notification
    schedulePrayerNotification(name, time);

    // Schedule pre-prayer reminder if enabled
    if (reminderMinutes > 0) {
      schedulePrePrayerReminder(name, time, reminderMinutes);
    }
  });
};
