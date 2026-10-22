/**
 * Islamic Events Notification Service
 * Handles notifications for important Islamic events and holidays
 */

import { importantIslamicDates } from '@/data/islamic-dates';
import { islamicCalendarService, type IslamicCalendarInfo } from '@/lib/islamic-calendar-service';
import { localNotifications } from '@/lib/local-notifications';
import i18n from '@/lib/i18n-new';

export interface IslamicEventNotification {
  id: string;
  title: string;
  body: string;
  date: Date;
  hijriDate: string;
  type: 'eid' | 'ramadan' | 'hajj' | 'other';
  scheduled: boolean;
}

class IslamicEventsService {
  private static instance: IslamicEventsService;
  private readonly STORAGE_KEY = 'islamic-events-notifications';
  private readonly NOTIFICATION_PREFIX = 'islamic-event-';

  static getInstance(): IslamicEventsService {
    if (!IslamicEventsService.instance) {
      IslamicEventsService.instance = new IslamicEventsService();
    }
    return IslamicEventsService.instance;
  }

  private lastScheduleDate: string | null = null;

  /**
   * Check and schedule notifications for upcoming Islamic events
   */
  async scheduleUpcomingEvents(): Promise<void> {
    const today = new Date().toDateString();
    // Only schedule once per day to avoid re-scheduling on every mount
    if (this.lastScheduleDate === today) return;
    this.lastScheduleDate = today;

    try {
      const calendarInfo = await islamicCalendarService.getIslamicCalendarInfo();
      const upcomingEvents = await this.getUpcomingEvents(calendarInfo);

      for (const event of upcomingEvents) {
        await this.scheduleEventNotification(event);
      }
    } catch (error) {
      console.error('Error scheduling Islamic events:', error);
    }
  }

  /**
   * Get upcoming Islamic events within the next 30 days
   */
  private async getUpcomingEvents(calendarInfo: IslamicCalendarInfo): Promise<Array<typeof importantIslamicDates[0] & { gregorianDate: Date }>> {
    const upcomingEvents = [];
    const currentDate = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);

    // Check current month and next 2 months for events
    for (let monthOffset = 0; monthOffset <= 2; monthOffset++) {
      const checkDate = new Date(currentDate);
      checkDate.setMonth(checkDate.getMonth() + monthOffset);
      
      for (const event of importantIslamicDates) {
        try {
          // Get Gregorian date for this Hijri event
          const gregorianDate = await this.getGregorianDateForHijriEvent(
            event.hijriMonth,
            event.hijriDay,
            checkDate.getFullYear()
          );

          if (gregorianDate >= currentDate && gregorianDate <= maxDate) {
            upcomingEvents.push({
              ...event,
              gregorianDate
            });
          }
        } catch (error) {
          console.error(`Error calculating date for ${event.name}:`, error);
        }
      }
    }

    return upcomingEvents.sort((a, b) => a.gregorianDate.getTime() - b.gregorianDate.getTime());
  }

  private hijriDateCache: Map<string, Date> = new Map();

  private async getGregorianDateForHijriEvent(hijriMonth: number, hijriDay: number, year: number): Promise<Date> {
    const cacheKey = `${hijriMonth}-${hijriDay}-${year}`;
    const cached = this.hijriDateCache.get(cacheKey);
    if (cached) return cached;

    const startDate = new Date(year, 0, 1);

    for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + dayOffset);

      try {
        const islamicDate = islamicCalendarService.calculateIslamicDate(checkDate);
        const month = Number(islamicDate.hijri.month.number);
        const day = Number(islamicDate.hijri.day);

        if (month === hijriMonth && day === hijriDay) {
          this.hijriDateCache.set(cacheKey, checkDate);
          return checkDate;
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error(`Could not find Gregorian date for Hijri ${hijriMonth}-${hijriDay}`);
  }

  /**
   * Schedule notification for a specific Islamic event
   */
  private async scheduleEventNotification(event: typeof importantIslamicDates[0] & { gregorianDate: Date }): Promise<void> {
    const notificationId = `${this.NOTIFICATION_PREFIX}${event.id}`;
    
    try {
      // Schedule notification for the day of the event at 9 AM
      const notificationDate = new Date(event.gregorianDate);
      notificationDate.setHours(9, 0, 0, 0);

      // Only schedule if it's in the future
      if (notificationDate > new Date()) {
        await localNotifications.scheduleNotification(
          notificationId,
          event.name,
          event.notificationMessage,
          notificationDate
        );

        // Also schedule a reminder 1 day before for important events
        if (event.type === 'eid' || event.type === 'ramadan') {
          const reminderDate = new Date(notificationDate);
          reminderDate.setDate(reminderDate.getDate() - 1);
          reminderDate.setHours(20, 0, 0, 0); // 8 PM reminder

          await localNotifications.scheduleNotification(
            `${notificationId}-reminder`,
            i18n.t('notifEventReminderTitle', { name: event.name }),
            i18n.t('notifEventReminderBody', { name: event.name, message: event.notificationMessage }),
            reminderDate
          );
        }

        console.log(`Scheduled notification for ${event.name} on ${event.gregorianDate.toDateString()}`);
      }
    } catch (error) {
      console.error(`Error scheduling notification for ${event.name}:`, error);
    }
  }

  /**
   * Get today's Islamic event if any
   */
  async getTodaysIslamicEvent(): Promise<typeof importantIslamicDates[0] | null> {
    try {
      const calendarInfo = await islamicCalendarService.getIslamicCalendarInfo();
      
      // Check for specific events first
      const specificEvent = importantIslamicDates.find(event => 
        event.hijriMonth === calendarInfo.hijriMonth && 
        event.hijriDay === calendarInfo.hijriDay
      );
      
      if (specificEvent) {
        return specificEvent;
      }
      
      // Check if we're in Ramadan (month 9) but not on a specific event day
      if (calendarInfo.hijriMonth === 9) {
        // Return a general Ramadan event for ongoing Ramadan
        return {
          id: 'ramadan-ongoing',
          name: 'Ramadan - Month of Fasting',
          arabicName: 'شهر رمضان',
          hijriMonth: 9,
          hijriDay: calendarInfo.hijriDay,
          description: `Day ${calendarInfo.hijriDay} of Ramadan - Continue your spiritual journey`,
          type: 'ramadan',
          notificationMessage: 'Continue your Ramadan journey with prayer, fasting, and reflection.'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting today\'s Islamic event:', error);
      return null;
    }
  }

  /**
   * Get upcoming events in the next 7 days
   */
  async getUpcomingEventsNext7Days(): Promise<Array<typeof importantIslamicDates[0] & { gregorianDate: Date; daysUntil: number }>> {
    try {
      const calendarInfo = await islamicCalendarService.getIslamicCalendarInfo();
      const upcomingEvents = await this.getUpcomingEvents(calendarInfo);
      
      return upcomingEvents
        .filter(event => {
          const daysUntil = Math.ceil((event.gregorianDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return daysUntil <= 7 && daysUntil > 0;
        })
        .map(event => ({
          ...event,
          daysUntil: Math.ceil((event.gregorianDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        }));
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }

  /**
   * Clear all Islamic event notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      for (const event of importantIslamicDates) {
        const notificationId = `${this.NOTIFICATION_PREFIX}${event.id}`;
        await localNotifications.cancelNotification(notificationId);
        await localNotifications.cancelNotification(`${notificationId}-reminder`);
      }
    } catch (error) {
      console.error('Error clearing Islamic event notifications:', error);
    }
  }

  private lastRamadanCheckDay: number = -1;

  /**
   * Check if Ramadan is approaching and show special notifications
   */
  async checkRamadanApproaching(): Promise<void> {
    const todayDayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    if (this.lastRamadanCheckDay === todayDayOfYear) return;
    this.lastRamadanCheckDay = todayDayOfYear;

    try {
      const calendarInfo = await islamicCalendarService.getIslamicCalendarInfo();
      const daysUntilRamadan = calendarInfo.daysUntilRamadan;

      if (daysUntilRamadan > 0 && daysUntilRamadan <= 30) {
        // Same localized copy as NotificationManager's Ramadan countdown so
        // both countdown producers stay consistent.
        let message = '';
        let title = '';

        if (daysUntilRamadan <= 7) {
          title = i18n.t('notifRamadanAlmostTitle');
          message = daysUntilRamadan === 1
            ? i18n.t('notifRamadanTomorrowBody')
            : i18n.t('notifRamadanDaysLeftBody', { count: daysUntilRamadan });
        } else {
          title = i18n.t('notifRamadanPrepTitle');
          message = i18n.t('notifRamadanPrepBody', { count: daysUntilRamadan });
        }

        if (title && message) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);

          await localNotifications.scheduleNotification(
            'ramadan-approaching-reminder',
            title,
            message,
            tomorrow
          );
        }
      }
    } catch (error) {
      console.error('Error checking Ramadan approaching:', error);
    }
  }
}

export const islamicEventsService = IslamicEventsService.getInstance();
