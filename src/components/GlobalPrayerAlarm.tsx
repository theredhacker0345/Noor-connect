import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { prayerTimesApiResponseSchema, safeParseApiResponse } from '@/lib/api-schemas';
import { getAdhanUrlForPrayer, type PrayerName } from '@/lib/adhan-preferences';
import { localNotifications } from '@/lib/local-notifications';
import { adhanService, type AdhanConfig } from '@/lib/adhan-service';
import { getFallbackLocationByTimezone, LOCATION_STORAGE_KEY } from '@/lib/location-config';
import { zonedNowHhmm } from '@/lib/tz-time';
import { getEffectiveAladhanMethodId } from '@/lib/prayer-method-resolver';
import { getMadhab } from '@/lib/storage';
import {
  PRAYER_ALARM_CONTROL_EVENT,
  PRAYER_ALARM_STATE_EVENT,
  PRAYER_ALARM_TOGGLE_EVENT,
  type PrayerAlarmControlDetail,
  type PrayerAlarmStateDetail,
  type PrayerAlarmToggleDetail,
} from '@/lib/prayer-alarm-events';

const STORAGE_KEY = 'prayer-alarm-enabled';
const LAST_PLAYED_KEY = 'prayer-alarm-last-played';
const PRAYER_TIMES_KEY = 'cached-prayer-times';
const REMINDER_MINUTES_KEY = 'prayer-reminder-minutes';
const LAST_REMINDER_KEY = 'prayer-reminder-last-played';
const PRAYER_TOGGLE_MAP: Record<PrayerName, keyof AdhanConfig> = {
  Fajr: 'fajrEnabled',
  Dhuhr: 'dhuhrEnabled',
  Asr: 'asrEnabled',
  Maghrib: 'maghribEnabled',
  Isha: 'ishaEnabled',
};

const initializeAlarmSync = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const existingToggle = localStorage.getItem(STORAGE_KEY);
    const adhanConfig = adhanService.getAdhanConfig();
    if (existingToggle === null) {
      localStorage.setItem(STORAGE_KEY, adhanConfig.enabled ? 'true' : 'false');
    } else if ((existingToggle === 'true') !== adhanConfig.enabled) {
      adhanService.saveAdhanConfig({ ...adhanConfig, enabled: existingToggle === 'true' });
    }
  }
};

interface PrayerTime {
  name: string;
  time: string;
}

interface CachedPrayerTimes {
  times: PrayerTime[];
  date: string;
  timeZone?: string;
}

const normalizeTimeString = (time: string): string =>
  time.replace(/\s*\(.*?\)\s*/g, '').trim();

const isValidPrayerName = (name: string): name is PrayerName =>
  ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(name);

const normalizePrayerName = (name: string): PrayerName | null => {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === 'fajr') return 'Fajr';
  if (lower === 'dhuhr' || lower === 'zuhr' || lower === 'dhur') return 'Dhuhr';
  if (lower === 'asr') return 'Asr';
  if (lower === 'maghrib') return 'Maghrib';
  if (lower === 'isha' || lower === 'ishaa') return 'Isha';
  return null;
};

export const GlobalPrayerAlarm = () => {
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initializeAlarmSync();
    }
  }, []);

  const isAdhanEnabledForPrayer = useCallback(
    (prayerName: PrayerName | null) => {
      const config = adhanService.getAdhanConfig();
      if (!config.enabled) return false;
      if (!prayerName) return config.enabled;
      const key = PRAYER_TOGGLE_MAP[prayerName];
      if (!key) return true;
      
      switch (key) {
        case 'fajrEnabled': return config.fajrEnabled;
        case 'dhuhrEnabled': return config.dhuhrEnabled;
        case 'asrEnabled': return config.asrEnabled;
        case 'maghribEnabled': return config.maghribEnabled;
        case 'ishaEnabled': return config.ishaEnabled;
        case 'jummahEnabled': return config.jummahEnabled;
        default: return true;
      }
    },
    []
  );

  const emitPlaybackState = useCallback((isPlaying: boolean, prayerName: string | null) => {
    const detail: PrayerAlarmStateDetail = { isPlaying, prayerName };
    window.dispatchEvent(new CustomEvent<PrayerAlarmStateDetail>(PRAYER_ALARM_STATE_EVENT, { detail }));
  }, []);

  const stopCurrentAdhan = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    emitPlaybackState(false, null);
  }, [emitPlaybackState]);

  const readCachedPrayerTimes = useCallback((): CachedPrayerTimes | null => {
    try {
      const cached = localStorage.getItem(PRAYER_TIMES_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached) as Partial<CachedPrayerTimes>;
      if (!parsed || !Array.isArray(parsed.times) || typeof parsed.date !== 'string' || parsed.date.trim() === '') {
        return null;
      }

      const times = parsed.times
        .filter(
          (item): item is PrayerTime =>
            Boolean(item) &&
            typeof item.name === 'string' &&
            typeof item.time === 'string' &&
            item.time.trim() !== ''
        )
        .map((item) => ({ name: item.name, time: normalizeTimeString(item.time) }));

      return { times, date: parsed.date };
    } catch (error) {
      console.error('Failed to parse cached prayer times:', error);
      return null;
    }
  }, []);

  const fetchAndCachePrayerTimes = useCallback(async (signal?: AbortSignal) => {
    try {
      // Guard: skip geolocation if we already have today's prayer times cached
      const existingCache = readCachedPrayerTimes();
      if (existingCache && existingCache.date === new Date().toDateString()) {
        return; // Cache is fresh, no need to hit geolocation API
      }

      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        // Reuse the app's stored location and avoid third-party IP lookups in the alarm path.
        const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (savedLocation) {
          const { latitude: savedLat, longitude: savedLon } = JSON.parse(savedLocation);
          latitude = savedLat;
          longitude = savedLon;
        }
      } catch (parseError) {
        console.warn('Failed to parse saved location:', parseError);
      }

      if (latitude === undefined || longitude === undefined) {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const fallbackLocation = getFallbackLocationByTimezone(userTimezone);
        latitude = fallbackLocation.lat;
        longitude = fallbackLocation.lon;
        console.log(`Using fallback location: ${fallbackLocation.name}`);
      }

      if (signal?.aborted) return;

      // Use the same effective calculation method/madhab as the rest of the app
      // (was hardcoded to ISNA, so the adhan fired at different times than shown).
      const methodId = getEffectiveAladhanMethodId(latitude, longitude);
      const school = getMadhab() === 'hanafi' ? 1 : 0;

      const response = await fetch(
        `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=${methodId}&school=${school}`,
        { signal }
      );

      if (!response.ok) return;

      const rawData = await response.json();

      if (signal?.aborted) return;

      const parseResult = safeParseApiResponse(prayerTimesApiResponseSchema, rawData);

      if (!parseResult.success) {
        console.error('Invalid prayer times API response');
        return;
      }

      const timings = parseResult.data.data.timings;
      const prayerTimes: PrayerTime[] = [
        { name: 'Fajr', time: normalizeTimeString(timings.Fajr) },
        { name: 'Dhuhr', time: normalizeTimeString(timings.Dhuhr) },
        { name: 'Asr', time: normalizeTimeString(timings.Asr) },
        { name: 'Maghrib', time: normalizeTimeString(timings.Maghrib) },
        { name: 'Isha', time: normalizeTimeString(timings.Isha) },
      ];

      let cachedTimeZone: string | undefined;
      try {
        cachedTimeZone = JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY) || '')?.timeZone;
      } catch { /* no stored location — fall back to device timezone */ }

      const cachedData = {
        times: prayerTimes,
        date: new Date().toDateString(),
        timeZone: cachedTimeZone,
      } satisfies CachedPrayerTimes;

      localStorage.setItem(PRAYER_TIMES_KEY, JSON.stringify(cachedData));

      // Native adhan alarms are scheduled centrally (with correct per-day dates
      // and timezone) by localNotifications.schedulePrayerNotificationsFromAPI —
      // a former attempt here passed `date: new Date()` for every prayer, which
      // scheduled nothing.
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error fetching prayer times:', error);
    }
  }, [readCachedPrayerTimes]);

  const playAdhan = useCallback(
    async (prayerName: string, options?: { force?: boolean }) => {
      const isAlarmEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
      const normalizedPrayer = normalizePrayerName(prayerName);
      const configAllowsPrayer = normalizedPrayer ? isAdhanEnabledForPrayer(normalizedPrayer) : true;

      if (!options?.force) {
        if (!isAlarmEnabled) return;
        if (!configAllowsPrayer) return;
      }

      stopCurrentAdhan();

      const adhanUrl = normalizedPrayer
        ? await getAdhanUrlForPrayer(normalizedPrayer)
        : isValidPrayerName(prayerName)
          ? await getAdhanUrlForPrayer(prayerName)
          : await getAdhanUrlForPrayer('Dhuhr');

      // Reuse existing audio element if available, otherwise create new one
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio(adhanUrl);
        audioRef.current = audio;
      } else {
        audio.src = adhanUrl;
      }
      const { volume } = adhanService.getAdhanConfig();
      audio.volume = Math.min(Math.max((volume ?? 80) / 100, 0), 1);
      audio.preload = 'auto';
      audio.loop = false;

      audio.onended = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        emitPlaybackState(false, null);
      };

      audio.onerror = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        emitPlaybackState(false, null);
      };

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${prayerName} Adhan`,
          artist: 'Noor Connect',
          album: 'Prayer Call',
          artwork: [
            { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        });

        try {
          navigator.mediaSession.setActionHandler('stop', stopCurrentAdhan);
          navigator.mediaSession.setActionHandler('pause', () => {
            audio.pause();
          });
        } catch (error) {
          console.warn('Media session action handlers are not fully supported:', error);
        }
      }

      const displayPrayerName = normalizedPrayer || (prayerName || 'Prayer').trim() || 'Prayer';
      toast.success(`${displayPrayerName} Time!`, {
        description: 'It is time for prayer. Adhan is playing.',
        duration: 30000,
      });

      localNotifications.showNativeNotification(
        `${displayPrayerName} Prayer Time`,
        `It is time for ${displayPrayerName} prayer.`,
        { url: '/dashboard', tag: 'prayer-alarm' }
      );

      emitPlaybackState(true, displayPrayerName);

      try {
        await audio.play();
      } catch (error) {
        const errorName = error instanceof Error ? error.name : '';
        if (errorName !== 'AbortError') {
          console.error('Failed to play Adhan:', error);
          toast.error('Audio Blocked', {
            description: 'Please tap anywhere in the app to enable Adhan audio.',
          });
        }
        stopCurrentAdhan();
      }
    },
    [emitPlaybackState, stopCurrentAdhan]
  );

  const playReminder = useCallback((prayerName: string, minutesBefore: number) => {
    toast.info(`${prayerName} in ${minutesBefore} minutes`, {
      description: 'Prepare for prayer',
      duration: 10000,
    });

    localNotifications.showNativeNotification(
      `${prayerName} Prayer Coming Up`,
      `${prayerName} prayer will begin in ${minutesBefore} minutes`,
      { url: '/dashboard', tag: 'prayer-reminder' }
    );
  }, []);

  const checkPrayerTime = useCallback(() => {
    const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
    const config = adhanService.getAdhanConfig();
    if (!isEnabled || !config.enabled) return;

    const cached = readCachedPrayerTimes();
    if (!cached) return;

    const { times, date, timeZone } = cached;
    const today = new Date().toDateString();

    if (date !== today) {
      fetchAndCachePrayerTimes();
      return;
    }

    const now = new Date();
    // Prayer times are wall clock in the location's timezone — compare like for like.
    const currentTimeStr = zonedNowHhmm(timeZone, now);
    const lastPlayed = localStorage.getItem(LAST_PLAYED_KEY);
    const lastReminder = localStorage.getItem(LAST_REMINDER_KEY);
    const reminderMinutes = parseInt(localStorage.getItem(REMINDER_MINUTES_KEY) || '0', 10);

    for (const prayer of times) {
      if (typeof prayer.time !== 'string' || prayer.time.trim() === '') {
        continue;
      }
      const prayerTime = normalizeTimeString(prayer.time);
      const prayerKey = `${today}-${prayer.name}`;
      const reminderKey = `${today}-${prayer.name}-reminder`;

      const normalizedPrayer = normalizePrayerName(prayer.name);
      if (normalizedPrayer && !isAdhanEnabledForPrayer(normalizedPrayer)) {
        continue;
      }

      if (prayerTime === currentTimeStr && lastPlayed !== prayerKey) {
        localStorage.setItem(LAST_PLAYED_KEY, prayerKey);
        playAdhan(prayer.name);
        break;
      }

      if (reminderMinutes > 0 && lastReminder !== reminderKey) {
        const [prayerHour, prayerMinute] = prayerTime.split(':').map(Number);
        const prayerDate = new Date();
        prayerDate.setHours(prayerHour, prayerMinute, 0, 0);

        const reminderTime = new Date(prayerDate.getTime() - reminderMinutes * 60 * 1000);
        const reminderTimeStr = `${reminderTime.getHours().toString().padStart(2, '0')}:${reminderTime
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;

        if (currentTimeStr === reminderTimeStr) {
          localStorage.setItem(LAST_REMINDER_KEY, reminderKey);
          playReminder(prayer.name, reminderMinutes);
          break;
        }
      }
    }
  }, [fetchAndCachePrayerTimes, playAdhan, playReminder, readCachedPrayerTimes]);

  const startChecking = useCallback(() => {
    if (checkIntervalRef.current) return;

    // Create new AbortController for this session
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    fetchAndCachePrayerTimes(signal);
    checkPrayerTime();
    checkIntervalRef.current = setInterval(() => {
      if (!signal.aborted) checkPrayerTime();
    }, 30000);
  }, [checkPrayerTime, fetchAndCachePrayerTimes]);

  const stopChecking = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    // Abort any pending fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopCurrentAdhan();
  }, [stopCurrentAdhan]);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'true' && adhanService.getAdhanConfig().enabled) {
      startChecking();
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue === 'true') {
        startChecking();
      } else {
        stopChecking();
      }
    };

    const handleToggle = (event: Event) => {
      const detail = (event as CustomEvent<PrayerAlarmToggleDetail>).detail;
      if (detail?.enabled) {
        startChecking();
      } else {
        stopChecking();
      }
    };

    const handleControl = (event: Event) => {
      const detail = (event as CustomEvent<PrayerAlarmControlDetail>).detail;
      if (!detail) return;

      if (detail.action === 'stop') {
        stopCurrentAdhan();
        return;
      }

      if (detail.action === 'test') {
        const prayerName = detail.prayerName?.trim() || 'Dhuhr';
        playAdhan(prayerName, { force: true });
      }
    };

    const handleConfigChange = () => {
      // Re-read enabled status
      const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
      const config = adhanService.getAdhanConfig();
      if (isEnabled && config.enabled) {
        startChecking();
      } else {
        stopChecking();
      }
    };

    // When the calculation method or madhab changes, today's cached times are stale —
    // drop them so the alarm refetches and fires with the new method's times.
    const handleMethodChange = () => {
      try {
        localStorage.removeItem(PRAYER_TIMES_KEY);
      } catch {
        // ignore — cache will simply stay until the next successful fetch
      }
      stopChecking();
      handleConfigChange();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('adhan-config-changed', handleConfigChange as EventListener);
    window.addEventListener('adhan-preferences-changed', handleConfigChange as EventListener);
    window.addEventListener('prayer-method-changed', handleMethodChange as EventListener);
    window.addEventListener('madhab-changed', handleMethodChange as EventListener);
    window.addEventListener(PRAYER_ALARM_TOGGLE_EVENT, handleToggle as EventListener);
    window.addEventListener(PRAYER_ALARM_CONTROL_EVENT, handleControl as EventListener);

    return () => {
      stopChecking();
      emitPlaybackState(false, null);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('adhan-config-changed', handleConfigChange as EventListener);
      window.removeEventListener('adhan-preferences-changed', handleConfigChange as EventListener);
      window.removeEventListener('prayer-method-changed', handleMethodChange as EventListener);
      window.removeEventListener('madhab-changed', handleMethodChange as EventListener);
      window.removeEventListener(PRAYER_ALARM_TOGGLE_EVENT, handleToggle as EventListener);
      window.removeEventListener(PRAYER_ALARM_CONTROL_EVENT, handleControl as EventListener);
    };
  }, [emitPlaybackState, playAdhan, startChecking, stopChecking, stopCurrentAdhan]);

  return null;
};
