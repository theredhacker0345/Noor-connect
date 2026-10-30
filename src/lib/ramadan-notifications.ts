import { unifiedNotifications } from './unified-notifications';
import i18n from './i18n-new';
import { NOTIFICATION_CHANNELS } from './notification-channels';
import { LOCATION_STORAGE_KEY } from './location-config';
import { zonedWallTimeToDate } from './tz-time';

export class RamadanNotifications {
  private static instance: RamadanNotifications;

  static getInstance(): RamadanNotifications {
    if (!RamadanNotifications.instance) {
      RamadanNotifications.instance = new RamadanNotifications();
    }
    return RamadanNotifications.instance;
  }

  private buildTimeToday(time: string): Date | null {
    const [hoursRaw, minutesRaw] = time.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }

    // Prayer times are wall clock in the location's timezone, not the device's.
    let timeZone: string | undefined;
    try {
      timeZone = JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY) || '')?.timeZone;
    } catch { /* no stored location timezone */ }
    return zonedWallTimeToDate(`${hours}:${minutes}`, timeZone);
  }

  // Schedule Suhoor reminder (30 minutes before Fajr)
  async scheduleSuhoorReminder(fajrTime: string, location: string) {
    const fajrDate = this.buildTimeToday(fajrTime);
    if (!fajrDate) return;

    const suhoorTime = new Date(fajrDate);
    suhoorTime.setMinutes(suhoorTime.getMinutes() - 30); // 30 minutes before Fajr

    if (suhoorTime > new Date()) {
      await unifiedNotifications.schedulePrayerNotification('Suhoor', suhoorTime, {
        title: i18n.t('ramadanNotifSuhoorTitle'),
        body: i18n.t('ramadanNotifSuhoorBody', { location, time: fajrTime }),
        icon: 'moon'
      });

      // Schedule water reminder before Suhoor ends
      const waterBeforeSuhoorTime = new Date(suhoorTime);
      waterBeforeSuhoorTime.setMinutes(waterBeforeSuhoorTime.getMinutes() + 20); // 20 minutes after Suhoor starts

      if (waterBeforeSuhoorTime > new Date()) {
        await unifiedNotifications.schedulePrayerNotification('Water-Before-Suhoor', waterBeforeSuhoorTime, {
          title: i18n.t('ramadanNotifHydrationTitle'),
          body: i18n.t('ramadanNotifHydrationSuhoorBody'),
          icon: 'droplet',
          channelId: NOTIFICATION_CHANNELS.hydration
        });
      }
    }
  }

  // Schedule Iftar reminder (at Maghrib time)
  async scheduleIftarReminder(maghribTime: string, location: string, waterRemindersEnabled: boolean = true) {
    const iftarTime = this.buildTimeToday(maghribTime);
    if (!iftarTime) return;

    if (iftarTime > new Date()) {
      await unifiedNotifications.schedulePrayerNotification('Iftar', iftarTime, {
        title: i18n.t('ramadanNotifIftarTitle'),
        body: i18n.t('ramadanNotifIftarBody', { location, time: maghribTime }),
        icon: 'sunset'
      });

      // Schedule water reminders after Iftar
      await this.scheduleWaterRemindersAfterIftar(iftarTime, location, waterRemindersEnabled);
    }
  }

  // Schedule water reminders at intervals after Iftar
  async scheduleWaterRemindersAfterIftar(iftarTime: Date, location: string, enabled: boolean = true) {
    if (!enabled) return; // Skip if water reminders are disabled

    const waterReminders = [
      { minutes: 15, key: 'ramadanNotifWater15' },
      { minutes: 30, key: 'ramadanNotifWater30' },
      { minutes: 45, key: 'ramadanNotifWater45' },
      { minutes: 60, key: 'ramadanNotifWater60' },
      { minutes: 90, key: 'ramadanNotifWater90' },
      { minutes: 120, key: 'ramadanNotifWater120' },
      { minutes: 150, key: 'ramadanNotifWater150' },
      { minutes: 180, key: 'ramadanNotifWater180' }
    ];

    for (const reminder of waterReminders) {
      const reminderTime = new Date(iftarTime);
      reminderTime.setMinutes(reminderTime.getMinutes() + reminder.minutes);

      if (reminderTime > new Date()) {
        await unifiedNotifications.schedulePrayerNotification(`Water-${reminder.minutes}`, reminderTime, {
          title: i18n.t('ramadanNotifHydrationTitle'),
          body: i18n.t(reminder.key),
          icon: 'droplet',
          channelId: NOTIFICATION_CHANNELS.hydration
        });
      }
    }
  }

  // Schedule Tarawih reminder (30 minutes after Isha)
  async scheduleTarawihReminder(ishaTime: string, location: string) {
    const ishaDate = this.buildTimeToday(ishaTime);
    if (!ishaDate) return;

    const tarawihTime = new Date(ishaDate);
    tarawihTime.setMinutes(tarawihTime.getMinutes() + 30); // 30 minutes after Isha

    if (tarawihTime > new Date()) {
      await unifiedNotifications.schedulePrayerNotification('Tarawih', tarawihTime, {
        title: i18n.t('ramadanNotifTarawihTitle'),
        body: i18n.t('ramadanNotifTarawihBody', { location }),
        icon: 'star'
      });
    }
  }

  // Schedule daily Quran reading reminder
  async scheduleQuranReminder(time: string = '08:00') {
    const reminderTime = this.buildTimeToday(time);
    if (!reminderTime) return;

    if (reminderTime > new Date()) {
      await unifiedNotifications.schedulePrayerNotification('Quran', reminderTime, {
        title: i18n.t('ramadanNotifQuranTitle'),
        body: i18n.t('ramadanNotifQuranBody'),
        icon: 'book'
      });
    }
  }

  // Schedule charity reminder (every Friday)
  async scheduleCharityReminder() {
    const nextFriday = new Date();
    const dayOfWeek = nextFriday.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    nextFriday.setDate(nextFriday.getDate() + daysUntilFriday);
    nextFriday.setHours(10, 0, 0, 0); // 10 AM on Friday

    await unifiedNotifications.schedulePrayerNotification('Charity', nextFriday, {
      title: i18n.t('ramadanNotifCharityTitle'),
      body: i18n.t('ramadanNotifCharityBody'),
      icon: 'heart'
    });
  }

  // Send motivational messages throughout Ramadan
  async sendRamadanMotivation(ramadanDay: number) {
    const motivationKeys = [
      'ramadanMotivation1',
      'ramadanMotivation2',
      'ramadanMotivation3',
      'ramadanMotivation4',
      'ramadanMotivation5',
      'ramadanMotivation6',
      'ramadanMotivation7',
      'ramadanMotivation8'
    ];

    const motivationKey = motivationKeys[Math.min(ramadanDay - 1, motivationKeys.length - 1)];

    await unifiedNotifications.showNotification({
      title: i18n.t('ramadanNotifMotivationTitle'),
      body: i18n.t(motivationKey),
      icon: 'sparkles'
    });
  }

  // Clear all Ramadan notifications
  async clearRamadanNotifications() {
    console.log('Clearing old Ramadan notifications');
    await unifiedNotifications.clearRamadanNotifications();
  }

  // Schedule all Ramadan notifications for the day
  async scheduleDailyRamadanNotifications(
    fajrTime: string,
    maghribTime: string,
    ishaTime: string,
    location: string,
    ramadanDay: number,
    waterRemindersEnabled: boolean = true
  ) {
    // Clear previous notifications
    await this.clearRamadanNotifications();

    // Schedule new notifications
    await this.scheduleSuhoorReminder(fajrTime, location);
    await this.scheduleIftarReminder(maghribTime, location, waterRemindersEnabled);
    await this.scheduleTarawihReminder(ishaTime, location);
    await this.scheduleQuranReminder();

    // Send motivation every 3 days
    if (ramadanDay % 3 === 0) {
      await this.sendRamadanMotivation(ramadanDay);
    }

    // Schedule charity reminder on Fridays
    const today = new Date();
    if (today.getDay() === 5) { // Friday
      await this.scheduleCharityReminder();
    }
  }
}
