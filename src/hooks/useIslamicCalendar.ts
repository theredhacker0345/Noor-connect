/**
 * Islamic Calendar Hook (Maghrib-aware)
 * 
 * Islamic dates change at Maghrib (sunset), NOT at midnight.
 * This hook uses the Aladhan monthly calendar data, which contains both
 * Maghrib times and Hijri dates, to determine the correct Islamic date:
 * 
 * - Before Maghrib: show TODAY's Hijri date from the API
 * - After Maghrib: show TOMORROW's Hijri date from the API
 *   (because the new Islamic day begins at Maghrib)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AladhanAPI, AladhanDayData } from '@/lib/aladhan-api';
import { useLocationState } from '@/lib/location-state';
import { globalTimerManager } from '@/lib/timer-manager';
import { islamicCalendarService } from '@/lib/islamic-calendar-service';
import i18n from '@/lib/i18n-new';

/** Hijri month number (1-12) -> i18n key. All 7 locales ship these keys. */
const HIJRI_MONTH_KEYS = [
  '',
  'hijriMuharram',
  'hijriSafar',
  'hijriRabiAwwal',
  'hijriRabiThani',
  'hijriJumadaAwwal',
  'hijriJumadaThani',
  'hijriRajab',
  'hijriShaban',
  'hijriRamadan',
  'hijriShawwal',
  'hijriDhulQidah',
  'hijriDhulHijjah',
] as const;

export interface UseIslamicCalendarReturn {
  islamicInfo: {
    currentDate: {
      hijri: {
        day: string;
        month: { number: number; en: string; ar: string };
        year: string;
        weekday: { en: string; ar: string };
        holidays: string[];
      };
    };
    isRamadan: boolean;
    ramadanDay: number;
    daysUntilRamadan: number;
    isEidAlFitr: boolean;
    isEidAlAdha: boolean;
    hijriMonth: number;
    hijriDay: number;
    hijriYear: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  isRamadan: boolean;
  ramadanDay: number;
  daysUntilRamadan: number;
  isEidAlFitr: boolean;
  isEidAlAdha: boolean;
  hijriDate: string;
  refresh: () => Promise<void>;
}

/**
 * Parse a time string like "17:45 (PKT)" into minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
  const parts = cleaned.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return -1;
  return hours * 60 + minutes;
}

export function useIslamicCalendar(): UseIslamicCalendarReturn {
  const location = useLocationState();
  const { t } = useTranslation(undefined, { i18n });
  const [hijriDay, setHijriDay] = useState('');
  const [hijriMonthNum, setHijriMonthNum] = useState(0);
  const [hijriMonthEn, setHijriMonthEn] = useState('');
  const [hijriMonthAr, setHijriMonthAr] = useState('');
  const [hijriYear, setHijriYear] = useState('');
  const [hijriWeekday, setHijriWeekday] = useState({ en: '', ar: '' });
  const [hijriHolidays, setHijriHolidays] = useState<string[]>([]);
  const [daysUntilRamadan, setDaysUntilRamadan] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastUpdateKey = useRef<string>('');

  const computeIslamicDate = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const now = new Date();
      const today = now;

      // Get today's data from the Aladhan monthly calendar cache
      let todayData: AladhanDayData | null = null;

      if (location.latitude && location.longitude) {
        todayData = AladhanAPI.getPrayerTimesForDate(today, location.latitude, location.longitude);

        // If cache miss, fetch fresh data
        if (!todayData) {
          try {
            await AladhanAPI.fetchMonthlyCalendar(
              location.latitude,
              location.longitude,
              today.getFullYear(),
              today.getMonth() + 1,
              1
            );
            todayData = AladhanAPI.getPrayerTimesForDate(today, location.latitude, location.longitude);
          } catch (fetchErr) {
            console.warn('[useIslamicCalendar] Failed to fetch monthly data:', fetchErr);
          }
        }
      }

      // Use today's Hijri date directly from the Aladhan API
      // The API already returns the correct Hijri date for each Gregorian date.
      // No Maghrib-based advancement — that was double-counting.
      if (todayData) {
        let h = todayData.date.hijri;
        const offset = parseInt(localStorage.getItem('hijri-date-offset') || '0', 10);
        
        if (offset !== 0) {
           const offsetDate = new Date(today);
           offsetDate.setDate(offsetDate.getDate() + offset);
           const offsetData = AladhanAPI.getPrayerTimesForDate(offsetDate, location.latitude, location.longitude);
           if (offsetData) {
             h = offsetData.date.hijri;
            } else {
              // Fallback approximate calculation
              const newHijri = JSON.parse(JSON.stringify(h));
              let newDay = parseInt(newHijri.day) + offset;
              let newMonth = newHijri.month.number;
              let newYear = newHijri.year;

              const getHijriMonthLength = (month: number, year: number) => {
                if (month % 2 === 1) return 30; // Odd months: 30 days
                if (month === 12) {
                  // Leap year check: year mod 30 gives cycle position, leap years are specific ones
                  // Simplified: month 12 can be 30 days in some years
                  return 29;
                }
                return 29; // Even months: 29 days
              };

              if (newDay <= 0) {
                newMonth -= 1;
                if (newMonth < 1) {
                  newMonth = 12;
                  newYear -= 1;
                }
                newDay = getHijriMonthLength(newMonth, newYear) + newDay;
              } else {
                const monthLength = getHijriMonthLength(newMonth, newYear);
                if (newDay > monthLength) {
                  newDay = newDay - monthLength;
                  newMonth += 1;
                  if (newMonth > 12) {
                    newMonth = 1;
                    newYear += 1;
                  }
                }
              }

              newHijri.day = newDay.toString().padStart(2, '0');
              newHijri.month.number = newMonth;
              newHijri.year = newYear;
              h = newHijri;
            }
        }

        setHijriDay(h.day);
        setHijriMonthNum(h.month.number);
        setHijriMonthEn(h.month.en);
        setHijriMonthAr(h.month.ar);
        setHijriYear(h.year);
        setHijriWeekday(h.weekday);
        setHijriHolidays(h.holidays || []);
      } else {
        // Fallback: use the gToH API directly
        const { islamicCalendarService } = await import('@/lib/islamic-calendar-service');
        const info = await islamicCalendarService.getIslamicCalendarInfo(now);
        const h = info.currentDate.hijri;
        setHijriDay(h.day);
        setHijriMonthNum(h.month.number);
        setHijriMonthEn(h.month.en);
        setHijriMonthAr(h.month.ar || '');
        setHijriYear(h.year);
        setHijriWeekday(h.weekday);
        setHijriHolidays(h.holidays || []);
      }
    } catch (err) {
      console.error('[useIslamicCalendar] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Islamic calendar');
    } finally {
      setIsLoading(false);
    }
  }, [location.latitude, location.longitude]);

  // Initial computation + recompute when location changes
  useEffect(() => {
    computeIslamicDate();
  }, [computeIslamicDate]);

  // Compute daysUntilRamadan whenever Hijri data changes
  useEffect(() => {
    if (hijriMonthNum) {
      const day = parseInt(hijriDay) || 0;
      const year = parseInt(hijriYear) || 0;
      setDaysUntilRamadan(islamicCalendarService.calculateDaysUntilRamadanFromHijri(hijriMonthNum, day, year));
    }
  }, [hijriMonthNum, hijriDay, hijriYear]);

  // Listen for manual Hijri offset changes
  useEffect(() => {
    const handleOffsetChange = () => computeIslamicDate();
    window.addEventListener('hijri-date-offset-changed', handleOffsetChange);
    return () => window.removeEventListener('hijri-date-offset-changed', handleOffsetChange);
  }, [computeIslamicDate]);

  // Refresh if the Gregorian date rolls over while the app stays open.
  useEffect(() => {
    lastUpdateKey.current = `${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}`;
    const timerId = globalTimerManager.addCallback(() => {
      const now = new Date();
      const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      if (key !== lastUpdateKey.current) {
        lastUpdateKey.current = key;
        computeIslamicDate();
      }
    }, 60000, 'islamic-calendar');

    return () => globalTimerManager.removeCallback(timerId);
  }, [computeIslamicDate]);

  // Derived values
  const hijriMonthNumber = hijriMonthNum;
  const hijriDayNumber = parseInt(hijriDay) || 0;

  const isRamadan = hijriMonthNumber === 9;
  const ramadanDay = isRamadan ? hijriDayNumber : 0;
  const isEidAlFitr = hijriMonthNumber === 10 && (hijriDayNumber >= 1 && hijriDayNumber <= 3);
  const isEidAlAdha = hijriMonthNumber === 12 && (hijriDayNumber >= 10 && hijriDayNumber <= 13);

  // Localized month name — falls back to the API's English transliteration
  // when a locale somehow lacks the key (i18next echoes the key on a miss).
  const monthKey = HIJRI_MONTH_KEYS[hijriMonthNum] || '';
  const monthT = monthKey ? t(monthKey) : '';
  const monthName = monthT && monthT !== monthKey ? monthT : hijriMonthEn;
  const hijriDate = hijriDay ? `${hijriDay} ${monthName} ${hijriYear}` : '';

  const islamicInfo = hijriDay ? {
    currentDate: {
      hijri: {
        day: hijriDay,
        month: { number: hijriMonthNumber, en: hijriMonthEn, ar: hijriMonthAr },
        year: hijriYear,
        weekday: hijriWeekday,
        holidays: hijriHolidays,
      },
    },
    isRamadan,
    ramadanDay,
    daysUntilRamadan,
    isEidAlFitr,
    isEidAlAdha,
    hijriMonth: hijriMonthNumber,
    hijriDay: hijriDayNumber,
    hijriYear: parseInt(hijriYear) || 0,
  } : null;

  return useMemo(() => ({
    islamicInfo,
    isLoading,
    error,
    isRamadan,
    ramadanDay,
    daysUntilRamadan,
    isEidAlFitr,
    isEidAlAdha,
    hijriDate,
    refresh: computeIslamicDate,
  }), [islamicInfo, isLoading, error, isRamadan, ramadanDay, daysUntilRamadan, isEidAlFitr, isEidAlAdha, hijriDate, computeIslamicDate]);
}
