/**
 * Global Location State Management
 * Centralized location handling with localStorage persistence
 */

import { useState, useCallback, useMemo } from 'react';
import { GeolocationService } from '@/lib/geolocation-service';
import { getFallbackLocationByTimezone, LOCATION_STORAGE_KEY } from '@/lib/location-config';

export { FALLBACK_LOCATIONS } from '@/lib/location-config';

export interface LocationState {
  latitude: number;
  longitude: number;
  locationName: string;
  isDetecting: boolean;
  timeZone?: string;
  lastUpdated: string;
  isIpBased?: boolean; // true if location was detected via IP fallback
}

const DEFAULT_LOCATION: LocationState = {
  latitude: 24.8607, // Karachi
  longitude: 67.0011, // Karachi
  locationName: 'Karachi, Pakistan',
  isDetecting: false,
  timeZone: 'Asia/Karachi',
  isIpBased: false,
  lastUpdated: new Date().toISOString()
};

// Load location from localStorage
const loadStoredLocation = (): LocationState => {
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_LOCATION,
        ...parsed,
        isDetecting: false // Reset detecting state on load
      };
    }
  } catch (error) {
    console.error('Failed to load location from storage:', error);
  }
  return DEFAULT_LOCATION;
};

// Save location to localStorage
const saveLocation = (location: LocationState): void => {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
      latitude: location.latitude,
      longitude: location.longitude,
      locationName: location.locationName,
      timeZone: location.timeZone,
      isIpBased: location.isIpBased,
      lastUpdated: location.lastUpdated,
      timestamp: location.lastUpdated,
      source: location.isIpBased ? 'ip' : 'stored'
    }));
  } catch (error) {
    console.error('Failed to save location to storage:', error);
  }
};

// Global location state hook
export const useLocationState = () => {
  const [location, setLocationState] = useState<LocationState>(loadStoredLocation);

  const setLocation = useCallback((lat: number, lng: number, name?: string, timeZone?: string) => {
    setLocationState(prev => {
      const newLocation: LocationState = {
        ...prev,
        latitude: lat,
        longitude: lng,
        locationName: name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        timeZone: timeZone || prev.timeZone,
        isIpBased: false,
        lastUpdated: new Date().toISOString()
      };
      saveLocation(newLocation);
      return newLocation;
    });
  }, []); // No dependency on location — uses functional setState

  const detectLocation = useCallback(async (): Promise<boolean> => {
    if (location.isDetecting) {
      return false;
    }

    setLocationState(prev => ({ ...prev, isDetecting: true }));

    try {
      // Use device geolocation first so we do not leak IP/location data to third-party services.
      if (!GeolocationService.isSupported()) {
        throw new Error('Geolocation not supported');
      }

      const position = await GeolocationService.getCurrentPosition({
        enableHighAccuracy: false, // Low accuracy avoids Google Network Provider in some browsers
        timeout: 5000,
        maximumAge: 300000
      });

      const { latitude, longitude } = position;

      // Get location name using reverse geocoding
      let locationName = 'Current Location';
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          {
            headers: { 'User-Agent': 'Noor-Connect-Islamic-App/1.0' },
            signal: AbortSignal.timeout(5000)
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.display_name) {
            locationName = data.display_name.split(',').slice(0, 2).join(', ');
          }
        }
      } catch {
        // Keep default name
      }

      const newLocation: LocationState = {
        latitude,
        longitude,
        locationName,
        isDetecting: false,
        isIpBased: false, // GPS-based location
        lastUpdated: new Date().toISOString()
      };

      setLocationState(newLocation);
      saveLocation(newLocation);
      return true;
    } catch (error) {
      console.warn('Geolocation detection failed, using local fallback:', error);

      try {
        const storedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (storedLocation) {
          const parsed = JSON.parse(storedLocation);
          if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
            const restoredLocation: LocationState = {
              ...DEFAULT_LOCATION,
              ...parsed,
              isDetecting: false
            };
            setLocationState(restoredLocation);
            saveLocation(restoredLocation);
            return true;
          }
        }
      } catch (storedError) {
        console.warn('Failed to reuse stored location:', storedError);
      }

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const fallbackLocation = getFallbackLocationByTimezone(userTimezone);

      if (fallbackLocation) {
        const newLocation: LocationState = {
          latitude: fallbackLocation.lat,
          longitude: fallbackLocation.lon,
          locationName: `${fallbackLocation.name} (Offline)`,
          timeZone: userTimezone,
          isDetecting: false,
          isIpBased: false,
          lastUpdated: new Date().toISOString()
        };

        setLocationState(newLocation);
        saveLocation(newLocation);
        return true;
      }

      setLocationState(prev => ({ ...prev, isDetecting: false }));
      return false;
    }
  }, [location.isDetecting]);

  const resetToDefault = useCallback(() => {
    const newLocation = { ...DEFAULT_LOCATION };
    setLocationState(newLocation);
    saveLocation(newLocation);
  }, []);

  return useMemo(() => ({
    ...location,
    setLocation,
    detectLocation,
    resetToDefault,
    coordinates: {
      lat: location.latitude,
      lng: location.longitude
    }
  }), [location, setLocation, detectLocation, resetToDefault]);
};
