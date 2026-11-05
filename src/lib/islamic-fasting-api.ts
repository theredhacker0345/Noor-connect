/**
 * Islamic Ramadan API Service
 * Fetches Ramadan 2026 fasting times, dua, and hadith from Islamic API with caching and fallback logic
 */

import { METAL_PRICE_CONSTANTS } from './constants';

// Warn once per session about the unconfigured Islamic API (see getRamadanData).
let islamicApiFallbackWarned = false;

export interface RamadanFastingTime {
  date: string;
  day: string;
  hijri: string;
  hijri_readable: string;
  time: {
    sahur: string;
    iftar: string;
    duration: string;
  };
}

export interface WhiteDays {
  status: 'will_observe' | 'observed' | 'next_month';
  days: {
    "13th": string;
    "14th": string;
    "15th": string;
  };
}

export interface RamadanResource {
  dua: {
    title: string;
    arabic: string;
    translation: string;
    transliteration: string;
    reference: string;
  };
  hadith: {
    arabic: string;
    english: string;
    source: string;
    grade: string;
  };
}

export interface RamadanResponse {
  code: number;
  status: 'success' | 'error';
  range: 'ramadan';
  ramadan_year: number;
  data: {
    fasting: RamadanFastingTime[];
    white_days: WhiteDays;
  };
  resource?: RamadanResource; // Daily dua and hadith (may vary by day)
  message?: string; // For error responses
}

interface CachedRamadanData {
  data: RamadanResponse;
  timestamp: number;
  latitude: number;
  longitude: number;
  method: number;
}

export class IslamicRamadanAPI {
  private static readonly CACHE_KEY = 'islamic-ramadan-cache';
  private static readonly CACHE_TTL_MINUTES = 60; // Longer cache for Ramadan data
  private static cachedRamadanData: RamadanResponse | null = null;

  /**
   * Get Ramadan 2026 data from Islamic API
   */
  static async getRamadanData(
    latitude: number,
    longitude: number,
    method: number = 3, // Muslim World League default
    options: {
      calendar?: 'HJCoSA' | 'UAQ' | 'DIYANET' | 'MATHEMATICAL';
      school?: 1 | 2; // 1: Standard, 2: Hanafi
      format?: 12 | 24; // 12-hour or 24-hour format
      shifting?: -2 | -1 | 0 | 1 | 2; // Hijri date adjustment
    } = {}
  ): Promise<RamadanResponse> {
    try {
      // Check cache first
      const cached = this.getCachedData(latitude, longitude, method);
      if (cached) {
        return cached;
      }

      // Fetch from Islamic Ramadan API
      const apiData = await this.fetchFromRamadanAPI(latitude, longitude, method, options);
      this.saveToCache(apiData, latitude, longitude, method);
      this.cachedRamadanData = apiData;
      return apiData;
    } catch (error) {
      // The API key is a build-time constant — when absent this fails on
      // every mount of the Ramadan page. Warn once per session, not per call.
      if (!islamicApiFallbackWarned) {
        islamicApiFallbackWarned = true;
        console.warn('Failed to fetch Ramadan data from Islamic API, using fallback:', error);
      }
      return this.getFallbackRamadanData(latitude, longitude, method);
    }
  }

  /**
   * Get today's Ramadan fasting times
   */
  static async getTodaysRamadanTimes(
    latitude: number,
    longitude: number,
    method: number = 3,
    options: {
      calendar?: 'HJCoSA' | 'UAQ' | 'DIYANET' | 'MATHEMATICAL';
      school?: 1 | 2;
      format?: 12 | 24;
      shifting?: -2 | -1 | 0 | 1 | 2;
    } = {}
  ): Promise<{ fastingTime: RamadanFastingTime | null; fullData: RamadanResponse }> {
    const ramadanData = await this.getRamadanData(latitude, longitude, method, options);
    
    const today = new Date().toISOString().split('T')[0];
    const todayFasting = ramadanData.data.fasting.find(day => day.date === today);
    
    return {
      fastingTime: todayFasting || null,
      fullData: ramadanData
    };
  }

  /**
   * Get specific day's Ramadan data
   */
  static async getSpecificDayRamadanTimes(
    dayNumber: number, // 1-30 for Ramadan day
    latitude: number,
    longitude: number,
    method: number = 3,
    options: {
      calendar?: 'HJCoSA' | 'UAQ' | 'DIYANET' | 'MATHEMATICAL';
      school?: 1 | 2;
      format?: 12 | 24;
      shifting?: -2 | -1 | 0 | 1 | 2;
    } = {}
  ): Promise<RamadanFastingTime | null> {
    const ramadanData = await this.getRamadanData(latitude, longitude, method, options);
    
    if (dayNumber < 1 || dayNumber > 30) return null;
    
    return ramadanData.data.fasting[dayNumber - 1] || null;
  }

  /**
   * Fetch Ramadan data from Islamic API
   */
  private static async fetchFromRamadanAPI(
    latitude: number,
    longitude: number,
    method: number,
    options: {
      calendar?: 'HJCoSA' | 'UAQ' | 'DIYANET' | 'MATHEMATICAL';
      school?: 1 | 2;
      format?: 12 | 24;
      shifting?: -2 | -1 | 0 | 1 | 2;
    }
  ): Promise<RamadanResponse> {
    const apiKey: string = METAL_PRICE_CONSTANTS.ISLAMIC_API_KEY;
    
    // Skip API call if no API key is configured
    if (!apiKey) {
      throw new Error('Islamic API key not configured');
    }

    const url = new URL(METAL_PRICE_CONSTANTS.RAMADAN_API);
    url.searchParams.append('lat', latitude.toString());
    url.searchParams.append('lon', longitude.toString());
    url.searchParams.append('method', method.toString());
    
    if (options.calendar) url.searchParams.append('calender', options.calendar);
    if (options.school) url.searchParams.append('school', options.school.toString());
    if (options.format) url.searchParams.append('format', options.format.toString());
    if (options.shifting) url.searchParams.append('shifting', options.shifting.toString());
    url.searchParams.append('api_key', apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data: RamadanResponse = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'Unknown API error');
    }

    if (data.code !== 200) {
      throw new Error(`API returned code ${data.code}`);
    }

    return data;
  }

  /**
   * Get fallback Ramadan data when API fails
   */
  private static async getFallbackRamadanData(
    latitude: number,
    longitude: number,
    method: number
  ): Promise<RamadanResponse> {
    // Use Aladhan API as fallback for prayer times
    const { AladhanAPI } = await import('./aladhan-api');
    
    try {
      // Get current month data (assuming it's Ramadan for fallback)
      const now = new Date();
      const monthlyData = await AladhanAPI.fetchMonthlyCalendar(
        latitude,
        longitude,
        now.getFullYear(),
        now.getMonth() + 1,
        method
      );

      const fastingTimes = monthlyData.data.map((day) => ({
        date: day.date.gregorian.date,
        day: day.date.gregorian.weekday.en,
        hijri: day.date.hijri.date,
        hijri_readable: `${day.date.hijri.day} ${day.date.hijri.month.en} ${day.date.hijri.year}`,
        time: {
          sahur: this.formatTime(day.timings.Imsak || day.timings.Fajr),
          iftar: this.formatTime(day.timings.Maghrib),
          duration: this.calculateDuration(day.timings.Imsak || day.timings.Fajr, day.timings.Maghrib)
        }
      }));

      return {
        code: 200,
        status: 'success',
        range: 'ramadan',
        ramadan_year: parseInt(monthlyData.data[0]?.date.hijri.year || (new Date().getFullYear() - 579).toString()),
        data: {
          fasting: fastingTimes,
          white_days: {
            status: 'next_month',
            days: {
              "13th": "",
              "14th": "",
              "15th": ""
            }
          }
        }
      };
    } catch (error) {
      console.error('Fallback prayer times also failed:', error);
      
      // Ultimate fallback - calculated times
      const { calculatePrayerTimes } = await import('./prayer-calculator');
      const times = calculatePrayerTimes(latitude, longitude, new Date());
      const today = new Date();

      // Generate 30 days of fallback data
      const fastingTimes = Array.from({ length: 30 }, (_, i) => {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i - 15); // Center around today
        
        return {
          date: currentDate.toISOString().split('T')[0],
          day: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          hijri: `${i + 1}-09-${new Date().getFullYear() - 579}`,
          hijri_readable: `${i + 1} Ramadan ${new Date().getFullYear() - 579} AH`,
          time: {
            sahur: times.fajr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            iftar: times.maghrib.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            duration: this.calculateDurationFromDates(times.fajr, times.maghrib)
          }
        };
      });

      return {
        code: 200,
        status: 'success',
        range: 'ramadan',
        ramadan_year: new Date().getFullYear() - 579,
        data: {
          fasting: fastingTimes,
          white_days: {
            status: 'next_month',
            days: {
              "13th": "",
              "14th": "",
              "15th": ""
            }
          }
        }
      };
    }
  }

  /**
   * Format time from 24-hour to 12-hour format
   */
  private static formatTime(timeStr: string): string {
    const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
    const [hours, minutes] = cleaned.split(':').map(Number);
    const date = new Date();
    if (isNaN(hours) || isNaN(minutes)) return '--:--';
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Calculate fasting duration between two time strings
   */
  private static calculateDuration(suhoorStr: string, iftarStr: string): string {
    try {
      const suhoor = this.parseTimeToDate(suhoorStr);
      const iftar = this.parseTimeToDate(iftarStr);
      
      // Handle next day case
      if (iftar <= suhoor) {
        iftar.setDate(iftar.getDate() + 1);
      }
      
      const diff = iftar.getTime() - suhoor.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours} hours ${minutes} minutes`;
    } catch {
      return "Calculating...";
    }
  }

  /**
   * Calculate fasting duration between two Date objects
   */
  private static calculateDurationFromDates(suhoor: Date, iftar: Date): string {
    try {
      let diff = iftar.getTime() - suhoor.getTime();
      
      // Handle next day case
      if (diff < 0) {
        diff = (24 * 60 * 60 * 1000) + diff; // Add 24 hours
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours} hours ${minutes} minutes`;
    } catch {
      return "Calculating...";
    }
  }

  /**
   * Parse time string to Date object for today
   */
  private static parseTimeToDate(timeStr: string): Date {
    const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
    const parts = cleaned.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const date = new Date();
    if (isNaN(hours) || isNaN(minutes)) {
      return date;
    }
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Get cached Ramadan data if still valid
   */
  static getCachedData(
    latitude: number,
    longitude: number,
    method: number
  ): RamadanResponse | null {
    try {
      const cached = sessionStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const cachedData: CachedRamadanData = JSON.parse(cached);
      const now = Date.now();
      const cacheAge = now - cachedData.timestamp;
      const maxAge = this.CACHE_TTL_MINUTES * 60 * 1000;

      // Check if cache is expired
      if (cacheAge > maxAge) {
        sessionStorage.removeItem(this.CACHE_KEY);
        return null;
      }

      // Check if location matches (with tolerance)
      const latDiff = Math.abs(cachedData.latitude - latitude);
      const lngDiff = Math.abs(cachedData.longitude - longitude);
      if (latDiff > 0.1 || lngDiff > 0.1) {
        return null; // Different location
      }

      // Check if method matches
      if (cachedData.method !== method) {
        return null;
      }

      return cachedData.data;
    } catch (error) {
      console.error('Error reading cached Ramadan data:', error);
      sessionStorage.removeItem(this.CACHE_KEY);
      return null;
    }
  }

  /**
   * Save Ramadan data to cache
   */
  private static saveToCache(
    data: RamadanResponse,
    latitude: number,
    longitude: number,
    method: number
  ): void {
    try {
      const cachedData: CachedRamadanData = {
        data,
        timestamp: Date.now(),
        latitude,
        longitude,
        method
      };

      sessionStorage.setItem(this.CACHE_KEY, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Error saving Ramadan data to cache:', error);
    }
  }

  /**
   * Clear cached Ramadan data
   */
  static clearCache(): void {
    sessionStorage.removeItem(this.CACHE_KEY);
    this.cachedRamadanData = null;
  }

  /**
   * Get cached Ramadan data (for quick access)
   */
  static getCachedRamadanData(): RamadanResponse | null {
    return this.cachedRamadanData;
  }

  /**
   * Get method name from method number
   */
  static getMethodName(method: number): string {
    const methods: Record<number, string> = {
      1: 'University of Islamic Sciences, Karachi',
      2: 'Islamic Society of North America',
      3: 'Muslim World League',
      4: 'Umm Al-Qura University, Makkah',
      5: 'Egyptian General Authority of Survey',
      7: 'Institute of Geophysics, Tehran',
      8: 'Gulf Region',
      9: 'Kuwait',
      10: 'Qatar',
      11: 'MUIS, Singapore',
      12: 'UOIF, France',
      13: 'Diyanet, Turkey',
      14: 'Russia',
      15: 'Moonsighting Committee Worldwide',
      16: 'Dubai (experimental)',
      17: 'JAKIM, Malaysia',
      18: 'Tunisia',
      19: 'Algeria',
      20: 'KEMENAG, Indonesia',
      21: 'Morocco',
      22: 'Lisbon, Portugal',
      23: 'Jordan',
      0: 'Jafari / Shia Ithna-Ashari'
    };
    return methods[method] || `Method ${method}`;
  }
}
