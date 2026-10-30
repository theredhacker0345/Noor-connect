/**
 * Islamic Calendar Service
 * Provides centralized Islamic date calculations using Aladhan API
 * Ensures consistent and accurate Islamic dates across the app
 */

import { gToHApiResponseSchema, safeParseApiResponse } from '@/lib/api-schemas';

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
   * Get Islamic date for a specific Gregorian date
   */
  async getIslamicDate(date: Date = new Date()): Promise<IslamicDate> {
    const cacheKey = date.toDateString();
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
      
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
      
      // Fallback to calculation if API fails
      return this.calculateIslamicDate(date);
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

    // Tabular Islamic calendar
    // Epoch: Friday, July 16, 622 CE (Julian) = JDN 1948439.5
    // Verified against api.aladhan.com gToH: matches most dates exactly and
    // drifts ±1 day in some periods — inherent to tabular calendars vs
    // moon-sighting. Do not "fix" by switching to the civil-epoch variant
    // (1948443.5): tested 0/18 matches. Only used when the gToH API is unreachable.
    const hijriEpoch = 1948439.5;
    const julianDay = this.getJulianDay(date);
    const daysSinceEpoch = Math.floor(julianDay - hijriEpoch);

    // Each 30-year cycle contains 10631 days (19 common years × 354 + 11 leap years × 355)
    const cycleLength = 10631;
    const yearLength = (y: number) => this.isHijriLeapYear(y) ? 355 : 354;

    // Find the Hijri year by walking forward from epoch
    let year = 1;
    let accumulatedDays = 0;
    while (accumulatedDays + yearLength(year) <= daysSinceEpoch) {
      accumulatedDays += yearLength(year);
      year++;
    }

    const dayOfYear = daysSinceEpoch - accumulatedDays;

    // Find the month within the year
    let month = 1;
    let monthStart = 1;
    for (let m = 1; m <= 12; m++) {
      const ml = this.getTabularMonthLength(m, year);
      if (dayOfYear < monthStart + ml - 1) {
        month = m;
        break;
      }
      monthStart += ml;
    }

    const hijriDay = dayOfYear - monthStart + 2;
    const hijriMonth = month;
    const hijriYear = year;

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
   * Tabular Islamic calendar helpers
   */
  private isHijriLeapYear(year: number): boolean {
    // In the 30-year cycle, years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 are leap
    const cyclePosition = year % 30;
    return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(cyclePosition);
  }

  private getTabularMonthLength(month: number, year: number): number {
    if (month % 2 === 1) return 30; // Odd months: 30 days
    if (month === 12) return this.isHijriLeapYear(year) ? 30 : 29;
    return 29; // Even months (except Dhul-Hijjah): 29 days
  }

  /**
   * Convert Gregorian date to Julian Day Number
   */
  private getJulianDay(date: Date): number {
    const a = Math.floor((14 - (date.getMonth() + 1)) / 12);
    const y = date.getFullYear() + 4800 - a;
    const m = (date.getMonth() + 1) + 12 * a - 3;

    return date.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + 
           Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const islamicCalendarService = IslamicCalendarService.getInstance();
