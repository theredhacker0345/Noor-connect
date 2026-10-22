/**
 * Local Storage Utility - All data stays on device
 * FOSS & Privacy-focused storage solution
 */

const STORAGE_KEYS = {
  THEME: 'theme',
  MADHAB: 'madhab',
  TIME_FORMAT: 'time-format',
  TASBEEH_TOTAL: 'tasbeeh-total',
  TASBEEH_HISTORY: 'tasbeeh-history',
  FAVORITES: 'favorites',
  BOOKMARKS: 'bookmarks',
  PRAYER_SETTINGS: 'prayer-settings',
  PRAYER_ALARM_ENABLED: 'prayer-alarm-enabled',
  PRAYER_REMINDER_MINUTES: 'prayer-reminder-minutes',
  SELECTED_ADHAN: 'selected-adhan-id',
  CACHED_PRAYER_TIMES: 'cached-prayer-times',
  LAST_HADITH: 'last-hadith',
  SHOW_EXTRA_PRAYERS: 'show-extra-prayers',
  BEFORE_SLEEP_ENABLED: 'before-sleep-enabled',
  BEDTIME_HOUR: 'bedtime-hour',
  BEDTIME_MINUTE: 'bedtime-minute',
} as const;

// ... (skipping some exports for brevity)

export const getShowExtraPrayers = (): boolean => {
  const stored = localStorage.getItem(STORAGE_KEYS.SHOW_EXTRA_PRAYERS);
  return stored === null ? true : stored === 'true'; // Default to true (show all prayers 24/7)
};

export const setShowExtraPrayers = (show: boolean): void => {
  localStorage.setItem(STORAGE_KEYS.SHOW_EXTRA_PRAYERS, show ? 'true' : 'false');
  window.dispatchEvent(new Event('storage'));
};

// ─── Evictable cache keys (storage-quota fallback allowlist) ──────────────────
// ONLY these keys may ever be evicted when localStorage is full. Every entry is
// a PURE CACHE that the app re-downloads / recomputes automatically — none of
// them hold user-created data (bookmarks, progress, counts, notes are NEVER
// evicted). Keep this list in sync with src/lib/backup-service.ts
// (KNOWN_STORAGE_KEYS documents the full data inventory).
//
// Audited against localStorage.setItem call sites in src/:
//   quran-surahs-cache        → Quran.tsx / Tafsir-New.tsx (refetched from API)
//   mp3quran-reciters-v1      → reciter directory cache (refetched)
//   enhanced-daily-ayah       → EnhancedDailyAyah.tsx (today's ayah, regenerated)
//   ayah-last-update          → EnhancedDailyAyah.tsx (timestamp for the above)
//   last-hadith               → setCachedHadith() below (today's hadith, regenerated)
//   lastHadithData            → daily-hadith cache (regenerated daily)
//   lastHadithDate            → daily-hadith cache timestamp
//   cached-prayer-times       → prayer-times cache (recomputed/refetched)
//   prayer-times-today        → usePrayerTimes.ts (recomputed)
//   daily-remedy              → remedy-gamification.ts (today's pick, regenerated)
export const EVICTABLE_CACHE_KEYS: readonly string[] = [
  'quran-surahs-cache',
  'mp3quran-reciters-v1',
  'enhanced-daily-ayah',
  'ayah-last-update',
  'last-hadith',
  'lastHadithData',
  'lastHadithDate',
  'cached-prayer-times',
  'prayer-times-today',
  'daily-remedy',
];

// Key PREFIXES that are pure caches (dynamic keys). Audited:
//   exchange-rate-fallback-<currency> → exchange-rate-fallback.ts CACHE_KEY_PREFIX
//   (rates are re-fetched; never matches user-data keys like 'noor-water-<date>'
//   or 'ebook-<bookId>', which are deliberately NOT listed)
export const EVICTABLE_CACHE_KEY_PREFIXES: readonly string[] = [
  'exchange-rate-fallback-',
];

/**
 * Evict allowlisted pure-cache keys to free localStorage space.
 * NEVER removes anything that is not in EVICTABLE_CACHE_KEYS /
 * EVICTABLE_CACHE_KEY_PREFIXES, and never removes `protectKey` itself.
 */
const evictCacheKeys = (protectKey?: string): number => {
  let freed = 0;
  try {
    const keys = Object.keys(localStorage); // snapshot — safe to mutate during loop
    keys.forEach(k => {
      if (k === protectKey) return;
      const isCache =
        EVICTABLE_CACHE_KEYS.includes(k) ||
        EVICTABLE_CACHE_KEY_PREFIXES.some(p => k.startsWith(p));
      if (isCache) {
        try {
          localStorage.removeItem(k);
          freed++;
        } catch {
          // ignore individual removal failures
        }
      }
    });
  } catch {
    // localStorage unreadable — nothing to evict
  }
  return freed;
};

// Generic storage helpers
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch (error) {
      // Value not serializable (e.g. circular ref) — a retry can never help.
      console.error(`[storage] Failed to serialize value for "${key}":`, error);
      return;
    }

    // 1st attempt — plain write.
    try {
      localStorage.setItem(key, serialized);
      return;
    } catch (error) {
      console.warn(`[storage] Write failed for "${key}", will evict pure caches only:`, error);
    }

    // 2nd attempt — after evicting ONLY allowlisted pure-cache keys.
    // User data (bookmarks, progress, settings, counts, notes, history) is
    // never touched. Nothing older-than-30-days is scanned; nothing outside
    // the allowlist is removed.
    evictCacheKeys(key);
    try {
      localStorage.setItem(key, serialized);
      return;
    } catch (retryError) {
      // Still failing — report and give up WITHOUT deleting any user data.
      console.warn(
        `[storage] Quota still exceeded after cache eviction; "${key}" was NOT saved. ` +
        `No user data was deleted. Consider freeing space via the in-app backup/restore.`
      );
      window.dispatchEvent(
        new CustomEvent('noor:storage-quota', {
          detail: { key, error: String(retryError) },
        })
      );
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },
};

// Theme
export const getTheme = (): 'dark' | 'light' => {
  return (localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light') || 'light';
};

export const setTheme = (theme: 'dark' | 'light'): void => {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

// Madhab / Fiqh — simplified to the 2 options used by the app.
// (Asr calculation only differs between Hanafi and Shafi; Maliki & Hanbali
//  follow Shafi, so we expose just the two meaningful choices.)
export type MadhabType = 'shafi' | 'hanafi';

const VALID_MADHABS: MadhabType[] = ['shafi', 'hanafi'];

export const getMadhab = (): MadhabType => {
  const stored = localStorage.getItem(STORAGE_KEYS.MADHAB) as MadhabType | null;
  // Normalize legacy values (maliki/hanbali → shafi) so old installs migrate cleanly.
  return stored && VALID_MADHABS.includes(stored) ? stored : 'shafi';
};

export const setMadhab = (madhab: MadhabType): void => {
  localStorage.setItem(STORAGE_KEYS.MADHAB, madhab);
  // Notify listeners (usePrayerTimes, Dashboard, GlobalPrayerAlarm) so times
  // are recalculated & notifications re-scheduled for the new Asr school.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('madhab-changed', { detail: { madhab } }));
  }
};

// Time Format
export const getTimeFormat = (): '12' | '24' => {
  return (localStorage.getItem(STORAGE_KEYS.TIME_FORMAT) as '12' | '24') || '24';
};

export const setTimeFormat = (format: '12' | '24'): void => {
  localStorage.setItem(STORAGE_KEYS.TIME_FORMAT, format);
  // Dispatch custom event for immediate UI updates
  window.dispatchEvent(new CustomEvent('time-format-changed', { detail: { format } }));
};

// Tasbeeh
interface TasbeehEntry {
  date: string;
  count: number;
  label: string;
}

export const getTasbeehTotal = (): number => {
  return parseInt(localStorage.getItem(STORAGE_KEYS.TASBEEH_TOTAL) || '0', 10);
};

export const setTasbeehTotal = (total: number): void => {
  localStorage.setItem(STORAGE_KEYS.TASBEEH_TOTAL, total.toString());
  window.dispatchEvent(new CustomEvent('tasbeeh-updated'));
};

export const getTasbeehHistory = (): TasbeehEntry[] => {
  return storage.get(STORAGE_KEYS.TASBEEH_HISTORY, []);
};

export const addTasbeehEntry = (label: string): void => {
  const history = getTasbeehHistory();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const existingIndex = history.findIndex(h => h.date === today && h.label === label);

  const newHistory = [...history];
  if (existingIndex >= 0) {
    newHistory[existingIndex] = { ...newHistory[existingIndex], count: newHistory[existingIndex].count + 1 };
  } else {
    newHistory.unshift({ date: today, count: 1, label });
  }

  // Keep only last 30 days
  storage.set(STORAGE_KEYS.TASBEEH_HISTORY, newHistory.slice(0, 100));
  setTasbeehTotal(getTasbeehTotal() + 1);
};

// Favorites (for duas)
export const getFavorites = (): string[] => {
  return storage.get(STORAGE_KEYS.FAVORITES, []);
};

export const toggleFavorite = (id: string): boolean => {
  const favorites = getFavorites();
  const index = favorites.indexOf(id);

  const newFavorites = [...favorites];
  if (index >= 0) {
    newFavorites.splice(index, 1);
    storage.set(STORAGE_KEYS.FAVORITES, newFavorites);
    return false;
  } else {
    newFavorites.push(id);
    storage.set(STORAGE_KEYS.FAVORITES, newFavorites);
    return true;
  }
};

// Bookmarks (for Quran)
interface Bookmark {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
}

export const getBookmarks = (): Bookmark[] => {
  return storage.get(STORAGE_KEYS.BOOKMARKS, []);
};

export const toggleBookmark = (surahNumber: number, ayahNumber: number, surahName: string): boolean => {
  const bookmarks = getBookmarks();
  const index = bookmarks.findIndex(b => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber);

  if (index >= 0) {
    bookmarks.splice(index, 1);
    storage.set(STORAGE_KEYS.BOOKMARKS, bookmarks);
    return false;
  } else {
    bookmarks.push({ surahNumber, ayahNumber, surahName });
    storage.set(STORAGE_KEYS.BOOKMARKS, bookmarks);
    return true;
  }
};

export const getBookmarksForSurah = (surahNumber: number): Set<number> => {
  const bookmarks = getBookmarks();
  return new Set(bookmarks.filter(b => b.surahNumber === surahNumber).map(b => b.ayahNumber));
};

// Prayer Settings
interface PrayerSettings {
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export const getPrayerSettings = (): PrayerSettings => {
  return storage.get(STORAGE_KEYS.PRAYER_SETTINGS, {});
};

export const setPrayerSettings = (settings: PrayerSettings): void => {
  storage.set(STORAGE_KEYS.PRAYER_SETTINGS, settings);
};

// Prayer Alarm
export const isPrayerAlarmEnabled = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.PRAYER_ALARM_ENABLED) === 'true';
};

export const setPrayerAlarmEnabled = (enabled: boolean): void => {
  localStorage.setItem(STORAGE_KEYS.PRAYER_ALARM_ENABLED, enabled ? 'true' : 'false');
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEYS.PRAYER_ALARM_ENABLED,
    newValue: enabled ? 'true' : 'false',
  }));
};

export const getReminderMinutes = (): number => {
  return parseInt(localStorage.getItem(STORAGE_KEYS.PRAYER_REMINDER_MINUTES) || '0', 10);
};

export const setReminderMinutes = (minutes: number): void => {
  localStorage.setItem(STORAGE_KEYS.PRAYER_REMINDER_MINUTES, minutes.toString());
};

// Adhan
export const getSelectedAdhanId = (): string => {
  return localStorage.getItem(STORAGE_KEYS.SELECTED_ADHAN) || 'adhan-makkah';
};

export const setSelectedAdhanId = (id: string): void => {
  localStorage.setItem(STORAGE_KEYS.SELECTED_ADHAN, id);
};

// Hadith cache
interface CachedHadith {
  date: string;
  hadith: string;
  book: string;
  number: string;
}

export const getCachedHadith = (): CachedHadith | null => {
  return storage.get(STORAGE_KEYS.LAST_HADITH, null);
};

export const setCachedHadith = (hadith: CachedHadith): void => {
  storage.set(STORAGE_KEYS.LAST_HADITH, hadith);
};

// Bedtime / Before-sleep notification settings
export const isBeforeSleepEnabled = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.BEFORE_SLEEP_ENABLED) === 'true';
};

export const setBeforeSleepEnabled = (enabled: boolean): void => {
  localStorage.setItem(STORAGE_KEYS.BEFORE_SLEEP_ENABLED, enabled ? 'true' : 'false');
};

export const getBedtimeHour = (): number => {
  const h = localStorage.getItem(STORAGE_KEYS.BEDTIME_HOUR);
  return h !== null ? parseInt(h, 10) : 22;
};

export const setBedtimeHour = (hour: number): void => {
  localStorage.setItem(STORAGE_KEYS.BEDTIME_HOUR, hour.toString());
};

export const getBedtimeMinute = (): number => {
  const m = localStorage.getItem(STORAGE_KEYS.BEDTIME_MINUTE);
  return m !== null ? parseInt(m, 10) : 0;
};

export const setBedtimeMinute = (minute: number): void => {
  localStorage.setItem(STORAGE_KEYS.BEDTIME_MINUTE, minute.toString());
};

// Islamic Sleep Reminder
const ISLAMIC_SLEEP_ENABLED = 'islamic-sleep-enabled';

export const isIslamicSleepReminderEnabled = (): boolean => {
  return localStorage.getItem(ISLAMIC_SLEEP_ENABLED) === 'true';
};

export const setIslamicSleepReminderEnabled = (enabled: boolean): void => {
  localStorage.setItem(ISLAMIC_SLEEP_ENABLED, enabled ? 'true' : 'false');
};

const ISLAMIC_SLEEP_OFFSET = 'islamic-sleep-offset';

export const getIslamicSleepOffset = (): number => {
  const saved = localStorage.getItem(ISLAMIC_SLEEP_OFFSET);
  return saved ? parseInt(saved, 10) : 30;
};

export const setIslamicSleepOffset = (minutes: number): void => {
  localStorage.setItem(ISLAMIC_SLEEP_OFFSET, minutes.toString());
};
