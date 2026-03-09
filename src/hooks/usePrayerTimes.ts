/**
 * Prayer Times Hook using Aladhan API with Geolocation
 * Fetches prayer times from https://api.aladhan.com/v1/timings
 * Uses geolocation API with multiple fallbacks and manual search
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { calculatePrayerTimes, getCalculationMethod } from '@/lib/prayer-calculator';
import { GeocodingService } from '@/lib/geocoding';
import { AladhanAPI, ALADHAN_METHODS } from '@/lib/aladhan-api';
import { calculatePrayerEndTimes } from '@/lib/prayer-end-times';
import { formatPrayerTime } from '@/lib/time-formatter';
import { WidgetService } from '@/lib/widget-service';
import { GeolocationService } from '@/lib/geolocation-service';
import { WidgetPlugin } from '@/lib/widgetPlugin';
import { Capacitor } from '@capacitor/core';
import { getMenstrualModeData } from '@/lib/menstrual-mode';

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

const LOCATION_STORAGE_KEY = 'user-location-data';
const USER_LOCATION_KEY = 'user_location';

// Default fallback locations
const DEFAULT_LOCATIONS = [
  { city: 'Mecca', country: 'Saudi Arabia', latitude: 21.3891, longitude: 39.8579 },
  { city: 'Karachi', country: 'Pakistan', latitude: 24.8607, longitude: 67.0011 },
  { city: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357 },
  { city: 'Istanbul', country: 'Turkey', latitude: 41.0082, longitude: 28.9784 },
  { city: 'Jakarta', country: 'Indonesia', latitude: -6.2088, longitude: 106.8456 }
];

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

  // Track previous prayer times to prevent unnecessary notification scheduling
  const previousPrayerTimesRef = useRef<string | null>(null);

  // Parse time string to Date object (handles "HH:MM (TZ)" format from Aladhan API)
  const parseTimeToDate = useCallback((timeStr: string): Date => {
    const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
    const parts = cleaned.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const date = new Date();
    if (isNaN(hours) || isNaN(minutes)) {
      console.warn('parseTimeToDate: failed to parse:', timeStr);
      return date;
    }
    date.setHours(hours, minutes, 0, 0);
    return date;
  }, []);

  // Calculate end times based on API data
  const calculateEndTimes = useCallback((times: PrayerTimes): PrayerTimesWithEnd => {
    return {
      fajr: {
        start: times.fajr,
        end: times.sunrise // Fajr ends at sunrise
      },
      sunrise: {
        start: times.sunrise,
        end: times.dhuhr // Sunrise ends at Dhuhr
      },
      dhuhr: {
        start: times.dhuhr,
        end: times.asr // Dhuhr ends at Asr
      },
      asr: {
        start: times.asr,
        end: times.maghrib // Asr ends at Maghrib
      },
      maghrib: {
        start: times.maghrib,
        end: times.isha // Maghrib ends at Isha
      },
      isha: {
        start: times.isha,
        end: times.midnight // Isha ends at Midnight (recommended end)
      }
    };
  }, []);

  // Get location from IP-based service (CORS-safe alternative)
  const getLocationFromIP = useCallback(async (): Promise<LocationData> => {
    try {

      // Try multiple IP services with CORS-safe approach
      const ipServices = [
        {
          name: 'ip-api.com',
          url: 'http://ip-api.com/json/',
          parser: (data: { lat: number; lon: number; city: string; country: string }) => ({
            latitude: data.lat,
            longitude: data.lon,
            city: data.city,
            country: data.country
          })
        },
        {
          name: 'ipapi.co',
          url: 'https://ipapi.co/json/',
          parser: (data: { latitude: number; longitude: number; city: string; country_name: string }) => ({
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city,
            country: data.country_name
          })
        }
      ];

      for (const service of ipServices) {
        try {
            const response = await fetch(service.url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
          });

          if (!response.ok) {
            throw new Error(`${service.name} responded with ${response.status}`);
          }

          const data = await response.json();
          const locationData = service.parser(data);

          if (!locationData.latitude || !locationData.longitude) {
            throw new Error(`${service.name} did not return valid coordinates`);
          }

          const result: LocationData = {
            latitude: parseFloat(locationData.latitude.toString()),
            longitude: parseFloat(locationData.longitude.toString()),
            city: locationData.city,
            country: locationData.country,
            source: 'ip'
          };

          return result;
        } catch (error) {
          console.warn(`${service.name} failed:`, error);
          continue;
        }
      }

      throw new Error('All IP services failed');
    } catch (error) {
      console.error('Failed to get location from IP:', error);
      throw new Error('Could not determine your location automatically.');
    }
  }, []);

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
    const defaultLoc = DEFAULT_LOCATIONS.find((loc) => loc.city === 'Karachi') || DEFAULT_LOCATIONS[1] || DEFAULT_LOCATIONS[0];
    return {
      latitude: defaultLoc.latitude,
      longitude: defaultLoc.longitude,
      city: defaultLoc.city,
      country: defaultLoc.country,
      timeZone: 'Asia/Karachi',
      source: 'default'
    };
  }, []);

  // Get user location (manual set by user)
  const getUserLocation = useCallback((): LocationData | null => {
    try {
      const userLocation = localStorage.getItem(USER_LOCATION_KEY);
      if (userLocation) {
        const locationData = JSON.parse(userLocation);
          return locationData;
      }
    } catch (error) {
      console.warn('Failed to parse user location:', error);
    }
    return null;
  }, []);

  // Get stored location from localStorage
  const getStoredLocation = useCallback((): LocationData | null => {
    try {
      const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (stored) {
        const locationData = JSON.parse(stored);
        // Check if stored location is recent (less than 24 hours)
        const storedTime = new Date(locationData.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - storedTime.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 24) {
          return locationData;
        }
      }
    } catch (error) {
      console.warn('Failed to parse stored location:', error);
    }
    return null;
  }, []);

  // Save location to localStorage
  const saveLocation = useCallback((locationData: LocationData) => {
    try {
      const dataToStore = {
        ...locationData,
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

      // OPTIMIZATION: Check if we just calculated for this location recently (debounce)
      const locationKey = `${locationData.latitude.toFixed(4)},${locationData.longitude.toFixed(4)}`;
      const now = new Date();
      if (previousPrayerTimesRef.current === locationKey && prayerTimes) {
        // If we have data and the location is effectively the same, only recalculate if it's been > 1 hour
        // This prevents the "4x on load" issue if multiple components request data
        return;
      }

      isCalculatingRef.current = true;

      // Try to get times from API (handles caching and online refresh)
      // Get calculation method preference
      const methodName = getCalculationMethod();
      const methodId = ALADHAN_METHODS[methodName] || 3; // Default to MWL (3)

      let timings: any;
      let timeZone = locationData.timeZone;

      try {
        const result = await AladhanAPI.getTodaysPrayerTimes(
          locationData.latitude,
          locationData.longitude,
          methodId
        );
        timings = result.timings;
        timeZone = result.timezone;
      } catch (error) {
        console.warn('API fetch failed, using offline calculation');
        const offlineResult = calculatePrayerTimes(locationData.latitude, locationData.longitude, now);
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
      const parseTime = (timeStr: string) => {
        const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
        const parts = cleaned.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) {
          console.warn('Failed to parse time string:', timeStr);
          return new Date(now); // fallback to current time
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

      // Tomorrow's Fajr for Isha end time
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowResult = calculatePrayerTimes(locationData.latitude, locationData.longitude, tomorrow);

      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);

      const times: PrayerTimes = {
        ...prayerDates,
        midnight,
        imsak: new Date(prayerDates.fajr.getTime() - 10 * 60000),
        ishraq: new Date(prayerDates.sunrise.getTime() + 15 * 60000),
        duha: new Date(prayerDates.sunrise.getTime() + (prayerDates.dhuhr.getTime() - prayerDates.sunrise.getTime()) / 2),
        tahajjud: new Date(midnight.getTime() + (tomorrowResult.fajr.getTime() - midnight.getTime()) / 2),
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
      setError(null);

      // Update our "cache" key
      previousPrayerTimesRef.current = locationKey;

      // Update widget with next prayer
      if (Capacitor.isNativePlatform()) {
        // Find next prayer from current time
        const now = new Date();
        const prayers = [
          { name: 'Fajr', time: times.fajr },
          { name: 'Dhuhr', time: times.dhuhr },
          { name: 'Asr', time: times.asr },
          { name: 'Maghrib', time: times.maghrib },
          { name: 'Isha', time: times.isha }
        ];

        let nextPrayer = prayers[0]; // Default to first prayer
        for (const prayer of prayers) {
          if (prayer.time > now) {
            nextPrayer = prayer;
            break;
          }
        }

        const location = locationData.city || locationData.country || 'Unknown';

        WidgetPlugin.updateWidget({
          name: nextPrayer.name,
          time: formatPrayerTime(nextPrayer.time, '24'),
          remaining: 'Next prayer',
          location: location
        }).catch(error => {
        });
      }

    } catch (error) {
      console.error('Failed to calculate prayer times:', error);
      setError('Failed to calculate prayer times. Please try again.');
    } finally {
      isCalculatingRef.current = false;
    }
  }, [prayerTimes]); // keeping prayerTimes as dep to check against it

  // Set manual location
  const setManualLocation = useCallback(async (city: string, country: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Use GeocodingService to get accurate coordinates
      const coords = await GeocodingService.getCityCoordinates(city, country);

      // Use Aladhan API to get accurate prayer times and timezone
      const { timezone } = await AladhanAPI.getTodaysPrayerTimes(coords.latitude, coords.longitude);

      const locationData: LocationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        city,
        country,
        timeZone: timezone,
        source: 'manual'
      };

      // Save to user_location (persistent manual location)
      localStorage.setItem(USER_LOCATION_KEY, JSON.stringify(locationData));
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

      // Try to use browser built-in navigator.geolocation
      try {
        const geoPosition = await getLocationFromGeolocation();
        if (geoPosition) {
          saveLocation(geoPosition);
          await fetchPrayerTimesWithCoordinates(geoPosition);
          return;
        }
      } catch (geoError) {
        console.warn('Geolocation failed:', geoError);
      }

      // Try to use cached IP-based location (treated as part of IP detection)
      const storedLocation = getStoredLocation();
      if (storedLocation && storedLocation.source === 'ip') {
        await fetchPrayerTimesWithCoordinates(storedLocation);
        return;
      }

      // Try IP-based location (Karachi-first fallback path)
      try {
        const ipLocation = await getLocationFromIP();
        saveLocation(ipLocation);
        await fetchPrayerTimesWithCoordinates(ipLocation);
        return;
      } catch (ipError) {
        console.warn('IP location failed:', ipError);
      }

      // All auto-detection failed - use Karachi default
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
  }, [getUserLocation, getStoredLocation, getLocationFromGeolocation, getLocationFromIP, getDefaultLocation, saveLocation]); // Remove fetchPrayerTimesWithCoordinates dependency

  // Initial fetch - only run once
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchPrayerTimes();
    }
  }, []); // Remove fetchPrayerTimes dependency to prevent re-runs

  // Auto-refresh prayer times every minute when location is available
  useEffect(() => {
    if (!location || needsManualLocation) return;

    const interval = setInterval(() => {
      // Only fetch if not already fetching
      if (!isFetchingRef.current && !isCalculatingRef.current) {
        fetchPrayerTimesWithCoordinates(location);
      }
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [location?.latitude, location?.longitude, needsManualLocation]); // Use specific location properties

  // Network listener - refresh as soon as we get internet
  useEffect(() => {
    const handleOnline = () => {
      if (location) {
        fetchPrayerTimesWithCoordinates(location);
      } else {
        fetchPrayerTimes();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [location, fetchPrayerTimes, fetchPrayerTimesWithCoordinates]);

  // Schedule notifications only when prayer times actually change (deep comparison)
  useEffect(() => {
    if (!prayerTimes || !location) return;

    const menstrualMode = getMenstrualModeData();
    if (menstrualMode.isActive && menstrualMode.pausePrayerNotifications) {
      import('@/lib/local-notifications').then(({ localNotifications }) => {
        localNotifications.clearPrayerNotifications().catch((error) => {
          console.error('Failed to clear prayer notifications in Menstrual Mode:', error);
        });
      });
      return;
    }

    // Create comparison string using only time strings to prevent Date object changes
    const prayerTimesString = JSON.stringify({
      fajr: formatPrayerTime(prayerTimes.fajr, '24'),
      dhuhr: formatPrayerTime(prayerTimes.dhuhr, '24'),
      asr: formatPrayerTime(prayerTimes.asr, '24'),
      maghrib: formatPrayerTime(prayerTimes.maghrib, '24'),
      isha: formatPrayerTime(prayerTimes.isha, '24'),
      location: `${location.latitude},${location.longitude}`
    });

    // Only schedule if prayer times have actually changed
    if (previousPrayerTimesRef.current !== prayerTimesString) {
      previousPrayerTimesRef.current = prayerTimesString;

      // Throttle notification scheduling to prevent rapid calls
      const timeoutId = setTimeout(() => {
        import('@/lib/local-notifications').then(({ localNotifications }) => {
          localNotifications.schedulePrayerNotificationsFromAPI().catch((error) => {
            console.error('Failed to schedule prayer notifications:', error);
          });
        });
      }, 1000); // 1 second throttle

      return () => clearTimeout(timeoutId);
    }
  }, [
    prayerTimes?.fajr?.getTime(),
    prayerTimes?.dhuhr?.getTime(),
    prayerTimes?.asr?.getTime(),
    prayerTimes?.maghrib?.getTime(),
    prayerTimes?.isha?.getTime(),
    location?.latitude,
    location?.longitude
  ]); // Use timestamps for stable comparison

  // Listen for prayer method changes
  useEffect(() => {
    const handleMethodChange = () => {
      // Reset cache key to force update
      previousPrayerTimesRef.current = null;
      if (location) {
        fetchPrayerTimesWithCoordinates(location);
      }
    };

    window.addEventListener('prayer-method-changed', handleMethodChange);
    return () => {
      window.removeEventListener('prayer-method-changed', handleMethodChange);
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
