/**
 * Local Notifications Service
 * Handles prayer time reminders using Capacitor Local Notifications
 * FOSS-friendly - no proprietary wake lock libraries
 */

import { LocalNotifications, type LocalNotificationSchema, type ActionType, type ActionPerformed } from '@capacitor/local-notifications';
import { AladhanAPI, type AladhanPrayerTime } from './aladhan-api';
import { getEffectiveAladhanMethodId } from './prayer-method-resolver';
import { getMadhab } from './storage';
import { Capacitor } from '@capacitor/core';
import { getAdhanUrlForPrayer, type PrayerName } from './adhan-preferences';
import { nativeAdhan, type NativeAdhanAlarm } from './native-adhan';
import { adhanService, type AdhanConfig } from './adhan-service';
import { PRAYER_QUOTES } from './prayer-quotes';
import i18n from './i18n-new';
import {
  notificationManager,
  PRE_PRAYER_MINUTES_OPTIONS,
  POST_PRAYER_MINUTES_OPTIONS,
  PRAYER_END_MINUTES_OPTIONS,
} from './notification-manager';
import { ensureNoorNotificationChannels, NOTIFICATION_CHANNELS, NOTIFICATION_ACCENT_COLOR } from './notification-channels';
import { getPrayerDisplayPair, PRAYER_ARABIC_NAMES, PRAYER_ORDER } from './prayer-display';
import { formatPrayerTime, getTimeFormat } from './time-formatter';
import { zonedWallTimeToDate } from './tz-time';

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

// Task 21-d: pre/post prayer reminders are derived from each prayer notification ID.
// Base IDs are dateNumber * 10 + prayerIndex (prayerIndex 1-5, see getNotificationId).
// +10000 shifts the embedded date by exactly +1000 days and +20000 by +2000 days.
// A single schedule batch only spans SCHEDULE_WINDOW_DAYS (30) days, so a pre/post ID
// can never collide with any base/pre/post ID scheduled in the same batch. Maximum
// value (9999-12-31) = 999912335 + 20000 = 999932335 < 2^31 - 1, so IDs stay int32-safe.
const PRE_PRAYER_ID_OFFSET = 10000;
const POST_PRAYER_ID_OFFSET = 20000;
// NC-9: "prayer time is ending" reminders use a third offset (+30000).
// Same collision-safety argument as above; max id stays < 2^31 - 1.
const PRAYER_END_ID_OFFSET = 30000;

// extra.type values owned by this scheduler. clearPrayerNotifications() and
// getScheduledPrayerNotifications() cancel/list every pending notification of these types.
const PRAYER_NOTIFICATION_TYPES = ['prayer_reminder', 'pre_prayer_reminder', 'post_prayer_reminder', 'prayer_end_reminder'];

// Pending-notification extra payloads are untyped (Record<string, any>); keep the
// membership test in one place so the filter stays string-safe.
const isPrayerNotificationType = (type: unknown): boolean => PRAYER_NOTIFICATION_TYPES.includes(type as string);

// Localized prayer names now come from the shared prayer-display module so the
// dashboard hero and the notification layer stay consistent.

/**
 * Rotating short reminders shown in the expanded (big-text) part of prayer
 * notifications. Deterministic rotation by day-of-year + prayer index so each
 * prayer of the day gets a different line and the cycle repeats ~every 3 weeks.
 * Content rules: Quran verses or well-attested hadith ONLY (Bukhari/Muslim/
 * Tirmidhi), each carrying its source. Translations live in the locale files
 * (keys notifReminder1..14).
 */
const NOTIF_REMINDER_COUNT = 14;

/** Deterministic day number (UTC) used for reminder rotation. */
const dayNumberFor = (date: Date): number => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);

const getRotatingReminderKey = (prayerName: string, date: Date): string => {
  const prayerIndex = PRAYER_ORDER.indexOf(prayerName as typeof PRAYER_ORDER[number]);
  const seed = dayNumberFor(date) + (prayerIndex >= 0 ? prayerIndex : 0);
  return `notifReminder${(seed % NOTIF_REMINDER_COUNT) + 1}`;
};

/** Formats "HH:MM" (Aladhan) with the user's 12/24h preference for notification text. */
const formatNotificationTime = (timeStr: string): string => {
  try {
    return formatPrayerTime(timeStr, getTimeFormat());
  } catch {
    return timeStr;
  }
};

/**
 * Compute the localized "Ends at HH:MM" fragment for a prayer window, or null
 * when the next boundary is unavailable. Fajr ends at Sunrise (from the same
 * day data); the others end at the next prayer's start; Isha ends at the next
 * day's Fajr when that data is already cached.
 */
const getPrayerEndsAtText = (
  prayerName: string,
  timings: AladhanPrayerTime,
  _dayData: unknown,
  targetDate: Date
): string | null => {
  try {
    let endTime: string | null = null;
    if (prayerName === 'Fajr' && typeof timings.Sunrise === 'string') {
      endTime = timings.Sunrise;
    } else {
      const idx = PRAYER_ORDER.indexOf(prayerName as typeof PRAYER_ORDER[number]);
      const nextName = idx >= 0 && idx < PRAYER_ORDER.length - 1 ? PRAYER_ORDER[idx + 1] : null;
      if (nextName && typeof timings[nextName] === 'string') {
        endTime = timings[nextName];
      } else if (prayerName === 'Isha') {
        // Isha ends at tomorrow's Fajr — only when the data is already cached.
        const tomorrow = new Date(targetDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const storedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (storedLocation) {
          const loc = JSON.parse(storedLocation) as { latitude?: number; longitude?: number };
          if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
            const tomorrowData = AladhanAPI.getPrayerTimesForDate(
              tomorrow,
              loc.latitude,
              loc.longitude
            );
            if (tomorrowData && typeof tomorrowData.timings.Fajr === 'string') {
              endTime = tomorrowData.timings.Fajr;
            }
          }
        }
      }
    }
    if (!endTime) return null;
    const cleaned = endTime.replace(/\s*\(.*?\)\s*/g, '').trim();
    if (!/^\d{1,2}:\d{2}$/.test(cleaned)) return null;
    return i18n.t('notifPrayerEndsAt', { time: formatNotificationTime(cleaned) });
  } catch {
    return null;
  }
};

/**
 * NC-9: compute the END of a prayer window as a Date, mirroring the display
 * logic of getPrayerEndsAtText (Fajr -> Sunrise; each prayer -> next prayer's
 * start; Isha -> tomorrow's Fajr when cached). Returns null when the boundary
 * is unavailable or the data is malformed.
 */
const getPrayerEndDate = (
  prayerName: string,
  timings: AladhanPrayerTime,
  targetDate: Date
): Date | null => {
  try {
    let endTime: string | null = null;
    if (prayerName === 'Fajr' && typeof timings.Sunrise === 'string') {
      endTime = timings.Sunrise;
    } else {
      const idx = PRAYER_ORDER.indexOf(prayerName as typeof PRAYER_ORDER[number]);
      const nextName = idx >= 0 && idx < PRAYER_ORDER.length - 1 ? PRAYER_ORDER[idx + 1] : null;
      if (nextName && typeof timings[nextName] === 'string') {
        endTime = timings[nextName];
      } else if (prayerName === 'Isha') {
        // Isha ends at tomorrow's Fajr - only when the data is already cached.
        const tomorrow = new Date(targetDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const storedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (storedLocation) {
          const loc = JSON.parse(storedLocation) as { latitude?: number; longitude?: number };
          if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
            const tomorrowData = AladhanAPI.getPrayerTimesForDate(
              tomorrow,
              loc.latitude,
              loc.longitude
            );
            if (tomorrowData && typeof tomorrowData.timings.Fajr === 'string') {
              endTime = tomorrowData.timings.Fajr;
            }
          }
        }
      }
    }
    if (!endTime) return null;
    const cleaned = endTime.replace(/\s*\(.*?\)\s*/g, '').trim();
    if (!/^\d{1,2}:\d{2}$/.test(cleaned)) return null;
    const [endHours, endMinutes] = cleaned.split(':').map(Number);
    if (!Number.isFinite(endHours) || !Number.isFinite(endMinutes)) return null;
    const endDate = new Date(targetDate);
    endDate.setHours(endHours, endMinutes, 0, 0);
    return endDate;
  } catch {
    return null;
  }
};

if (localStorage.getItem(PRAYER_NOTIFICATIONS_ENABLED_KEY) === null) {
  localStorage.setItem(PRAYER_NOTIFICATIONS_ENABLED_KEY, 'true');
}

type NativeNotificationData = Record<string, unknown> & {
  url?: string;
  tag?: string;
};

type ServiceWorkerPrayerTimings = Record<string, { time: string }>;

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

/**
 * Rich, i18n-aware prayer notification text.
 *
 * Collapsed view stays short (< ~120 chars):
 *   title: "🕌 Dhuhr — الظهر"
 *   body:  "It's time for Dhuhr prayer (12:30). Ends at 15:45."
 * Expanded view (Android big-text via largeBody) adds a rotating authentic
 * reminder + the per-prayer quote from PRAYER_QUOTES.
 */
const getPrayerNotificationMessage = (
  prayerName: string,
  prayerTime: string,
  options?: { endsAt?: string | null; referenceDate?: Date }
): { title: string; body: string; largeBody?: string; summaryText?: string } => {
  const localized = getLocalizedPrayerName(prayerName);
  const arabic = PRAYER_ARABIC_NAMES[prayerName] || '';
  const time = formatNotificationTime(prayerTime);

  const title = i18n.t('notifPrayerTimeTitle', { prayer: localized, arabic });
  const baseBody = i18n.t('notifPrayerTimeBody', { prayer: localized, time });
  const body = options?.endsAt ? `${baseBody} ${options.endsAt}` : baseBody;

  const referenceDate = options?.referenceDate || new Date();
  const reminder = i18n.t(getRotatingReminderKey(prayerName, referenceDate));
  const quotes = PRAYER_QUOTES[prayerName] || PRAYER_QUOTES['Default'];
  const daySeed = dayNumberFor(referenceDate) % quotes.length;
  const quote = quotes[daySeed];

  const largeBody = `${reminder}\n${quote}`;
  return { title, body, largeBody, summaryText: i18n.t('notifSummaryPrayer') };
};

/**
 * Task 21-d: localized prayer name for notification text. Falls back to the
 * internal Aladhan name when the locale does not provide a translation.
 */
const getLocalizedPrayerName = (prayerName: string): string => getPrayerDisplayPair(prayerName).localized;

/**
 * Task 21-d: pre-prayer reminder text ("Dhuhr in 15 minutes — time to prepare").
 * Resolved via t() at SCHEDULE time so the scheduled notification uses the
 * language the user had when it was scheduled (same as the rest of the app).
 * Expanded view adds a short rotating preparation line (wudu / mosque / stillness).
 */
const getPrePrayerNotificationMessage = (prayerName: string, minutes: number, referenceDate?: Date): { title: string; body: string; largeBody?: string } => {
  const prayer = getLocalizedPrayerName(prayerName);
  const dayNumber = dayNumberFor(referenceDate || new Date());
  const prepLine = i18n.t(`notifPrepLine${(dayNumber % 3) + 1}`);
  return {
    title: i18n.t('prePrayerNotifTitle', { prayer, minutes }),
    body: i18n.t('prePrayerNotifBody', { prayer, minutes }),
    largeBody: prepLine,
  };
};

/**
 * Task 21-d: post-prayer reminder text (dhikr & sunnah nudge).
 * Expanded view carries the authentic post-prayer tasbih (Bukhari 3113/Muslim 595).
 */
const getPostPrayerNotificationMessage = (prayerName: string): { title: string; body: string; largeBody?: string } => {
  const prayer = getLocalizedPrayerName(prayerName);
  return {
    title: i18n.t('postPrayerNotifTitle', { prayer }),
    body: i18n.t('postPrayerNotifBody', { prayer }),
    largeBody: i18n.t('notifPostTasbihLine'),
  };
};

/**
 * NC-9: prayer-end reminder text ("Asr time ends in 15 minutes").
 * Resolved via t() at SCHEDULE time (same convention as pre/post reminders).
 * Expanded view adds a short line encouraging completing the prayer on time.
 */
const getPrayerEndNotificationMessage = (prayerName: string, minutes: number): { title: string; body: string; largeBody?: string } => {
  const prayer = getLocalizedPrayerName(prayerName);
  return {
    title: i18n.t('prayerEndNotifTitle', { prayer, minutes }),
    body: i18n.t('prayerEndNotifBody', { prayer, minutes }),
    largeBody: i18n.t('prayerEndNotifHint'),
  };
};

/**
 * NC-9: read pre/post AND end-of-window reminder preferences with the same
 * merge-with-defaults behavior the settings page uses, so existing installs
 * get sensible defaults.
 */
const getPrePostReminderSettings = (): {
  preEnabled: boolean;
  preMinutes: number;
  postEnabled: boolean;
  postMinutes: number;
  endEnabled: boolean;
  endMinutes: number;
} => {
  const prefs = notificationManager.getPreferences();
  return {
    preEnabled: prefs.prePrayerReminder ?? true,
    preMinutes: PRE_PRAYER_MINUTES_OPTIONS.includes(prefs.prePrayerMinutes) ? prefs.prePrayerMinutes : 15,
    postEnabled: prefs.postPrayerReminder ?? false,
    postMinutes: POST_PRAYER_MINUTES_OPTIONS.includes(prefs.postPrayerMinutes) ? prefs.postPrayerMinutes : 15,
    endEnabled: prefs.prayerEndReminder ?? false,
    endMinutes: PRAYER_END_MINUTES_OPTIONS.includes(prefs.prayerEndMinutes) ? prefs.prayerEndMinutes : 15,
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

      // Android 8+: create the typed, localized channels BEFORE any
      // notification is scheduled so every category lands in its own
      // user-controllable channel (instead of the generic "Default" one).
      await ensureNoorNotificationChannels();

      // Register action types for notification buttons.
      // registerActionTypes is Android/iOS-only — on web it throws
      // "Not implemented on web", so guard it behind a native check.
      if (Capacitor.isNativePlatform()) {
        try {
          await LocalNotifications.registerActionTypes({
            types: [
              {
                id: 'prayer_actions',
                actions: [
                  {
                    id: 'mark_prayed',
                    title: i18n.t('notifActionMarkPrayed'),
                    requiresAuthentication: false,
                    foreground: false,
                    destructive: false
                  },
                  {
                    id: 'stop_adhan',
                    title: i18n.t('notifActionStopAdhan'),
                    requiresAuthentication: false,
                    foreground: false,
                    destructive: false
                  },
                  {
                    id: 'open_app',
                    title: i18n.t('notifActionOpenApp'),
                    requiresAuthentication: false,
                    foreground: true,
                    destructive: false
                  }
                ]
              }
            ]
          });
        } catch (error) {
          console.warn('Failed to register notification action types:', error);
        }
      }

      // Listen for notification actions (e.g., "Stop Adhan", "Mark prayed")
      LocalNotifications.addListener('localNotificationActionPerformed', (action: ActionPerformed) => {
        const actionId = action.actionId;
        const notification = action.notification;
        const prayerName = notification?.extra?.prayerName;

        if (actionId === 'stop_adhan') {
          console.log('Stop Adhan action triggered for:', prayerName);
          adhanService.stopAdhan();
        }

        if (actionId === 'mark_prayed' && typeof prayerName === 'string') {
          // Route the action straight into the salah tracker. togglePrayer()
          // guards against early check-ins and fires the 'salah-updated' event,
          // so an open Dashboard re-renders its quick check-in row.
          import('./salah-tracker').then(({ togglePrayer, getTodayPrayers }) => {
            const validKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
            const key = prayerName.toLowerCase();
            if (!validKeys.includes(key as typeof validKeys[number])) return;
            const prayerKey = key as typeof validKeys[number];
            if (!getTodayPrayers()[prayerKey]) {
              togglePrayer(prayerKey);
            }
          }).catch((error) => {
            console.warn('Failed to record prayer check-in from notification action:', error);
          });
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
        timeZone?: string;
      };

      if (typeof locationData.latitude !== 'number' || typeof locationData.longitude !== 'number') {
        return;
      }

      const now = new Date();
      // Task 21-d: pre/post reminder prefs participate in the signature so any
      // toggle/minutes change forces a full reschedule.
      const prePostSettings = getPrePostReminderSettings();
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
        adhanConfigText,
        `pre-${prePostSettings.preEnabled ? prePostSettings.preMinutes : 'off'}`,
        `post-${prePostSettings.postEnabled ? prePostSettings.postMinutes : 'off'}`,
        `end-${prePostSettings.endEnabled ? prePostSettings.endMinutes : 'off'}`
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
          // Aladhan timings are wall clock in the location's timezone; parsing
          // them device-locally shifted every alarm by the timezone difference.
          const prayerDate = zonedWallTimeToDate(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, locationData.timeZone, targetDate);

          if (prayerDate <= now) {
            continue;
          }

          const notificationId = this.getNotificationId(prayerName, prayerDate);
          const endsAt = getPrayerEndsAtText(prayerName, dayData.timings, dayData, targetDate);
          const message = getPrayerNotificationMessage(prayerName, cleaned, { endsAt, referenceDate: targetDate });
          const notification: LocalNotificationSchema = {
            id: notificationId,
            title: message.title,
            body: message.body,
            largeBody: message.largeBody,
            summaryText: message.summaryText,
            schedule: {
              at: prayerDate,
              allowWhileIdle: true,
              repeats: false,
            },
            sound: 'default',
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            iconColor: NOTIFICATION_ACCENT_COLOR,
            channelId: NOTIFICATION_CHANNELS.prayerTimes,
            group: 'noor-prayers',
            actionTypeId: 'prayer_actions',
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

          // Task 21-d: schedule the PRE reminder (prayerDate - prePrayerMinutes).
          // Follows the same per-prayer toggle filtering as the at-time notification.
          if (prePostSettings.preEnabled) {
            const preDate = new Date(prayerDate.getTime() - prePostSettings.preMinutes * 60000);
            if (preDate > now) {
              const preNotificationId = notificationId + PRE_PRAYER_ID_OFFSET;
              const preMessage = getPrePrayerNotificationMessage(prayerName, prePostSettings.preMinutes, targetDate);
              const preNotification: LocalNotificationSchema = {
                id: preNotificationId,
                title: preMessage.title,
                body: preMessage.body,
                largeBody: preMessage.largeBody,
                schedule: {
                  at: preDate,
                  allowWhileIdle: true,
                  repeats: false,
                },
                sound: 'default',
                smallIcon: 'ic_notification',
                largeIcon: 'ic_launcher',
                iconColor: NOTIFICATION_ACCENT_COLOR,
                channelId: NOTIFICATION_CHANNELS.prayerPrep,
                group: 'noor-prayers',
                actionTypeId: 'prayer_actions',
                extra: {
                  prayerName,
                  prayerTime: cleaned,
                  type: 'pre_prayer_reminder',
                  location: locationData,
                  scheduledDate: targetDate.toISOString(),
                },
              };

              notifications.push(preNotification);
              this.scheduledNotifications.set(preNotificationId, {
                id: preNotificationId,
                title: preMessage.title,
                body: preMessage.body,
                scheduleTime: preDate,
                prayerName,
              });
            }
          }

          // Task 21-d: schedule the POST reminder (prayerDate + postPrayerMinutes).
          if (prePostSettings.postEnabled) {
            const postDate = new Date(prayerDate.getTime() + prePostSettings.postMinutes * 60000);
            if (postDate > now) {
              const postNotificationId = notificationId + POST_PRAYER_ID_OFFSET;
              const postMessage = getPostPrayerNotificationMessage(prayerName);
              const postNotification: LocalNotificationSchema = {
                id: postNotificationId,
                title: postMessage.title,
                body: postMessage.body,
                largeBody: postMessage.largeBody,
                schedule: {
                  at: postDate,
                  allowWhileIdle: true,
                  repeats: false,
                },
                sound: 'default',
                smallIcon: 'ic_notification',
                largeIcon: 'ic_launcher',
                iconColor: NOTIFICATION_ACCENT_COLOR,
                channelId: NOTIFICATION_CHANNELS.prayerPrep,
                group: 'noor-prayers',
                extra: {
                  prayerName,
                  prayerTime: cleaned,
                  type: 'post_prayer_reminder',
                  location: locationData,
                  scheduledDate: targetDate.toISOString(),
                },
              };

              notifications.push(postNotification);
              this.scheduledNotifications.set(postNotificationId, {
                id: postNotificationId,
                title: postMessage.title,
                body: postMessage.body,
                scheduleTime: postDate,
                prayerName,
              });
            }
          }

          // NC-9: schedule the END-OF-WINDOW reminder (endDate - endMinutes).
          // "Asr ends in 15 minutes" - fired before the prayer time expires so
          // the user can still pray within the window. Only when the end Date
          // is valid, lies after the prayer start, and is still in the future.
          if (prePostSettings.endEnabled) {
            const endDate = getPrayerEndDate(prayerName, dayData.timings, targetDate);
            if (endDate && endDate.getTime() > prayerDate.getTime()) {
              const remindDate = new Date(endDate.getTime() - prePostSettings.endMinutes * 60000);
              if (remindDate > now) {
                const endNotificationId = notificationId + PRAYER_END_ID_OFFSET;
                const endMessage = getPrayerEndNotificationMessage(prayerName, prePostSettings.endMinutes);
                const endNotification: LocalNotificationSchema = {
                  id: endNotificationId,
                  title: endMessage.title,
                  body: endMessage.body,
                  largeBody: endMessage.largeBody,
                  schedule: {
                    at: remindDate,
                    allowWhileIdle: true,
                    repeats: false,
                  },
                  sound: 'default',
                  smallIcon: 'ic_notification',
                  largeIcon: 'ic_launcher',
                  iconColor: NOTIFICATION_ACCENT_COLOR,
                  channelId: NOTIFICATION_CHANNELS.prayerPrep,
                  group: 'noor-prayers',
                  extra: {
                    prayerName,
                    prayerTime: cleaned,
                    type: 'prayer_end_reminder',
                    location: locationData,
                    scheduledDate: targetDate.toISOString(),
                  },
                };

                notifications.push(endNotification);
                this.scheduledNotifications.set(endNotificationId, {
                  id: endNotificationId,
                  title: endMessage.title,
                  body: endMessage.body,
                  scheduleTime: remindDate,
                  prayerName,
                });
              }
            }
          }

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

          const message = getPrayerNotificationMessage(prayer.name, prayer.time, { referenceDate: prayer.date });

          const notification = {
            id: notificationId,
            title: message.title,
            body: message.body,
            largeBody: message.largeBody,
            summaryText: message.summaryText,
            schedule: {
              at: prayer.date,
              allowWhileIdle: true, // Wake up device
              repeats: false,
            },
            sound: 'default',
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            iconColor: NOTIFICATION_ACCENT_COLOR,
            channelId: NOTIFICATION_CHANNELS.prayerTimes,
            group: 'noor-prayers',
            actionTypeId: 'prayer_actions',
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

      const message = getPrayerNotificationMessage(prayerName, prayerTime, { referenceDate: prayerDate });

      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title: message.title,
          body: message.body,
          largeBody: message.largeBody,
          summaryText: message.summaryText,
          schedule: {
            at: prayerDate,
            allowWhileIdle: true, // Wake up device
            repeats: false,
          },
          sound: 'default',
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
          iconColor: NOTIFICATION_ACCENT_COLOR,
          channelId: NOTIFICATION_CHANNELS.prayerTimes,
          group: 'noor-prayers',
          actionTypeId: 'prayer_actions',
          extra: {
            prayerName,
            prayerTime,
            type: 'prayer_reminder'
          }
        }]
      });

      this.scheduledNotifications.set(notificationId, {
        id: notificationId,
        title: message.title,
        body: message.body,
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
        .filter(n => isPrayerNotificationType(n.extra?.type))
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
        .filter(n => isPrayerNotificationType(n.extra?.type))
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
   * Schedule a custom notification (for Islamic events, tracker reminders, etc.)
   * `options.channelId` lets feature modules route into their own Android
   * channel (e.g. Noor Cycle reminders); defaults to the events channel.
   */
  async scheduleNotification(
    id: string,
    title: string,
    body: string,
    scheduleTime: Date,
    options?: { channelId?: string; largeBody?: string }
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
          ...(options?.largeBody ? { largeBody: options.largeBody } : {}),
          schedule: {
            at: scheduleTime,
            allowWhileIdle: true,
            repeats: false,
          },
          sound: 'default',
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
          iconColor: NOTIFICATION_ACCENT_COLOR,
          channelId: options?.channelId || NOTIFICATION_CHANNELS.events,
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
  // Task 21-d: pre/post prayer reminder toggles/minutes changed in Settings.
  window.addEventListener('prayer-notification-prefs-changed', handleReschedule);
}
