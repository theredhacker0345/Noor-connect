/**
 * Salah (Prayer) Tracker with Streaks
 * All data stored locally
 */

import { calculatePrayerTimes, getCalculationMethod } from "./prayer-calculator";
import { AladhanAPI, ALADHAN_METHODS } from "./aladhan-api";
import { getEffectiveCalculationMethod } from "./prayer-method-resolver";
import { getFallbackLocationByTimezone } from "./location-config";
import { getHaidhData, detectIstihadhah, type CycleEntry, type HaidhTrackerData } from "./haidh-tracker";

const STORAGE_KEY = 'salah-tracker';
const STREAK_KEY = 'salah-streak';

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface DailyPrayers {
  date: string; // YYYY-MM-DD
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

export interface SalahStats {
  currentStreak: number;
  longestStreak: number;
  totalPrayers: number;
  todayCompleted: number;
}

const getTodayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getYesterdayKey = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
};

// Get all tracked days
const getAllDays = (): Record<string, DailyPrayers> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

// Save all days
const saveAllDays = (days: Record<string, DailyPrayers>): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
  // Dispatch custom event for real-time UI updates
  window.dispatchEvent(new CustomEvent('salah-updated'));
};

// Get today's prayers
export const getTodayPrayers = (): DailyPrayers => {
  const days = getAllDays();
  const today = getTodayKey();

  if (!days[today]) {
    days[today] = {
      date: today,
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
    };
    saveAllDays(days);
  }

  return days[today];
};

// Resolve prayer times helper for validation
export const resolvePrayerTimes = (): Record<string, { start: Date; end: Date }> | null => {
  try {
    let lat = 21.3891;
    let lon = 39.8579;
    
    const locStr = localStorage.getItem('location-storage');
    if (locStr) {
      try {
        const loc = JSON.parse(locStr);
        if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
          lat = loc.latitude;
          lon = loc.longitude;
        }
      } catch (e) {
        console.error('Error parsing stored location in salah-tracker:', e);
      }
    } else {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const defaultLoc = getFallbackLocationByTimezone(timeZone);
      lat = defaultLoc.lat;
      lon = defaultLoc.lon;
    }

    const now = new Date();
    const cachedDay = AladhanAPI.getPrayerTimesForDate(now, lat, lon);
    
    const parseTime = (timeStr: string, baseDate: Date) => {
      const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
      const parts = cleaned.split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = new Date(baseDate);
      d.setHours(h, m, 0, 0);
      return d;
    };

    let fajrStart: Date, sunriseStart: Date, dhuhrStart: Date, asrStart: Date, maghribStart: Date, ishaStart: Date;

    if (cachedDay) {
      fajrStart = parseTime(cachedDay.timings.Fajr, now);
      sunriseStart = parseTime(cachedDay.timings.Sunrise, now);
      dhuhrStart = parseTime(cachedDay.timings.Dhuhr, now);
      asrStart = parseTime(cachedDay.timings.Asr, now);
      maghribStart = parseTime(cachedDay.timings.Maghrib, now);
      ishaStart = parseTime(cachedDay.timings.Isha, now);
    } else {
      const offlineResult = calculatePrayerTimes(lat, lon, now, getEffectiveCalculationMethod(lat, lon));
      fajrStart = offlineResult.fajr;
      sunriseStart = offlineResult.sunrise;
      dhuhrStart = offlineResult.dhuhr;
      asrStart = offlineResult.asr;
      maghribStart = offlineResult.maghrib;
      ishaStart = offlineResult.isha;
    }

    // Tomorrow's Fajr for Isha end time
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    let tomorrowFajr: Date;
    const cachedTomorrow = AladhanAPI.getPrayerTimesForDate(tomorrow, lat, lon);
    if (cachedTomorrow) {
      tomorrowFajr = parseTime(cachedTomorrow.timings.Fajr, tomorrow);
    } else {
      const tomorrowOffline = calculatePrayerTimes(lat, lon, tomorrow, getEffectiveCalculationMethod(lat, lon));
      tomorrowFajr = tomorrowOffline.fajr;
    }

    return {
      fajr: { start: fajrStart, end: sunriseStart },
      dhuhr: { start: dhuhrStart, end: asrStart },
      asr: { start: asrStart, end: maghribStart },
      maghrib: { start: maghribStart, end: ishaStart },
      isha: { start: ishaStart, end: tomorrowFajr },
    };
  } catch (e) {
    console.error("Failed to resolve prayer times in salah-tracker:", e);
    return null;
  }
};

// Toggle prayer status (only if prayer time has arrived)
export const togglePrayer = (prayer: PrayerName, prayerTimes?: Record<string, { start: Date; end: Date }>): { success: boolean; message: string; completed: boolean } => {
  const days = getAllDays();
  const today = getTodayKey();

  if (!days[today]) {
    days[today] = {
      date: today,
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
    };
  }

  // Check if prayer time has arrived
  const isCheckingIn = !days[today][prayer];
  if (isCheckingIn) {
    const resolvedTimes = prayerTimes || resolvePrayerTimes();
    if (resolvedTimes && resolvedTimes[prayer]) {
      const now = new Date();
      const prayerTime = resolvedTimes[prayer];

      if (now < prayerTime.start) {
        return {
          success: false,
          message: `Cannot check in before ${prayer} time. Prayer starts at ${prayerTime.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          completed: days[today][prayer]
        };
      }
    }
  }

  const newDays = { ...days };
  newDays[today] = { ...newDays[today], [prayer]: !newDays[today][prayer] };
  saveAllDays(newDays);
  updateStreak();

  return {
    success: true,
    message: newDays[today][prayer] ? `${prayer} marked as completed!` : `${prayer} unchecked`,
    completed: newDays[today][prayer]
  };
};

// Legacy toggle function for backward compatibility
export const togglePrayerLegacy = (prayer: PrayerName): boolean => {
  const result = togglePrayer(prayer);
  return result.completed;
};

// Check if a day is complete (all 5 prayers)
const isDayComplete = (prayers: DailyPrayers): boolean => {
  return prayers.fajr && prayers.dhuhr && prayers.asr && prayers.maghrib && prayers.isha;
};

// Update streak
const updateStreak = (): void => {
  const days = getAllDays();
  const streakData = getStreakData();
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  const todayComplete = days[today] && isDayComplete(days[today]);
  const yesterdayComplete = days[yesterday] && isDayComplete(days[yesterday]);

  if (todayComplete) {
    if (yesterdayComplete || streakData.currentStreak === 0) {
      // Continue or start streak
      if (!streakData.lastCompleteDay || streakData.lastCompleteDay < today) {
        streakData.currentStreak += 1;
        streakData.lastCompleteDay = today;
      }
    }

    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak;
    }
  }

  saveStreakData(streakData);
};

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompleteDay: string | null;
}

const getStreakData = (): StreakData => {
  try {
    const data = localStorage.getItem(STREAK_KEY);
    return data ? JSON.parse(data) : { currentStreak: 0, longestStreak: 0, lastCompleteDay: null };
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastCompleteDay: null };
  }
};

const saveStreakData = (data: StreakData): void => {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
};

/**
 * Check if a given date falls within a ḥaidh/nifās cycle (not istiḥāḍah).
 * During such days the user is exempt from ṣalāh — their streak must NOT reset.
 */
const isDateSalahExempt = (dateStr: string): boolean => {
  try {
    const data: HaidhTrackerData = getHaidhData();
    if (!data.cycles.length) return false;

    const today = getTodayKey();

    for (const cycle of data.cycles) {
      const start = cycle.startDate;
      const end = cycle.endDate ?? today; // active cycle ends "today" for range checks

      if (dateStr >= start && dateStr <= end) {
        // Istiḥāḍah is NOT exempt — user must still pray
        if (detectIstihadhah(cycle, data.madhab)) return false;
        // Ḥaidh and Nifās are exempt from ṣalāh
        if (cycle.bleedingType === 'haidh' || cycle.bleedingType === 'nifas') return true;
      }
    }

    return false;
  } catch {
    // If haidh tracker is unavailable, don't block streak reset
    return false;
  }
};

// Check and reset streak if day missed
export const checkStreakReset = (): void => {
  const streakData = getStreakData();
  const yesterday = getYesterdayKey();
  const days = getAllDays();

  if (streakData.lastCompleteDay && streakData.lastCompleteDay < yesterday) {
    // If yesterday was a ḥaidh/nifās exempt day, preserve the streak
    if (isDateSalahExempt(yesterday)) return;

    const yesterdayComplete = days[yesterday] && isDayComplete(days[yesterday]);
    if (!yesterdayComplete) {
      streakData.currentStreak = 0;
      saveStreakData(streakData);
    }
  }
};

// Get statistics
export const getSalahStats = (): SalahStats => {
  checkStreakReset();

  const days = getAllDays();
  const streakData = getStreakData();
  const todayPrayers = getTodayPrayers();

  let totalPrayers = 0;
  Object.values(days).forEach(day => {
    if (day.fajr) totalPrayers++;
    if (day.dhuhr) totalPrayers++;
    if (day.asr) totalPrayers++;
    if (day.maghrib) totalPrayers++;
    if (day.isha) totalPrayers++;
  });

  const todayCompleted = [
    todayPrayers.fajr,
    todayPrayers.dhuhr,
    todayPrayers.asr,
    todayPrayers.maghrib,
    todayPrayers.isha,
  ].filter(Boolean).length;

  return {
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    totalPrayers,
    todayCompleted,
  };
};

// Get prayer history for last N days
export const getPrayerHistory = (days: number = 7): DailyPrayers[] => {
  const allDays = getAllDays();
  const result: DailyPrayers[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    result.push(allDays[key] || {
      date: key,
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
    });
  }

  return result;
};
