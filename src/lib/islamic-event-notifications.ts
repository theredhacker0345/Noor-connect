/**
 * islamic-event-notifications.ts — reliable Islamic-event notifications.
 *
 * The service worker's checkIslamicEvents() only runs when the worker wakes
 * up, which on Android is rare outside prayer-alarm days — so an Eid greeting
 * was easily missed. This module instead SCHEDULES the year's fixed Islamic
 * events as Capacitor LocalNotifications days in advance; Android fires them
 * even when the app is closed.
 *
 * Runs only on native. The web PWA keeps the service-worker path (and the SW
 * skips its own greetings on native via the islamicEventsViaNative setting —
 * see sw-settings.ts — so events never double-fire).
 *
 * Alarm budget: 4 fixed, deterministic ids re-scheduled in place (they
 * replace, never accumulate) — well inside the 500-alarm OS cap that the
 * prayer batch is already capped for.
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import i18n from './i18n-new';
import { findNextHijriDate, getHijriDateOffset } from './hijri-tabular';
import { writeSwSetting } from './sw-settings';
import { NOTIFICATION_CHANNELS, NOTIFICATION_ACCENT_COLOR } from './notification-channels';

export const ISLAMIC_EVENT_ID_BASE = 915000;

interface IslamicEvent {
  /** Deterministic notification id (base + index) */
  id: number;
  hijriMonth: number;
  hijriDay: number;
  titleKey: string;
  bodyKey: string;
  /** notification-manager preference that gates this event */
  prefGate: 'eidGreetings' | 'ramadanCountdowns';
  url: string;
  channelId: string;
}

const EVENTS: IslamicEvent[] = [
  {
    id: ISLAMIC_EVENT_ID_BASE + 1,
    hijriMonth: 9,
    hijriDay: 1,
    titleKey: 'islamicEventRamadanTitle',
    bodyKey: 'islamicEventRamadanBody',
    prefGate: 'ramadanCountdowns',
    url: '/ramadan',
    channelId: NOTIFICATION_CHANNELS.ramadan,
  },
  {
    id: ISLAMIC_EVENT_ID_BASE + 2,
    hijriMonth: 10,
    hijriDay: 1,
    titleKey: 'islamicEventFitrTitle',
    bodyKey: 'islamicEventFitrBody',
    prefGate: 'eidGreetings',
    url: '/dashboard',
    channelId: NOTIFICATION_CHANNELS.events,
  },
  {
    id: ISLAMIC_EVENT_ID_BASE + 3,
    hijriMonth: 12,
    hijriDay: 9,
    titleKey: 'islamicEventArafahTitle',
    bodyKey: 'islamicEventArafahBody',
    prefGate: 'eidGreetings',
    url: '/prayers',
    channelId: NOTIFICATION_CHANNELS.events,
  },
  {
    id: ISLAMIC_EVENT_ID_BASE + 4,
    hijriMonth: 12,
    hijriDay: 10,
    titleKey: 'islamicEventAdhaTitle',
    bodyKey: 'islamicEventAdhaBody',
    prefGate: 'eidGreetings',
    url: '/dashboard',
    channelId: NOTIFICATION_CHANNELS.events,
  },
];

const LAST_RUN_KEY = 'islamic-event-notifications-last-run';

/** Schedule (or refresh) the upcoming Islamic-event notifications. Once per day. */
export async function scheduleIslamicEventNotifications(
  gates: { eidGreetings: boolean; ramadanCountdowns: boolean }
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const today = new Date().toDateString();
  try {
    if (localStorage.getItem(LAST_RUN_KEY) === today) return;
    localStorage.setItem(LAST_RUN_KEY, today);
  } catch { /* localStorage unavailable — still schedule */ }

  const offset = getHijriDateOffset();
  const now = new Date();
  const scheduled: import('@capacitor/local-notifications').LocalNotificationSchema[] = [];
  const cancelIds: number[] = [];

  for (const event of EVENTS) {
    // Find the event day on the OFFSET-adjusted Hijri calendar: the user's
    // "day D is <event>" means toHijri(D + offset) hits the target. Walk the
    // shifted calendar (S = D + offset) forward, then shift back to the real
    // Gregorian morning the notification should fire on (08:00 local).
    const probeBase = new Date(now);
    probeBase.setDate(probeBase.getDate() + offset);
    const occurrenceShifted = findNextHijriDate(probeBase, event.hijriMonth, event.hijriDay);
    if (!occurrenceShifted) continue;

    const occurrence = new Date(occurrenceShifted);
    occurrence.setDate(occurrence.getDate() - offset);
    occurrence.setHours(8, 0, 0, 0);

    const gateOn = event.prefGate === 'eidGreetings' ? gates.eidGreetings : gates.ramadanCountdowns;

    if (occurrence.getTime() <= now.getTime() || !gateOn) {
      cancelIds.push(event.id); // passed day or pref disabled — never re-arm
      continue;
    }

    scheduled.push({
      id: event.id,
      title: i18n.t(event.titleKey),
      body: i18n.t(event.bodyKey),
      schedule: { at: occurrence, allowWhileIdle: true, repeats: false },
      sound: 'default',
      smallIcon: 'ic_notification',
      largeIcon: 'ic_launcher',
      iconColor: NOTIFICATION_ACCENT_COLOR,
      channelId: event.channelId,
      extra: { type: 'islamic_event', url: event.url },
    });
  }

  try {
    if (cancelIds.length > 0) {
      await LocalNotifications.cancel({ notifications: cancelIds.map(id => ({ id })) });
    }
    if (scheduled.length > 0) {
      await LocalNotifications.schedule({ notifications: scheduled });
    }
  } catch (error) {
    console.warn('[islamic-event-notifications] scheduling failed:', error);
  }

  // Tell the service worker to keep its hands off event notifications —
  // they are handled natively now (prevents double greetings on Android).
  await writeSwSetting('islamicEventsViaNative', true);
}
