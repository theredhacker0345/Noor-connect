/**
 * Global Time Formatter Utility
 * Handles consistent time formatting across the app based on user preferences
 */
import i18n from '@/lib/i18n-new';

export interface TimeFormatOptions {
  format?: '12' | '24';
  showSeconds?: boolean;
  showAMPM?: boolean;
  timeZone?: string;
}

function getLocale(): string {
  return i18n.language || 'en';
}

/**
 * Format time string or Date object based on user preference
 * @param time - Time string (HH:MM) or Date object
 * @param format - Time format preference ('12' or '24')
 * @param options - Additional formatting options
 * @returns Formatted time string
 */
export function formatTime(
  time: string | Date,
  format: '12' | '24' = getTimeFormat(),
  options: TimeFormatOptions = {}
): string {
  const { showSeconds = false, showAMPM = true, timeZone } = options;

  let date: Date;

  if (typeof time === 'string') {
    // Strip timezone abbreviation like "(PKT)" from Aladhan API strings
    const cleaned = time.replace(/\s*\(.*?\)\s*/g, '').trim();
    // Parse time string (HH:MM or HH:MM:SS)
    const [hours, minutes, seconds] = cleaned.split(':').map(Number);
    date = new Date();
    if (isNaN(hours) || isNaN(minutes)) {
      console.warn('formatTime: failed to parse time string:', time);
      date = new Date(); // fallback
    } else {
      date.setHours(hours, minutes, seconds || 0, 0);
    }
  } else {
    date = time;
  }

  if (format === '12') {
    // 12-hour format
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: showAMPM,
      timeZone: timeZone || undefined
    };

    if (showSeconds) {
      timeOptions.second = '2-digit';
    }

    return date.toLocaleTimeString(getLocale(), timeOptions);
  } else {
    // 24-hour format
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timeZone || undefined
    };

    if (showSeconds) {
      timeOptions.second = '2-digit';
    }

    return date.toLocaleTimeString(getLocale(), timeOptions);
  }
}

/**
 * Format time for prayer cards (shorter version)
 * @param time - Time string (HH:MM) or Date object
 * @param format - Time format preference ('12' or '24')
 * @returns Formatted time string
 */
export function formatPrayerTime(time: string | Date, format: '12' | '24' = getTimeFormat(), timeZone?: string): string {
  return formatTime(time, format, { showSeconds: false, showAMPM: true, timeZone });
}

/**
 * Format time for countdown display
 * @param time - Time string (HH:MM) or Date object
 * @param format - Time format preference ('12' or '24')
 * @returns Formatted time string
 */
export function formatCountdownTime(time: string | Date, format: '12' | '24' = getTimeFormat()): string {
  return formatTime(time, format, { showSeconds: false, showAMPM: true });
}

/**
 * Get current time format from localStorage
 * @returns Current time format preference
 */
export function getTimeFormat(): '12' | '24' {
  return (localStorage.getItem('time-format') as '12' | '24') || '24';
}

/**
 * Set time format preference
 * @param format - Time format preference ('12' or '24')
 */
export function setTimeFormat(format: '12' | '24'): void {
  localStorage.setItem('time-format', format);
  // Notify listening components (Dashboard, PremiumDashboard, PrayerCards, ...)
  // so the whole app re-renders immediately with the new format.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('time-format-changed', { detail: { format } }));
  }
}

/**
 * Pre-convert prayer times object to selected format to avoid on-the-fly calculations
 * @param prayerTimes - Object with prayer time strings
 * @param format - Time format preference ('12' or '24')
 * @returns Object with formatted prayer times
 */
export function preConvertPrayerTimes(prayerTimes: Record<string, string>, format: '12' | '24' = getTimeFormat()): Record<string, string> {
  const converted: Record<string, string> = {};

  for (const [prayer, time] of Object.entries(prayerTimes)) {
    converted[prayer] = formatPrayerTime(time, format);
  }

  return converted;
}

/**
 * Batch format multiple prayer times efficiently
 * @param times - Array of time strings or Date objects
 * @param format - Time format preference ('12' or '24')
 * @returns Array of formatted time strings
 */
export function batchFormatTimes(times: (string | Date)[], format: '12' | '24' = getTimeFormat()): string[] {
  return times.map(time => formatPrayerTime(time, format));
}
