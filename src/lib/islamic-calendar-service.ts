/**
 * Islamic Calendar Service
 * Provides centralized Islamic date calculations using Aladhan API
 * Ensures consistent and accurate Islamic dates across the app
 */

import { gToHApiResponseSchema, safeParseApiResponse } from '@/lib/api-schemas';
import { hijriAdjustedDate, toHijri } from '@/lib/hijri-tabular';

export interface IslamicDate {
  hijri: {
    date: string;
    format: string;
    day: string;
    weekday: {
      en: string;
      ar: string;
    };
    month: {
      number: number;
      en: string;
      ar: string;
    };
    year: string;
    designation: {
      abbreviated: string;
      expanded: string;
    };
    holidays: string[];
  };
  gregorian: {
    date: string;
    format: string;
    day: string;
    weekday: {
      en: string;
    };
    month: {
      number: number;
      en: string;
    };
    year: string;
    designation: {
      abbreviated: string;
      expanded: string;
    };
  };
}

export interface IslamicCalendarInfo {
  currentDate: IslamicDate;
  isRamadan: boolean;
  ramadanDay: number;
  daysUntilRamadan: number;
  isEidAlFitr: boolean;
  isEidAlAdha: boolean;
  hijriMonth: number;
  hijriDay: number;
  hijriYear: number;
}

class IslamicCalendarService {
  private static instance: IslamicCalendarService;
  private cache: Map<string, { data: IslamicDate; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 3600000; // 1 hour cache

  static getInstance(): IslamicCalendarService {
    if (!IslamicCalendarService.instance) {
      IslamicCalendarService.instance = new IslamicCalendarService();
    }
    return IslamicCalendarService.instance;
  }

  /**
   * Get Islamic date for a specific Gregorian date.
   * Honours the user's moon-sighting adjustment (Settings → Prayer
   * Calculation, ±2 days) by shifting the Gregorian date before conversion —
   * this is the single shared path, so Eid detection via isEidDay() and the
   * offline fallback both respect the setting.
   */
  async getIslamicDate(date: Date = new Date()): Promise<IslamicDate> {
    const shifted = hijriAdjustedDate(date);
    const cacheKey = shifted.toDateString();
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const formattedDate = `${shifted.getDate()}-${shifted.getMonth() + 1}-${shifted.getFullYear()}`;

      const response = await fetch(`https://api.aladhan.com/v1/gToH/${formattedDate}`);
      const rawData = await response.json();

      const parseResult = safeParseApiResponse(gToHApiResponseSchema, rawData);

      if (parseResult.success && parseResult.data.code === 200) {
        const islamicDate = parseResult.data.data as IslamicDate;
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: islamicDate,
          timestamp: Date.now()
        });

        return islamicDate;
      } else {
        throw new Error("Invalid API response");
      }
    } catch (error) {
      console.error('Error fetching Islamic date:', error);

      // Fallback to calculation if API fails (same shifted date)
      return this.calculateIslamicDate(shifted);
    }
  }

  /**
   * Get comprehensive Islamic calendar information
   */
  async getIslamicCalendarInfo(date: Date = new Date()): Promise<IslamicCalendarInfo> {
    const islamicDate = await this.getIslamicDate(date);
    
    const hijriMonth = parseInt(islamicDate.hijri.month.number.toString());
    const hijriDay = parseInt(islamicDate.hijri.day);
    const hijriYear = parseInt(islamicDate.hijri.year);

    const isRamadan = hijriMonth === 9;
    const ramadanDay = isRamadan ? hijriDay : 0;
    const isEidAlFitr = hijriMonth === 10 && hijriDay === 1;
    const isEidAlAdha = hijriMonth === 12 && hijriDay === 10;

    // Calculate days until next Ramadan
    const daysUntilRamadan = await this.calculateDaysUntilRamadan(date);

    return {
      currentDate: islamicDate,
      isRamadan,
      ramadanDay,
      daysUntilRamadan,
      isEidAlFitr,
      isEidAlAdha,
      hijriMonth,
      hijriDay,
      hijriYear
    };
  }

  /**
   * Check if today is Ramadan
   */
  async isRamadan(date: Date = new Date()): Promise<boolean> {
    const info = await this.getIslamicCalendarInfo(date);
    return info.isRamadan;
  }

  /**
   * Get current Ramadan day (1-30)
   */
  async getRamadanDay(date: Date = new Date()): Promise<number> {
    const info = await this.getIslamicCalendarInfo(date);
    return info.ramadanDay;
  }

  async calculateDaysUntilRamadan(date: Date = new Date()): Promise<number> {
    try {
      const currentIslamicDate = await this.getIslamicDate(date);
      const currentHijriMonth = parseInt(currentIslamicDate.hijri.month.number.toString());
      const currentHijriDay = parseInt(currentIslamicDate.hijri.day);
      const currentHijriYear = parseInt(currentIslamicDate.hijri.year);

      return this.calculateDaysUntilRamadanFromHijri(currentHijriMonth, currentHijriDay, currentHijriYear);
    } catch (error) {
      console.error('Error calculating days until Ramadan:', error);
      return -1;
    }
  }

  calculateDaysUntilRamadanFromHijri(hijriMonth: number, hijriDay: number, hijriYear?: number): number {
    if (hijriMonth === 9) return 0;

    const getMonthLength = (month: number): number => {
      if (month === 12) return 29;
      if (month % 2 === 1) return 30;
      return 29;
    };

    let days = getMonthLength(hijriMonth) - hijriDay + 1;

    if (hijriMonth > 9) {
      for (let m = hijriMonth + 1; m <= 12; m++) {
        days += getMonthLength(m);
      }
      for (let m = 1; m < 9; m++) {
        days += getMonthLength(m);
      }
    } else {
      for (let m = hijriMonth + 1; m < 9; m++) {
        days += getMonthLength(m);
      }
    }

    return days;
  }

  /**
   * Fallback calculation for Islamic date using the tabular Islamic calendar
   * (30-year cycle with 11 leap years). Accurate to within 1-2 days of the
   * moon-sighting calendar — suitable as an offline fallback.
   */
  calculateIslamicDate(date: Date): IslamicDate {
    const hijriMonths = [
      { en: 'Muharram', ar: 'محرم' },
      { en: 'Safar', ar: 'صفر' },
      { en: 'Rabi al-Awwal', ar: 'ربيع الأول' },
      { en: 'Rabi al-Thani', ar: 'ربيع الثاني' },
      { en: 'Jumada al-Awwal', ar: 'جمادى الأولى' },
      { en: 'Jumada al-Thani', ar: 'جمادى الثانية' },
      { en: 'Rajab', ar: 'رجب' },
      { en: 'Shaban', ar: 'شعبان' },
      { en: 'Ramadan', ar: 'رمضان' },
      { en: 'Shawwal', ar: 'شوال' },
      { en: 'Dhul-Qadah', ar: 'ذو القعدة' },
      { en: 'Dhul-Hijjah', ar: 'ذو الحجة' }
    ];

    const hijriWeekdays = [
      { en: 'Al-Ahad', ar: 'الأحد' },
      { en: 'Al-Ithnayn', ar: 'الإثنين' },
      { en: 'Al-Thulatha', ar: 'الثلاثاء' },
      { en: 'Al-Arbaa', ar: 'الأربعاء' },
      { en: 'Al-Khamis', ar: 'الخميس' },
      { en: 'Al-Jumuah', ar: 'الجمعة' },
      { en: 'As-Sabt', ar: 'السبت' }
    ];

    // Tabular Islamic calendar — the shared pure math lives in
    // hijri-tabular.ts (also used by the service worker, so the app and the
    // worker can never disagree). Verified against api.aladhan.com gToH:
    // matches most dates exactly and drifts ±1 day in some periods —
    // inherent to tabular calendars vs moon-sighting. Only used when the
    // gToH API is unreachable.
    const tabular = toHijri(date);
    const hijriDay = tabular.day;
    const hijriMonth = tabular.month;
    const hijriYear = tabular.year;

    return {
      hijri: {
        date: `${hijriDay}-${hijriMonth}-${hijriYear}`,
        format: `DD-MM-YYYY`,
        day: hijriDay.toString(),
        weekday: hijriWeekdays[date.getDay()],
        month: {
          number: hijriMonth,
          en: hijriMonths[hijriMonth - 1].en,
          ar: hijriMonths[hijriMonth - 1].ar
        },
        year: hijriYear.toString(),
        designation: {
          abbreviated: 'AH',
          expanded: 'After Hijra'
        },
        holidays: []
      },
      gregorian: {
        date: `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`,
        format: 'DD-MM-YYYY',
        day: date.getDate().toString(),
        weekday: {
          en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()]
        },
        month: {
          number: date.getMonth() + 1,
          en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][date.getMonth()]
        },
        year: date.getFullYear().toString(),
        designation: {
          abbreviated: 'CE',
          expanded: 'Common Era'
        }
      }
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const islamicCalendarService = IslamicCalendarService.getInstance();
