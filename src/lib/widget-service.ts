/**
 * widget-service.ts
 *
 * Thin compatibility shim that preserves the old `WidgetService.updateWidget`
 * API but routes everything through the new `WidgetBridge` plugin.
 *
 * Old code calls:
 *   WidgetService.updateWidget(lat, lon, locationName?, prayerTimes?)
 *   WidgetService.startAutoUpdate(lat, lon, locationName?)
 *
 * Under the hood this now:
 *   1. Builds a PrayerPayload from the prayer times
 *   2. Builds a DailyContentPayload from localStorage caches
 *   3. Pushes both to the native widgets via WidgetBridge
 */

import {
  syncPrayerData,
  syncDailyContent,
} from './widgetBridge';
import { calculatePrayerTimes, formatPrayerTime, getCalculationMethod } from './prayer-calculator';
import { getMadhab } from './storage';
import { isNativePlatform } from './capacitor-utils';
import i18n from './i18n-new';
import type {
  PrayerPayload,
  PrayerEntry,
  DailyContentPayload,
  AyahContent,
  HadithContent,
} from './widget-types';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function getHijriDateString(): string {
  try {
    const locale = i18n.language || 'en';
    const fmt = new Intl.DateTimeFormat(locale + '-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return fmt.format(new Date());
  } catch {
    return '';
  }
}

function getGregorianDateString(): string {
  try {
    const locale = i18n.language || 'en';
    return new Date().toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function getCurrentTimeString(): string {
  const locale = i18n.language || 'en';
  return new Date().toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getCurrentLocale(): string {
  const stored = i18n.language || localStorage.getItem('i18nextLng');
  if (stored) return stored.split('-')[0];
  return (typeof navigator !== 'undefined'
    ? (navigator.language || 'en')
    : 'en').split('-')[0];
}

/**
 * Build the prayer payload for the native widget.
 *
 * Times are passed through exactly as produced by the app's prayer-time
 * logic (adhan instants or API-parsed local Dates). These render correctly
 * in the device's local timezone, so NO manual DST adjustment is applied —
 * adding one here double-shifts times whenever the device timezone has DST.
 */
function buildPrayerPayload(
  prayerTimes: any,
  locationLabel: string,
): PrayerPayload | null {
  if (!prayerTimes) return null;
  const now = Date.now();

  // The native side (WidgetPayloads.kt / WidgetBridge.kt) hard-requires all 6
  // entries. Rather than filtering partial data (which the bridge would then
  // silently reject), refuse to build a payload when any time is missing.
  const required = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const hasAllTimes = required.every(k => prayerTimes[k] instanceof Date && !isNaN(prayerTimes[k].getTime()));
  if (!hasAllTimes) {
    console.warn('[WidgetService] buildPrayerPayload: missing prayer time(s), skipping widget sync');
    return null;
  }

  const entries: PrayerEntry[] = [
    { name: 'Fajr',    time: prayerTimes.fajr.getTime(),    formattedTime: formatPrayerTime(prayerTimes.fajr)    ?? '--:--' },
    { name: 'Sunrise', time: prayerTimes.sunrise.getTime(), formattedTime: formatPrayerTime(prayerTimes.sunrise) ?? '--:--' },
    { name: 'Dhuhr',   time: prayerTimes.dhuhr.getTime(),   formattedTime: formatPrayerTime(prayerTimes.dhuhr)   ?? '--:--' },
    { name: 'Asr',     time: prayerTimes.asr.getTime(),     formattedTime: formatPrayerTime(prayerTimes.asr)     ?? '--:--' },
    { name: 'Maghrib', time: prayerTimes.maghrib.getTime(), formattedTime: formatPrayerTime(prayerTimes.maghrib) ?? '--:--' },
    { name: 'Isha',    time: prayerTimes.isha.getTime(),    formattedTime: formatPrayerTime(prayerTimes.isha)    ?? '--:--' },
  ];

  // Find the next upcoming prayer. If all of today's prayers are in the past
  // (e.g. after Isha), wrap to the first prayer of tomorrow and roll its time
  // forward by 24h so the native widget's countdown shows a future target.
  let nextPrayerIndex = 0;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].time > now) {
      nextPrayerIndex = i;
      break;
    }
  }
  // Loop completed without finding a future prayer -> all passed for today.
  if (entries[nextPrayerIndex].time <= now) {
    nextPrayerIndex = 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    for (const entry of entries) {
      entry.time += oneDayMs;
    }
  }

  const madhab = (() => {
    try {
      const m = getMadhab?.();
      if (m === 'shafi') return 'SHAFI';
      if (m === 'hanafi') return 'HANAFI';
    } catch {
      // Error is non-critical, silently ignored
    }
    return 'HANAFI';
  })();

  let calculationMethod: string;
  try {
    calculationMethod = getCalculationMethod?.() ?? 'MuslimWorldLeague';
  } catch {
    calculationMethod = 'MuslimWorldLeague';
  }

  return {
    prayers: entries,
    nextPrayerIndex,
    hijriDate: getHijriDateString(),
    gregorianDate: getGregorianDateString(),
    locationLabel,
    madhab: madhab as 'HANAFI' | 'SHAFI',
    calculationMethod,
    currentTime24h: getCurrentTimeString(),
    lastUpdated: now,
  };
}

function getStoredQuranVerse(): AyahContent | null {
  try {
    const raw = localStorage.getItem('daily-ayah-cache');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const arabic = parsed.arabic || parsed.text_arabic || parsed.textArabic || '';
    const translation = parsed.translation || parsed.englishTranslation || '';
    const transliteration = parsed.translit || parsed.transliteration || '';
    const reference = parsed.reference || parsed.ref || '';
    const surahNumber = parsed.surahNumber || parsed.surah_number || 1;
    const ayahNumber = parsed.ayahNumber || parsed.ayah_number || 1;
    if (!arabic && !translation) return null;
    return { arabic, translation, transliteration, reference, surahNumber, ayahNumber, lastUpdated: parsed.lastUpdated || Date.now() };
  } catch {
    return null;
  }
}

function getStoredHadith(): HadithContent | null {
  try {
    const raw = localStorage.getItem('daily-hadith-cache');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      arabic:      parsed.arabic ?? '',
      translation: parsed.englishTranslation || parsed.translation || '',
      narrator:    parsed.narrator ?? '',
      source:      parsed.source ?? '',
      grade:       parsed.grade || 'Sahih',
      collection:  parsed.collection ?? 'bukhari',
      bookNumber:  Number(parsed.bookNumber ?? 0),
      hadithNumber: Number(parsed.hadithNumber ?? 0),
      lastUpdated: parsed.lastUpdated || Date.now(),
    };
  } catch {
    return null;
  }
}

function buildDailyContentPayload(): DailyContentPayload | null {
  const ayah = getStoredQuranVerse();
  if (!ayah) return null;
  const hadith = getStoredHadith() ?? {
    arabic: '',
    translation: '',
    narrator: '',
    source: 'Daily Hadith',
    grade: 'Sahih',
    collection: 'bukhari',
    bookNumber: 0,
    hadithNumber: 0,
    lastUpdated: Date.now(),
  };
  return { ayah, hadith, locale: getCurrentLocale(), lastUpdated: Date.now() };
}

// ─────────────────────────────────────────────────────────
// Public service class
// ─────────────────────────────────────────────────────────

export class WidgetService {
  /**
   * Full widget update — pushes prayer + daily content to all native widgets.
   * No-op on web.
   */
  static async updateWidget(
    latitude: number,
    longitude: number,
    locationName?: string,
    prayerTimes?: any,
  ): Promise<void> {
    if (!isNativePlatform()) return;
    try {
      const times = prayerTimes || calculatePrayerTimes(latitude, longitude, new Date());

      const locationLabel = locationName || 'Unknown location';

      // 1. Push prayer data
      const prayerPayload = buildPrayerPayload(times, locationLabel);
      if (prayerPayload) {
        await syncPrayerData(prayerPayload);
      }

      // 2. Push daily content (ayah + hadith)
      const dailyPayload = buildDailyContentPayload();
      if (dailyPayload) {
        await syncDailyContent(dailyPayload);
      }
    } catch (err) {
      console.warn('[WidgetService] updateWidget failed:', err);
      // Handle storage quota errors
      if (err instanceof Error && err.message.includes('quota')) {
        console.warn('[WidgetService] Storage quota exceeded, attempting cleanup');
        try {
          const cacheKeys = ['daily-ayah-cache', 'daily-hadith-cache'];
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
          
          cacheKeys.forEach(k => {
            const item = localStorage.getItem(k);
            if (item) {
              try {
                const parsed = JSON.parse(item);
                if (parsed.lastUpdated && parsed.lastUpdated < thirtyDaysAgo) {
                  localStorage.removeItem(k);
                }
              } catch {
                localStorage.removeItem(k);
              }
            }
          });
        } catch (cleanupError) {
          console.error('[WidgetService] Cleanup failed:', cleanupError);
        }
      }
    }
  }

  /**
   * Start the 30-minute auto-update timer.
   * Returns the interval ID for cleanup.
   */
  static startAutoUpdate(
    latitude: number,
    longitude: number,
    locationName?: string,
  ): ReturnType<typeof setInterval> {
    WidgetService.updateWidget(latitude, longitude, locationName).catch(() => {});
    return setInterval(
      () => WidgetService.updateWidget(latitude, longitude, locationName).catch(() => {}),
      30 * 60 * 1000,
    );
  }
}
