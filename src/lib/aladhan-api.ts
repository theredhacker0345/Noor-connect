/**
 * Aladhan API Integration for Dynamic Prayer Times
 * Fetches monthly calendar data with localStorage persistence
 */
import { getMadhab } from './storage';
import { formatPrayerTime } from './time-formatter';
import { zonedWallTimeToDate, zonedNowHhmm } from './tz-time';

export interface AladhanPrayerTime {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak: string; // For Ramadan Suhoor
  // Do NOT default these to '00:00' anywhere: Aladhan's default (STANDARD) span
  // is Sunset↔Sunrise which is NOT the fiqh Islamic midnight, and a fake '00:00'
  // parses as a real (past) time downstream (see docs/research/prayer-end-times.md).
  Midnight?: string;
  Firstthird?: string;
  Lastthird?: string;
}

export interface AladhanDayData {
  date: {
    readable: string;
    timestamp: string;
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
  };
  timings: AladhanPrayerTime;
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: {
      id: number;
      name: string;
      params: {
        Fajr: number;
        Isha: number;
      };
    };
    latitudeAdjustmentMethod: string;
    midnightMode: string;
    school: string;
  };
}

export interface AladhanMonthlyData {
  month: number;
  year: number;
  latitude: number;
  longitude: number;
  method: number;
  school?: number; // 0 for Shafi, 1 for Hanafi
  data: AladhanDayData[];
  lastUpdated: string;
}

const STORAGE_KEY = 'aladhan-monthly-data';
const API_BASE = 'https://api.aladhan.com/v1';

// In-flight request deduplication
const fetchingMonths = new Set<string>();

export const ALADHAN_METHODS: Record<string, number> = {
  MuslimWorldLeague: 3,
  Egyptian: 5,
  Karachi: 1,
  UmmAlQura: 4,
  Dubai: 16,
  MoonsightingCommittee: 15,
  NorthAmerica: 2,
  Kuwait: 9,
  Qatar: 10,
  Singapore: 11,
  Turkey: 13,
  Tehran: 7
};

export class AladhanAPI {
  /**
   * Fetch monthly prayer calendar from Aladhan API
   */
  static async fetchMonthlyCalendar(
    latitude: number,
    longitude: number,
    year: number = new Date().getFullYear(),
    month: number = new Date().getMonth() + 1,
    method: number = 3, // Muslim World League default (callers should pass the effective method)
    school?: number // 0 for Shafi, 1 for Hanafi
  ): Promise<AladhanMonthlyData> {
    const fetchKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}|${year}-${month}|${method}|${school ?? ''}`;
    
    // Deduplicate in-flight requests for the same month/location/method/school
    if (fetchingMonths.has(fetchKey)) {
      // Wait for the in-flight request to complete
      while (fetchingMonths.has(fetchKey)) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      // Return cached data after the other request finishes
      const cached = this.getStoredMonthlyData();
      if (cached && cached.year === year && cached.month === month && cached.method === method && cached.school === school) {
        return cached;
      }
    }

    fetchingMonths.add(fetchKey);

    let url = `${API_BASE}/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=${method}`;
    if (school !== undefined) {
      url += `&school=${school}`;
    }

    const controller = new AbortController();

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`API Error: ${result.status}`);
      }

      if (!result.data || !Array.isArray(result.data)) {
        throw new Error('API response missing or invalid data array');
      }

      const monthlyData: AladhanMonthlyData = {
        month,
        year,
        latitude,
        longitude,
        method,
        school: school,
        data: result.data,
        lastUpdated: new Date().toISOString()
      };

      // Save to localStorage
      this.saveMonthlyData(monthlyData);

      return monthlyData;
    } catch (error) {
      console.error('Failed to fetch monthly calendar:', error);
      throw new Error(`Failed to fetch prayer times: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      fetchingMonths.delete(fetchKey);
    }
  }

  /**
   * Get prayer times for a specific date from cached data, validating method/school
   */
  static getPrayerTimesForDate(
    date: Date, 
    latitude?: number, 
    longitude?: number,
    method?: number,
    school?: number
  ): AladhanDayData | null {
    const monthlyData = this.getStoredMonthlyData();
    if (!monthlyData) return null;

    // Validate method and school if provided
    if (method !== undefined && monthlyData.method !== method) return null;
    if (school !== undefined && monthlyData.school !== undefined && monthlyData.school !== school) return null;

    // Verify it's the correct location if coordinates provided
    if (latitude !== undefined && longitude !== undefined) {
      const latDiff = Math.abs(monthlyData.latitude - latitude);
      const lngDiff = Math.abs(monthlyData.longitude - longitude);
      if (latDiff > 0.1 || lngDiff > 0.1) return null; // Cache for different location
    }

    const targetDate = new Date(date);
    const isSameMonth = targetDate.getFullYear() === monthlyData.year &&
      targetDate.getMonth() + 1 === monthlyData.month;

    if (!isSameMonth) return null;

    // Use timestamp for reliable comparison
    const targetTimestamp = Math.floor(targetDate.getTime() / 1000);
    const dayData = monthlyData.data.find(day => {
      const dayDate = new Date(parseInt(day.date.timestamp) * 1000);
      return dayDate.toDateString() === targetDate.toDateString();
    });

    return dayData || null;
  }

  /**
   * Get today's prayer times by city
   */
  static async getTodaysPrayerTimesByCity(
    city: string,
    country: string,
    method: number = 3, // Muslim World League default (callers should pass the effective method)
    school?: number // 0 for Shafi, 1 for Hanafi
  ): Promise<AladhanPrayerTime> {
    let url = `${API_BASE}/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
    if (school !== undefined) {
      url += `&school=${school}`;
    }

    try {
      const controller = new AbortController();
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`API Error: ${result.status}`);
      }

      return result.data.timings;
    } catch (error) {
      console.error('Failed to fetch prayer times by city:', error);
      throw error;
    }
  }

  /**
   * Get today's prayer times with fallback to offline calculation
   */
  static async getTodaysPrayerTimes(
    latitude: number,
    longitude: number,
    method: number = 3, // Muslim World League default (callers should pass the effective method)
    school?: number // 0 for Shafi, 1 for Hanafi
  ): Promise<{ timings: AladhanPrayerTime, timezone: string }> {
    // Check if cached data is valid for this location before making API calls
    const madhab = getMadhab();
    // Aladhan API: 0 = Shafi, 1 = Hanafi
    // Maliki and Hanbali follow Shafi calculation for Asr
    const schoolParam = madhab === 'hanafi' ? 1 : 0;
    const hasValidCache = this.isCachedDataValid(latitude, longitude, schoolParam, method);

    if (hasValidCache) {
      // Use cached data only, no API call needed
      const cachedDay = this.getPrayerTimesForDate(new Date(), latitude, longitude);
      if (cachedDay) {
        return {
          timings: cachedDay.timings,
          timezone: cachedDay.meta.timezone
        };
      }
    }

    // Need to fetch - no valid cache available
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

    if (isOnline) {
      try {
        // Fetch fresh data for the month to keep cache updated
        const monthlyData = await this.fetchMonthlyCalendar(latitude, longitude, undefined, undefined, method, schoolParam);
        const today = monthlyData.data.find(day => {
          const dayDate = new Date(parseInt(day.date.timestamp) * 1000);
          return dayDate.toDateString() === new Date().toDateString();
        }) || monthlyData.data[0];

        return {
          timings: today.timings,
          timezone: today.meta.timezone
        };
      } catch (error) {
        console.warn('API fetch failed while online, falling back to cache');
      }
    }

    // Fallback to cache (for offline or failed API fetch)
    const cachedDay = this.getPrayerTimesForDate(new Date(), latitude, longitude);
    if (cachedDay) {
      return {
        timings: cachedDay.timings,
        timezone: cachedDay.meta.timezone
      };
    }

    // Fallback to offline calculation
    try {
      const { calculatePrayerTimes } = await import('./prayer-calculator');
      const times = calculatePrayerTimes(latitude, longitude, new Date());
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      return {
        timings: {
          Fajr: times.fajr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Sunrise: times.sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Dhuhr: times.dhuhr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Asr: times.asr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Maghrib: times.maghrib.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Isha: times.isha.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Imsak: times.fajr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        },
        timezone: timezone
      };
    } catch (error) {
      console.error('Offline calculation failed:', error);
      throw new Error('Failed to get prayer times from API, cache, or offline calculation');
    }
  }

  /**
   * Check if cached data is still valid (same month, year, location, school & method)
   */
  static isCachedDataValid(latitude?: number, longitude?: number, school?: number, method?: number): boolean {
    const monthlyData = this.getStoredMonthlyData();
    if (!monthlyData) return false;

    const now = new Date();
    const isSameDate = monthlyData.year === now.getFullYear() &&
      monthlyData.month === now.getMonth() + 1;

    if (!isSameDate) return false;

    // If coordinates provided, check if they match (with tolerance)
    if (latitude !== undefined && longitude !== undefined) {
      const latDiff = Math.abs(monthlyData.latitude - latitude);
      const lngDiff = Math.abs(monthlyData.longitude - longitude);
      // 0.1 degree tolerance (approx 11km)
      if (latDiff >= 0.1 || lngDiff >= 0.1) return false;
    }

    // If school provided, check if it matches
    if (school !== undefined && monthlyData.school !== undefined && monthlyData.school !== school) {
      return false;
    }

    // If method provided, check if it matches — the monthly cache is a single
    // shared slot, so without this check a cache written by another code path
    // (e.g. notifications with a different method) would be served as-is.
    if (method !== undefined && monthlyData.method !== method) {
      return false;
    }

    return true;
  }

  /**
   * Get stored monthly data from localStorage
   */
  static getStoredMonthlyData(): AladhanMonthlyData | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Save monthly data to localStorage
   */
  static saveMonthlyData(data: AladhanMonthlyData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save monthly data:', error);
    }
  }

  /**
   * Clear cached data
   */
  static clearCachedData(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get Ramadan-specific times (Suhoor/Iftar) for today
   */
  static async getRamadanTimes(
    latitude: number,
    longitude: number,
    method: number = 3, // Muslim World League default (callers should pass the effective method)
    school?: number // 0 for Shafi, 1 for Hanafi
  ): Promise<{ suhoor: string; iftar: string } | null> {
    try {
      const { timings } = await this.getTodaysPrayerTimes(latitude, longitude, method);

      return {
        suhoor: timings.Imsak || timings.Fajr,
        iftar: timings.Maghrib
      };
    } catch {
      return null;
    }
  }

  /**
   * Get countdown to next prayer or Ramadan time
   */
  static async getNextEventCountdown(
    latitude: number,
    longitude: number,
    method: number = 3, // Muslim World League default (callers should pass the effective method)
    isRamadan: boolean = false
  ): Promise<{ name: string; time: string; countdown: string; targetDate?: Date } | null> {
    try {
      const { timings, timezone } = await this.getTodaysPrayerTimes(latitude, longitude, method);
      const now = new Date();

      // Convert prayer times to Date objects (wall clock in the location's timezone)
      const prayerTimes = [
        { name: 'Fajr', time: this.parseTime(timings.Fajr, timezone) },
        { name: 'Sunrise', time: this.parseTime(timings.Sunrise, timezone) },
        { name: 'Dhuhr', time: this.parseTime(timings.Dhuhr, timezone) },
        { name: 'Asr', time: this.parseTime(timings.Asr, timezone) },
        { name: 'Maghrib', time: this.parseTime(timings.Maghrib, timezone) },
        { name: 'Isha', time: this.parseTime(timings.Isha, timezone) }
      ];

      // Add Ramadan times if applicable
      if (isRamadan) {
        prayerTimes.unshift(
          { name: 'Suhoor Ends', time: this.parseTime(timings.Imsak || timings.Fajr, timezone) },
          { name: 'Iftar', time: this.parseTime(timings.Maghrib, timezone) }
        );
      }

      // Find next event
      for (const prayer of prayerTimes) {
        if (prayer.time > now) {
          const diff = prayer.time.getTime() - now.getTime();
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

          return {
            name: prayer.name,
            time: zonedNowHhmm(timezone, prayer.time),
            countdown: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
            targetDate: prayer.time // Return the Date object directly
          };
        }
      }

      // If all events passed, get tomorrow's first prayer
      const tomorrowBase = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const { timings: tomorrowTimings } = await this.getTodaysPrayerTimes(latitude, longitude, method);
      const firstPrayerTime = this.parseTime(tomorrowTimings.Fajr, timezone, tomorrowBase);

      const diff = firstPrayerTime.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      return {
        name: 'Fajr (Tomorrow)',
        time: zonedNowHhmm(timezone, firstPrayerTime),
        countdown: `${hours}h ${minutes}m`,
        targetDate: firstPrayerTime
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse time string (HH:MM or "HH:MM (TZ)") to a Date object — wall clock in
   * `timeZone` (location's zone from the API), device-local when absent.
   * `dayBase` picks the civil date in that timezone (defaults to now).
   */
  private static parseTime(timeStr: string, timeZone?: string, dayBase?: Date): Date {
    const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
    return zonedWallTimeToDate(cleaned, timeZone, dayBase ?? new Date());
  }
}
