import { isIslamicSleepReminderEnabled, getIslamicSleepOffset } from './storage';
import i18n from './i18n-new';
import { ensureNoorNotificationChannels, NOTIFICATION_CHANNELS, NOTIFICATION_ACCENT_COLOR } from './notification-channels';
import { Capacitor } from '@capacitor/core';

// Rotating sunnah sleep content, resolved via i18n at fire time.
const SLEEP_BODY_KEYS = [
  'sleepNotifBody1',
  'sleepNotifBody2',
  'sleepNotifBody3',
  'sleepNotifBody4',
  'sleepNotifBody5',
  'sleepNotifBody6',
  'sleepNotifBody7',
] as const;

function pickBodyKey(): string {
  const day = new Date().getDate();
  return SLEEP_BODY_KEYS[day % SLEEP_BODY_KEYS.length];
}

function getIshaTimeFromCache(): string | null {
  try {
    const raw = localStorage.getItem('cached-prayer-times');
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached.times || !Array.isArray(cached.times)) return null;
    const isha = cached.times.find((t: { name: string; time: string }) => t.name === 'Isha');
    return isha?.time || null;
  } catch {
    return null;
  }
}

const FALLBACK_HOUR = 21;
const FALLBACK_MINUTE = 0;

export function getNextIslamicSleepReminderTime(): Date | null {
  if (!isIslamicSleepReminderEnabled()) return null;

  const now = new Date();
  const ishaTime = getIshaTimeFromCache();

  let target: Date;

  if (ishaTime) {
    const [hours, minutes] = ishaTime.split(':').map(Number);
    const offset = getIslamicSleepOffset();
    target = new Date(now);
    target.setHours(hours, minutes + offset, 0, 0);
  } else {
    target = new Date(now);
    target.setHours(FALLBACK_HOUR, FALLBACK_MINUTE, 0, 0);
  }

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

export function scheduleIslamicSleepReminder() {
  if (!isIslamicSleepReminderEnabled()) return;

  const target = getNextIslamicSleepReminderTime();
  if (!target) return;

  const now = new Date();
  const delay = target.getTime() - now.getTime();
  if (delay <= 0) return;

  const contentTitle = i18n.t('sleepNotifTitle');
  const contentBody = i18n.t(pickBodyKey());

  // Use Capacitor LocalNotifications if available, fall back to Web API
  const isCapacitor = Capacitor.isNativePlatform();
  if (isCapacitor) {
    ensureNoorNotificationChannels().catch(() => {});
    import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
      LocalNotifications.schedule({
        notifications: [{
          id: 7777,
          title: contentTitle,
          body: contentBody,
          schedule: { at: target, allowWhileIdle: true, repeats: false },
          smallIcon: 'ic_notification',
          iconColor: NOTIFICATION_ACCENT_COLOR,
          channelId: NOTIFICATION_CHANNELS.sleep,
          extra: { type: 'islamic_sleep' }
        }]
      }).catch((e: Error) => console.warn('Failed to schedule sleep reminder:', e));
    });
  } else {
    // Web fallback using setTimeout
    const existingId = localStorage.getItem('islamic-sleep-reminder-timeout');
    if (existingId) clearTimeout(parseInt(existingId, 10));

    const timeoutId = window.setTimeout(() => {
      if (!isIslamicSleepReminderEnabled()) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const n = new Notification(i18n.t('sleepNotifTitle'), {
        body: i18n.t(pickBodyKey()),
        icon: '/icon-192x192.png',
        tag: 'islamic-sleep',
        requireInteraction: false,
      });
      n.onclick = () => window.focus();
    }, delay);

    localStorage.setItem('islamic-sleep-reminder-timeout', timeoutId.toString());
  }
}

export function cancelIslamicSleepReminder() {
  const isCapacitor = Capacitor.isNativePlatform();
  if (isCapacitor) {
    import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
      LocalNotifications.cancel({ notifications: [{ id: 7777 }] }).catch(() => {});
    }).catch(() => {});
  } else {
    const existingId = localStorage.getItem('islamic-sleep-reminder-timeout');
    if (existingId) {
      clearTimeout(parseInt(existingId, 10));
      localStorage.removeItem('islamic-sleep-reminder-timeout');
    }
  }
}
