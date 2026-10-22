// ============================================================
//  Haidh Tracker — reminder scheduling
//  Thin wrapper over the app's local-notifications singleton.
//  All data stays on-device; notifications are only a nudge.
// ============================================================

import { localNotifications } from "@/lib/local-notifications";
import type { HaidhTrackerData } from "@/lib/haidh-tracker";
import i18n from "@/lib/i18n-new";
import { NOTIFICATION_CHANNELS } from "@/lib/notification-channels";

// Stable notification IDs (hashed to numeric IDs internally)
const ID_GHUSL = "haidh-ghusl-reminder";
const ID_PREDICT = "haidh-period-predict";
const ID_DAILY_LOG = "haidh-daily-log";
const ID_FERTILE = "haidh-fertile-window";
const ID_FAST_MAKEUP = "haidh-fast-makeup";

const MS_PER_DAY = 86_400_000;

const at = (h: number, m: number): { hours: number; minutes: number } => ({ hours: h, minutes: m });

const setTime = (date: Date, { hours, minutes }: { hours: number; minutes: number }): Date => {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

/**
 * Reconcile scheduled reminders with the user's current data & preferences.
 * Cancels anything no longer relevant and (re)schedules what is. Safe to call
 * on every data change — old notifications are cancelled by stable ID first.
 */
export const syncHaidhNotifications = async (data: HaidhTrackerData): Promise<void> => {
  // Always cancel the lot first, then reschedule what applies now.
  await Promise.all([
    localNotifications.cancelNotification(ID_GHUSL),
    localNotifications.cancelNotification(ID_PREDICT),
    localNotifications.cancelNotification(ID_DAILY_LOG),
    localNotifications.cancelNotification(ID_FERTILE),
    localNotifications.cancelNotification(ID_FAST_MAKEUP),
  ]);

  const now = new Date();

  // 1) Ghusl reminder — fires the morning after the period ends, while the
  //    cycle is closed but (ideally) before salah. Only schedule if it's in
  //    the future, so a historical end date doesn't spam the user.
  const lastCycle = data.cycles[0];
  if (data.ghusulReminderEnabled && lastCycle?.endDate) {
    const end = new Date(lastCycle.endDate);
    const fire = setTime(new Date(end.getTime() + MS_PER_DAY), at(7, 0));
    if (fire.getTime() > now.getTime()) {
      await localNotifications.scheduleNotification(
        ID_GHUSL,
        i18n.t("haidhNotifGhuslTitle"),
        i18n.t("haidhNotifGhuslBody"),
        fire,
        { channelId: NOTIFICATION_CHANNELS.noorCycle }
      );
    }
  }

  // 2) Period prediction reminder — 2 days before the predicted start.
  if (data.periodPredictionReminderEnabled && data.nextPredictedStart) {
    const predicted = new Date(data.nextPredictedStart);
    const fire = setTime(new Date(predicted.getTime() - 2 * MS_PER_DAY), at(9, 0));
    if (fire.getTime() > now.getTime()) {
      await localNotifications.scheduleNotification(
        ID_PREDICT,
        i18n.t("haidhNotifPredictTitle"),
        i18n.t("haidhNotifPredictBody"),
        fire,
        { channelId: NOTIFICATION_CHANNELS.noorCycle }
      );
    }
  }

  // 3) Daily log reminder — gentle evening nudge to log today's flow/symptoms.
  if (data.dailyLogReminderEnabled && data.isActive) {
    const fire = setTime(now, at(20, 0));
    // If today's slot already passed, push to tomorrow.
    const next = fire.getTime() > now.getTime() ? fire : new Date(fire.getTime() + MS_PER_DAY);
    await localNotifications.scheduleNotification(
      ID_DAILY_LOG,
      i18n.t("haidhNotifLogTitle"),
      i18n.t("haidhNotifLogBody"),
      next,
      { channelId: NOTIFICATION_CHANNELS.noorCycle }
    );
  }

  // 4) Fertile window reminder — ~14 days before next predicted period
  if (data.periodPredictionReminderEnabled && data.nextPredictedStart) {
    const predicted = new Date(data.nextPredictedStart);
    // 15 days before next period is generally the start of the fertile window
    const fire = setTime(new Date(predicted.getTime() - 15 * MS_PER_DAY), at(10, 0));
    // Ensure we are not currently active and the time is in the future
    if (!data.isActive && fire.getTime() > now.getTime()) {
      await localNotifications.scheduleNotification(
        ID_FERTILE,
        i18n.t("haidhNotifFertileTitle"),
        i18n.t("haidhNotifFertileBody"),
        fire,
        { channelId: NOTIFICATION_CHANNELS.noorCycle }
      );
    }
  }

  // 5) Smart Qaza Fasting Reminder — If user owes fasts and isn't currently menstruating
  const unfulfilledFasts = data.missedRamadanFasts - data.madeUpRamadanFasts;
  if (!data.isActive && unfulfilledFasts > 0) {
    // Find the next Sunday evening (to prepare for Monday fasting)
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7)); // Next Sunday
    const fire = setTime(nextSunday, at(19, 0)); // 7:00 PM Sunday
    
    // If today is Sunday and it's past 7 PM, push to next Sunday
    if (fire.getTime() <= now.getTime()) {
      fire.setDate(fire.getDate() + 7);
    }

    await localNotifications.scheduleNotification(
      ID_FAST_MAKEUP,
      i18n.t("haidhNotifFastTitle", { count: unfulfilledFasts }),
      i18n.t("haidhNotifFastBody"),
      fire,
      { channelId: NOTIFICATION_CHANNELS.noorCycle }
    );
  }
};
