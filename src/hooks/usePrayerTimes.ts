/**
 * Prayer Times Hook using Aladhan API with Geolocation
 * Fetches prayer times from https://api.aladhan.com/v1/timings
 * Uses geolocation API with multiple fallbacks and manual search
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { calculatePrayerTimes } from '@/lib/prayer-calculator';
import { GeocodingService } from '@/lib/geocoding';
import { AladhanAPI } from '@/lib/aladhan-api';
import { getEffectiveCalculationMethod, getEffectiveAladhanMethodId } from '@/lib/prayer-method-resolver';
import { formatPrayerTime } from '@/lib/time-formatter';
import { GeolocationService } from '@/lib/geolocation-service';
import { getFallbackLocationByTimezone, LOCATION_STORAGE_KEY } from '@/lib/location-config';
import { getMadhab } from '@/lib/storage';
import { usePrayerNotifications } from './usePrayerNotifications';

export interface PrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  midnight: Date;
  imsak?: Date;
  ishraq?: Date;
  duha?: Date;
  tahajjud?: Date;
}

export interface PrayerTimesWithEnd {
  fajr: { start: Date; end: Date };
  sunrise: { start: Date; end: Date };
  dhuhr: { start: Date; end: Date };
  asr: { start: Date; end: Date };
  maghrib: { start: Date; end: Date };
  isha: { start: Date; end: Date };
  imsak?: { start: Date; end: Date };
  ishraq?: { start: Date; end: Date };
  duha?: { start: Date; end: Date };
  tahajjud?: { start: Date; end: Date };
  midnight?: { start: Date; end: Date };
}

export interface LocationData {
  latitude: number;
  longitude: number;
  locationName?: string;
  city?: string;
  country?: string;
  timeZone?: string;
  source: 'geolocation' | 'ip' | 'stored' | 'manual' | 'default';
}

export interface UsePrayerTimesReturn {
  prayerTimes: PrayerTimes | null;
  prayerTimesWithEnd: PrayerTimesWithEnd | null;
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  needsManualLocation: boolean;
  refresh: () => Promise<void>;
  setManualLocation: (city: string, country: string) => Promise<void>;
}

type PrayerTimingMap = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak?: string;
  Midnight?: string;
  Firstthird?: string;
  Lastthird?: string;
};

export function usePrayerTimes(): UsePrayerTimesReturn {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [prayerTimesWithEnd, setPrayerTimesWithEnd] = useState<PrayerTimesWithEnd | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsManualLocation, setNeedsManualLocation] = useState(false);

  // Add ref to prevent multiple fetches
  const isFetchingRef = useRef(false);
  const isCalculatingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const prayerTimesRef = useRef<PrayerTimes | null>(null);

  // Track the last successful fetch signature so we only refresh once per location/method/day.
  const lastFetchSignatureRef = useRef<string | null>(null);

  // Separate ref to track the previous prayer-times signature for notification scheduling
  const previousNotificationSignatureRef = useRef<string | null>(null);

  // Get location from geolocation API
  const getLocationFromGeolocation = useCallback(async (): Promise<LocationData> => {
    try {

      // Check permissions first
      const permissions = await GeolocationService.checkPermissions();

      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        // Request permissions
        const granted = await GeolocationService.requestPermissions();
        if (!granted) {
          throw new Error('Location permission denied. Please enable location access in your device settings.');
        }
      }

      const position = await GeolocationService.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3600000 // 1 hour
      });

      const locationData: LocationData = {
        latitude: position.latitude,
        longitude: position.longitude,
        source: 'geolocation'
      };

      return locationData;
    } catch (error) {
      console.warn('Geolocation failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Location access denied.');
    }
  }, []);

  // Get default location
  const getDefaultLocation = useCallback((): LocationData => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const defaultLoc = getFallbackLocationByTimezone(timeZone);
    return {
      latitude: defaultLoc.lat,
      longitude: defaultLoc.lon,
      city: defaultLoc.name,
      locationName: `${defaultLoc.name} (Offline)`,
      timeZone,
      source: 'default'
    };
  }, []);

  useEffect(() => {
    prayerTimesRef.current = prayerTimes;
  }, [prayerTimes]);

  const readStoredLocation = useCallback((): (LocationData & { timestamp?: string }) | null => {
    try {
      const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored) as Partial<LocationData> & {
        latitude?: number;
        longitude?: number;
        lastUpdated?: string;
        timestamp?: string;
        locationName?: string;
      };

      if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') {
        return null;
      }

      const locationName = typeof parsed.locationName === 'string'
        ? parsed.locationName
        : undefined;

      return {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        city: typeof parsed.city === 'string' ? parsed.city : locationName?.split(',')[0]?.trim(),
        country: typeof parsed.country === 'string' ? parsed.country : undefined,
        timeZone: typeof parsed.timeZone === 'string' ? parsed.timeZone : undefined,
        locationName,
        source: parsed.source ?? 'stored',
        timestamp: parsed.timestamp ?? parsed.lastUpdated,
      };
    } catch (error) {
      console.warn('Failed to parse stored location:', error);
      return null;
    }
  }, []);

  // Get user location (manual set by user)
  const getUserLocation = useCallback((): LocationData | null => {
    const locationData = readStoredLocation();
    return locationData?.source === 'manual' ? locationData : null;
  }, [readStoredLocation]);

  // Get stored location from localStorage
  const getStoredLocation = useCallback((): LocationData | null => {
    const locationData = readStoredLocation();
    if (!locationData) {
      return null;
    }

    if (locationData.source === 'manual') {
      return locationData;
    }

    if (!locationData.timestamp) {
      return null;
    }

    const storedTime = new Date(locationData.timestamp);
    if (Number.isNaN(storedTime.getTime())) {
      return null;
    }

    const hoursDiff = (Date.now() - storedTime.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24 ? locationData : null;
  }, [readStoredLocation]);

  // Save location to localStorage
  const saveLocation = useCallback((locationData: LocationData) => {
    try {
      const fallbackName = [locationData.city, locationData.country].filter(Boolean).join(', ');
      const locationName = locationData.locationName
        || fallbackName
        || `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`;
      const dataToStore = {
        ...locationData,
        locationName,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to save location to localStorage:', error);
    }
  }, []);

  // Fetch prayer times using coordinates
  const fetchPrayerTimesWithCoordinates = useCallback(async (locationData: LocationData) => {
    try {
      // Prevent multiple simultaneous calculations or rapid re-calculations
      if (isCalculatingRef.current) {
        return;
      }

      // Resolve one effective method for every code path (user's explicit
      // choice, or the region-recommended one, e.g. Egyptian for Egypt).
      const methodName = getEffectiveCalculationMethod(locationData.latitude, locationData.longitude);
      const methodId = getEffectiveAladhanMethodId(locationData.latitude, locationData.longitude);
      const locationKey = `${locationData.latitude.toFixed(4)},${locationData.longitude.toFixed(4)}`;
      const now = new Date();
      const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const madhab = getMadhab();
      const fetchSignature = `${locationKey}|${dayKey}|${methodId}|${madhab}`;

      if (lastFetchSignatureRef.current === fetchSignature) {
        return;
      }

      isCalculatingRef.current = true;

      // Try to get times from API (handles caching and online refresh)
      let timings: PrayerTimingMap;
      let timeZone = locationData.timeZone;

      try {
        // Aladhan API: 0 = Shafi, 1 = Hanafi
        // Maliki and Hanbali follow Shafi calculation for Asr
        const schoolParam = madhab === 'hanafi' ? 1 : 0;
        const result = await AladhanAPI.getTodaysPrayerTimes(
          locationData.latitude,
          locationData.longitude,
          methodId,
          schoolParam
        );
        timings = result.timings;
        timeZone = result.timezone;
      } catch {
        console.warn('API fetch failed, using offline calculation');
        const offlineResult = calculatePrayerTimes(locationData.latitude, locationData.longitude, now, methodName);
        timings = {
          Fajr: formatPrayerTime(offlineResult.fajr, '24'),
          Sunrise: formatPrayerTime(offlineResult.sunrise, '24'),
          Dhuhr: formatPrayerTime(offlineResult.dhuhr, '24'),
          Asr: formatPrayerTime(offlineResult.asr, '24'),
          Maghrib: formatPrayerTime(offlineResult.maghrib, '24'),
          Isha: formatPrayerTime(offlineResult.isha, '24'),
        };
      }

      // Parse the timings back to Date objects
      // Aladhan API returns times like "05:30 (PKT)" — strip the timezone suffix
      const parseTime = (timeStr: string): Date => {
        const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
        const parts = cleaned.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) {
          console.error('Failed to parse time string:', timeStr);
          throw new Error(`Invalid time format: ${timeStr}`);
        }
        const d = new Date(now);
        d.setHours(h, m, 0, 0);
        return d;
      };

      const prayerDates = {
        fajr: parseTime(timings.Fajr),
        sunrise: parseTime(timings.Sunrise),
        dhuhr: parseTime(timings.Dhuhr),
        asr: parseTime(timings.Asr),
        maghrib: parseTime(timings.Maghrib),
        isha: parseTime(timings.Isha),
      };

      // Parse optional times from API if available
      const optionalTimes = {
        imsak: timings.Imsak ? parseTime(timings.Imsak) : null,
        midnight: timings.Midnight ? parseTime(timings.Midnight) : null,
        firstthird: timings.Firstthird ? parseTime(timings.Firstthird) : null,
        lastthird: timings.Lastthird ? parseTime(timings.Lastthird) : null,
      };

      // Tomorrow's Fajr for Isha end time
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowResult = calculatePrayerTimes(locationData.latitude, locationData.longitude, tomorrow, methodName);

      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);

      const times: PrayerTimes = {
        ...prayerDates,
        midnight: optionalTimes.midnight || midnight,
        imsak: optionalTimes.imsak || new Date(prayerDates.fajr.getTime() - 10 * 60000),
        ishraq: new Date(prayerDates.sunrise.getTime() + 15 * 60000),
        duha: new Date(prayerDates.sunrise.getTime() + (prayerDates.dhuhr.getTime() - prayerDates.sunrise.getTime()) / 2),
        tahajjud: optionalTimes.lastthird || new Date(midnight.getTime() + (tomorrowResult.fajr.getTime() - midnight.getTime()) / 2),
      };

      const withEnd: PrayerTimesWithEnd = {
        fajr: { start: times.fajr, end: times.sunrise },
        sunrise: { start: times.sunrise, end: times.sunrise }, // Sunrise is an event, not a prayer period
        dhuhr: { start: times.dhuhr, end: times.asr },
        asr: { start: times.asr, end: times.maghrib },
        maghrib: { start: times.maghrib, end: times.isha },
        isha: { start: times.isha, end: tomorrowResult.fajr },
        imsak: { start: times.imsak!, end: times.fajr },
        ishraq: { start: times.ishraq!, end: new Date(times.ishraq!.getTime() + 20 * 60000) },
        duha: { start: times.duha!, end: new Date(times.dhuhr.getTime() - 10 * 60000) },
        tahajjud: { start: times.tahajjud!, end: tomorrowResult.fajr },
        midnight: { start: times.midnight, end: tomorrowResult.fajr }
      };

      setPrayerTimes(times);
      setPrayerTimesWithEnd(withEnd);
      const finalLocation: LocationData = { ...locationData, timeZone };

      setLocation(finalLocation);
      saveLocation(finalLocation);
      setError(null);

      lastFetchSignatureRef.current = fetchSignature;


    } catch (error) {
      console.error('Failed to calculate prayer times:', error);
      setError('Failed to calculate prayer times. Please try again.');
    } finally {
      isCalculatingRef.current = false;
    }
  }, [saveLocation]);

  // Set manual location
  const setManualLocation = useCallback(async (city: string, country: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Use GeocodingService to get accurate coordinates
      const coords = await GeocodingService.getCityCoordinates(city, country);

      // Use Aladhan API to get accurate prayer times and timezone
      const { timezone } = await AladhanAPI.getTodaysPrayerTimes(
        coords.latitude,
        coords.longitude,
        getEffectiveAladhanMethodId(coords.latitude, coords.longitude),
        getMadhab() === 'hanafi' ? 1 : 0
      );

      const locationData: LocationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        city,
        country,
        locationName: `${city}, ${country}`,
        timeZone: timezone,
        source: 'manual'
      };

      saveLocation(locationData);

      await fetchPrayerTimesWithCoordinates(locationData);
      setNeedsManualLocation(false);
    } catch (error) {
      console.error('Failed to set manual location:', error);
      setError('Failed to set location. Please try a different city.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchPrayerTimesWithCoordinates, saveLocation]);

  // Main fetch function
  const fetchPrayerTimes = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      setNeedsManualLocation(false);

      // Check for user location first (highest priority)
      const userLocation = getUserLocation();
      if (userLocation) {
        saveLocation(userLocation);
        await fetchPrayerTimesWithCoordinates(userLocation);
        return;
      }

      // Reuse any fresh stored location before prompting for geolocation again.
      const storedLocation = getStoredLocation();
      if (storedLocation) {
        await fetchPrayerTimesWithCoordinates(storedLocation);
        return;
      }

      // Try Geolocation first (browser/native API)
      try {
        const geoPosition = await getLocationFromGeolocation();
        saveLocation(geoPosition);
        await fetchPrayerTimesWithCoordinates(geoPosition);
        return;
      } catch (geoError) {
        console.warn('Geolocation failed, falling back to offline default:', geoError);
      }

      // All auto-detection failed - use timezone-based fallback
      const defaultLocation = getDefaultLocation();
      saveLocation(defaultLocation);
      await fetchPrayerTimesWithCoordinates(defaultLocation);

    } catch (err) {
      console.error('All location methods failed:', err);
      // Don't show error - instead show manual location option
      setNeedsManualLocation(true);
      setError('Could not determine your location automatically. Please search for your city.');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [getUserLocation, getStoredLocation, getLocationFromGeolocation, getDefaultLocation, saveLocation, fetchPrayerTimesWithCoordinates]);

  // Initial fetch - only run once
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchPrayerTimes();
    }
  }, [fetchPrayerTimes]);

// Auto-refresh prayer times only when day changes (midnight boundary)
   // Prayer times only change once per day, so hourly refresh is wasteful
   useEffect(() => {
     if (!location || needsManualLocation) return;

     const checkDayChange = () => {
       const now = new Date();
       const hours = now.getHours();
       const minutes = now.getMinutes();
       // Only check around midnight (00:00-00:05) when day changes
       if (hours === 0 && minutes < 5) {
         if (!isFetchingRef.current && !isCalculatingRef.current) {
           fetchPrayerTimesWithCoordinates(location);
         }
       }
     };

     const interval = setInterval(checkDayChange, 60000); // Check every minute for day boundary
     checkDayChange(); // Initial check

     return () => clearInterval(interval);
   }, [location, needsManualLocation, fetchPrayerTimesWithCoordinates]);

  // Network listener - refresh as soon as we get internet (debounced)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleOnline = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (location) {
          fetchPrayerTimesWithCoordinates(location);
        } else {
          fetchPrayerTimes();
        }
      }, 2000);
    };

    window.addEventListener('online', handleOnline);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
    };
  }, [location, fetchPrayerTimes, fetchPrayerTimesWithCoordinates]);

  // Schedule notifications only when prayer times actually change (deep comparison)
  usePrayerNotifications(prayerTimes, location, previousNotificationSignatureRef);

  // Listen for prayer method changes
  useEffect(() => {
    const handleMethodChange = () => {
      // Reset cache key to force update
      // Reset both cache refs to force re-fetch and re-schedule after method change
      lastFetchSignatureRef.current = null;
      previousNotificationSignatureRef.current = null;
      if (location) {
        fetchPrayerTimesWithCoordinates(location);
      }
    };

    window.addEventListener('prayer-method-changed', handleMethodChange);
    return () => {
      window.removeEventListener('prayer-method-changed', handleMethodChange);
    };
  }, [location, fetchPrayerTimesWithCoordinates]);
  // Listen for madhab changes
  useEffect(() => {
    const handleMadhabChange = () => {
      // Reset cache key to force update
      // Reset both cache refs to force re-fetch and re-schedule after madhab change
      lastFetchSignatureRef.current = null;
      previousNotificationSignatureRef.current = null;
      if (location) {
        fetchPrayerTimesWithCoordinates(location);
      }
    };

    window.addEventListener('madhab-changed', handleMadhabChange);
    return () => {
      window.removeEventListener('madhab-changed', handleMadhabChange);
    };
  }, [location, fetchPrayerTimesWithCoordinates]);


  return useMemo(() => ({
    prayerTimes,
    prayerTimesWithEnd,
    location,
    isLoading,
    error,
    needsManualLocation,
    refresh: fetchPrayerTimes,
    setManualLocation
  }), [prayerTimes, prayerTimesWithEnd, location, isLoading, error, needsManualLocation, fetchPrayerTimes, setManualLocation]);
}
