import { isBeforeSleepEnabled, getBedtimeHour, getBedtimeMinute } from './storage';
import i18n from './i18n-new';

const SCHEDULE_KEY = 'bedtime-notification-id';

// Rotating bedtime sunnah content. Body lines are i18n keys resolved at fire
// time so the language follows the user's current preference.
const BEDTIME_BODY_KEYS = [
  'bedtimeNotifBody1',
  'bedtimeNotifBody2',
  'bedtimeNotifBody3',
  'bedtimeNotifBody4',
  'bedtimeNotifBody5',
  'bedtimeNotifBody6',
  'bedtimeNotifBody7',
] as const;

function pickBodyKey(): string {
  const day = new Date().getDate();
  return BEDTIME_BODY_KEYS[day % BEDTIME_BODY_KEYS.length];
}

export function scheduleBedtimeNotification() {
  if (!isBeforeSleepEnabled()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const hour = getBedtimeHour();
  const minute = getBedtimeMinute();

  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const existingId = localStorage.getItem(SCHEDULE_KEY);
  if (existingId) {
    const existing = parseInt(existingId, 10);
    clearTimeout(existing);
  }

  const timeoutId = window.setTimeout(() => {
    if (!isBeforeSleepEnabled()) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const n = new Notification(i18n.t('bedtimeNotifTitle'), {
      body: i18n.t(pickBodyKey()),
      icon: '/icon-192x192.png',
      tag: 'bedtime',
      requireInteraction: false,
    });
    n.onclick = () => window.focus();

    scheduleBedtimeNotification();
  }, target.getTime() - now.getTime());

  localStorage.setItem(SCHEDULE_KEY, timeoutId.toString());
}

export function cancelBedtimeNotification() {
  const existingId = localStorage.getItem(SCHEDULE_KEY);
  if (existingId) {
    clearTimeout(parseInt(existingId, 10));
    localStorage.removeItem(SCHEDULE_KEY);
  }
}
