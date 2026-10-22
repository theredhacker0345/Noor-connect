/**
 * Prayer End Time Calculator
 * Calculates when each prayer time ends based on the next prayer's start time
 */
import { formatTime as formatTimePreference } from './time-formatter';

export interface PrayerTime {
  name: string;
  time: string;
  datetime: Date;
}

export interface PrayerWithEndTime extends PrayerTime {
  endTime: Date;
  endTimeFormatted: string;
}

export interface PrayerSchedule {
  fajr: PrayerTime;
  sunrise: PrayerTime;
  dhuhr: PrayerTime;
  asr: PrayerTime;
  maghrib: PrayerTime;
  isha: PrayerTime;
}

/**
 * Calculate end times for all prayers
 */
export const calculatePrayerEndTimes = (
  todayPrayers: PrayerSchedule,
  tomorrowPrayers?: Partial<PrayerSchedule>
): PrayerWithEndTime[] => {
  const prayers: PrayerWithEndTime[] = [];

  // Fajr ends at sunrise
  prayers.push({
    ...todayPrayers.fajr,
    endTime: todayPrayers.sunrise.datetime,
    endTimeFormatted: formatTime(todayPrayers.sunrise.datetime)
  });

  // Dhuhr ends at Asr start
  prayers.push({
    ...todayPrayers.dhuhr,
    endTime: todayPrayers.asr.datetime,
    endTimeFormatted: formatTime(todayPrayers.asr.datetime)
  });

  // Asr ends at Maghrib start
  prayers.push({
    ...todayPrayers.asr,
    endTime: todayPrayers.maghrib.datetime,
    endTimeFormatted: formatTime(todayPrayers.maghrib.datetime)
  });

  // Maghrib ends at Isha start
  prayers.push({
    ...todayPrayers.maghrib,
    endTime: todayPrayers.isha.datetime,
    endTimeFormatted: formatTime(todayPrayers.isha.datetime)
  });

  // Isha ends at tomorrow's Fajr (Subh Sadiq). Without tomorrow data, estimate
  // it as today's Fajr advanced one calendar day (DST-safe; drift ≈ 1 min/day).
  // NOTE: the jumhur limit is Islamic midnight — callers with location data
  // should prefer calculateSunnahTimes().middleOfTheNight (see
  // docs/research/prayer-end-times.md for the fiqh table).
  const estimatedTomorrowFajr = new Date(todayPrayers.fajr.datetime);
  estimatedTomorrowFajr.setDate(estimatedTomorrowFajr.getDate() + 1);
  const ishaEndTime = tomorrowPrayers?.fajr?.datetime || estimatedTomorrowFajr;
  prayers.push({
    ...todayPrayers.isha,
    endTime: ishaEndTime,
    endTimeFormatted: formatTime(ishaEndTime)
  });

  return prayers;
};

/**
 * Get the current prayer and its end time
 */
export const getCurrentPrayer = (
  prayersWithEndTimes: PrayerWithEndTime[]
): PrayerWithEndTime | null => {
  const now = new Date();
  
  // Find prayers that have started but not ended (end is exclusive — at the
  // exact end instant the next window has already begun)
  for (const prayer of prayersWithEndTimes) {
    if (now >= prayer.datetime && now < prayer.endTime) {
      return prayer;
    }
  }
  
  return null;
};

/**
 * Get the next prayer
 */
export const getNextPrayer = (
  prayersWithEndTimes: PrayerWithEndTime[]
): PrayerWithEndTime | null => {
  const now = new Date();
  
  // Find the next prayer that hasn't started yet
  for (const prayer of prayersWithEndTimes) {
    if (now < prayer.datetime) {
      return prayer;
    }
  }
  
  return null;
};

/**
 * Check if a prayer has less than 10 minutes remaining
 */
export const isPrayerEndingSoon = (prayer: PrayerWithEndTime): boolean => {
  const now = new Date();
  const timeUntilEnd = prayer.endTime.getTime() - now.getTime();
  const minutesUntilEnd = timeUntilEnd / (1000 * 60);
  
  return minutesUntilEnd > 0 && minutesUntilEnd <= 10;
};

/**
 * Format time according to the user's 12/24-hour preference
 */
export const formatTime = (date: Date): string => {
  return formatTimePreference(date);
};

/**
 * Calculate Islamic Midnight (true fiqh midnight)
 * Midpoint between tonight's Maghrib and tomorrow's Fajr, rounded to the minute —
 * identical to adhan's SunnahTimes.middleOfTheNight and the jumhur limit of
 * Isha's valid time. NEVER use civil 00:00 (the old behaviour was a bug —
 * see docs/research/prayer-end-times.md, bug #1).
 */
export const calculateIslamicMidnight = (maghrib: Date, tomorrowFajr: Date): Date => {
  const ms = maghrib.getTime() + (tomorrowFajr.getTime() - maghrib.getTime()) / 2;
  return new Date(Math.round(ms / 60000) * 60000);
};

/**
 * Get prayer status
 */
export const getPrayerStatus = (prayer: PrayerWithEndTime): {
  status: 'past' | 'current' | 'upcoming';
  timeUntilStart?: number;
  timeUntilEnd?: number;
} => {
  const now = new Date();
  const timeUntilStart = prayer.datetime.getTime() - now.getTime();
  const timeUntilEnd = prayer.endTime.getTime() - now.getTime();
  
  if (now < prayer.datetime) {
    return {
      status: 'upcoming',
      timeUntilStart: Math.max(0, timeUntilStart)
    };
  } else if (now >= prayer.datetime && now < prayer.endTime) {
    return {
      status: 'current',
      timeUntilEnd: Math.max(0, timeUntilEnd)
    };
  } else {
    return {
      status: 'past'
    };
  }
};
