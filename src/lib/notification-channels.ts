/**
 * Notification Channels (Android 8.0+)
 * ------------------------------------
 * Central registry for every logical notification category the app can post.
 *
 * Why this exists:
 * - Without an explicit `channelId`, Capacitor LocalNotifications falls back to
 *   the plugin's "default" channel (created natively in MainActivity) whose
 *   user-facing name is "Default" — poor UX in Android's channel settings.
 * - Channel names/descriptions are user-visible in Android Settings, so they
 *   are localized with the same i18n catalogue as the rest of the app.
 * - Channel IDs are intentionally STABLE strings: Android channels are
 *   immutable after creation, so renaming an id would orphan the old channel
 *   for upgraded users. Never rename an existing id — only add new ones.
 *
 * Importance mapping (Android):
 *   1 = MIN (silent)   2 = LOW (no sound/heads-up)   3 = DEFAULT
 *   4 = HIGH (sound + heads-up)   5 = MAX (DND-breaking, avoid)
 *
 * Visibility mapping (lock screen):
 *  -1 = SECRET (never show)   0 = PRIVATE (redacted)   1 = PUBLIC
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import i18n from './i18n-new';

/** Stable channel ids. DO NOT rename — see module docblock. */
export const NOTIFICATION_CHANNELS = {
  prayerTimes: 'noor_prayer_times',
  prayerPrep: 'noor_prayer_prep',
  ramadan: 'noor_ramadan',
  hydration: 'noor_hydration',
  noorCycle: 'noor_cycle',
  reminders: 'noor_reminders',
  events: 'noor_events',
  sleep: 'noor_sleep',
} as const;

export type NoorChannelId = (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

/** Brand gold used for the notification accent (icon tint + light color). */
export const NOTIFICATION_ACCENT_COLOR = '#C9860A';

type ChannelSpec = {
  id: NoorChannelId;
  /** i18n key for the channel name shown in Android Settings. */
  nameKey: string;
  /** i18n key for the channel description shown in Android Settings. */
  descriptionKey: string;
  importance: 1 | 2 | 3 | 4 | 5;
  visibility: -1 | 0 | 1;
  vibration: boolean;
  lights: boolean;
};

const CHANNEL_SPECS: ChannelSpec[] = [
  {
    id: NOTIFICATION_CHANNELS.prayerTimes,
    nameKey: 'notifChannelPrayerTimes',
    descriptionKey: 'notifChannelPrayerTimesDesc',
    importance: 4,
    visibility: 1,
    vibration: true,
    lights: true,
  },
  {
    id: NOTIFICATION_CHANNELS.prayerPrep,
    nameKey: 'notifChannelPrayerPrep',
    descriptionKey: 'notifChannelPrayerPrepDesc',
    importance: 3,
    visibility: 1,
    vibration: false,
    lights: false,
  },
  {
    id: NOTIFICATION_CHANNELS.ramadan,
    nameKey: 'notifChannelRamadan',
    descriptionKey: 'notifChannelRamadanDesc',
    importance: 4,
    visibility: 1,
    vibration: true,
    lights: true,
  },
  {
    id: NOTIFICATION_CHANNELS.hydration,
    nameKey: 'notifChannelHydration',
    descriptionKey: 'notifChannelHydrationDesc',
    importance: 2,
    visibility: 1,
    vibration: false,
    lights: false,
  },
  {
    id: NOTIFICATION_CHANNELS.noorCycle,
    nameKey: 'notifChannelNoorCycle',
    descriptionKey: 'notifChannelNoorCycleDesc',
    importance: 3,
    visibility: 0,
    vibration: true,
    lights: false,
  },
  {
    id: NOTIFICATION_CHANNELS.reminders,
    nameKey: 'notifChannelReminders',
    descriptionKey: 'notifChannelRemindersDesc',
    importance: 3,
    visibility: 1,
    vibration: false,
    lights: false,
  },
  {
    id: NOTIFICATION_CHANNELS.events,
    nameKey: 'notifChannelEvents',
    descriptionKey: 'notifChannelEventsDesc',
    importance: 3,
    visibility: 1,
    vibration: true,
    lights: false,
  },
  {
    id: NOTIFICATION_CHANNELS.sleep,
    nameKey: 'notifChannelSleep',
    descriptionKey: 'notifChannelSleepDesc',
    importance: 2,
    visibility: 1,
    vibration: false,
    lights: false,
  },
];

let channelsCreated = false;

/**
 * Create (or no-op update) every Noor Connect channel on native Android.
 * `createChannel` is idempotent: existing channels keep their user-modified
 * settings, missing channels are created. Safe to call repeatedly.
 * Web → returns immediately (guarded, zero console noise).
 */
export async function ensureNoorNotificationChannels(): Promise<void> {
  if (channelsCreated) return;
  if (!Capacitor.isNativePlatform()) {
    channelsCreated = true;
    return;
  }

  try {
    for (const spec of CHANNEL_SPECS) {
      try {
        await LocalNotifications.createChannel({
          id: spec.id,
          name: i18n.t(spec.nameKey),
          description: i18n.t(spec.descriptionKey),
          importance: spec.importance,
          visibility: spec.visibility,
          vibration: spec.vibration,
          lights: spec.lights,
          ...(spec.lights ? { lightColor: NOTIFICATION_ACCENT_COLOR } : {}),
        });
      } catch (channelError) {
        // One failing channel must not block the others.
        console.warn(`Failed to create notification channel "${spec.id}":`, channelError);
      }
    }
    channelsCreated = true;
  } catch (error) {
    console.warn('Failed to create notification channels:', error);
  }
}

export function isNoorChannelId(value: unknown): value is NoorChannelId {
  return typeof value === 'string' && Object.values(NOTIFICATION_CHANNELS).includes(value as NoorChannelId);
}
