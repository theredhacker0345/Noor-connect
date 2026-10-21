import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FALLBACK_LOCATIONS } from '@/lib/location-state';
import { LOCATION_STORAGE_KEY } from '@/lib/location-config';
import { Compass, Loader2, LocateFixed, RefreshCw, Navigation, MapPin } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { GeolocationService, type LocationCoordinates } from '@/lib/geolocation-service';
import { Capacitor } from '@capacitor/core';
import { nativeQiblaService } from '@/lib/native-qibla-service';
import {
  calculateDistanceToKaabaKm,
  calculateQiblaBearingMagnetic,
  calculateQibla,
  getCardinalDirection,
  normalizeDegrees,
  shortestSignedAngle,
  isFacingQibla,
  getRotationInstruction,
  detectOrientationSensor,
  type QiblaResult,
} from '@/lib/qibla';
import { useI18n } from '@/hooks/useI18n';
import { Trans } from 'react-i18next';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useSettings } from '@/contexts/SettingsContext';
import { rafThrottle } from '@/lib/performance-optimizations';

// ─── Types ────────────────────────────────────────────────────
type CompassState =
  | 'idle'
  | 'activating'
  | 'active'
  | 'permission-required'
  | 'denied'
  | 'unsupported'
  | 'no-data';

type DeviceOrientationConstructorWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<string>;
};

function getFallbackLocationByTimezone(timezone: string) {
  // Return matching city or default to Mecca
  return FALLBACK_LOCATIONS[timezone as keyof typeof FALLBACK_LOCATIONS] ||
    { name: 'Mecca', lat: 21.4225, lon: 39.8262 };
}

// ─── Instant boot location ────────────────────────────────────────
// Best instantly-available location so the compass renders on the very
// first paint — no waiting for a GPS fix. Prefers the stored location
// (saved by the app's dashboard detection), falls back to a timezone
// approximation, then a sensible default.
function loadInitialLocation(): { coords: LocationCoordinates; name: string } {
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        typeof parsed.latitude === 'number' &&
        typeof parsed.longitude === 'number' &&
        Number.isFinite(parsed.latitude) &&
        Number.isFinite(parsed.longitude) &&
        parsed.latitude >= -90 && parsed.latitude <= 90 &&
        parsed.longitude >= -180 && parsed.longitude <= 180
      ) {
        return {
          coords: { latitude: parsed.latitude, longitude: parsed.longitude, accuracy: 1000 },
          name: typeof parsed.locationName === 'string' && parsed.locationName ? parsed.locationName : '',
        };
      }
    }
  } catch (error) {
    console.warn('Qibla: failed to read stored location:', error);
  }

  const fallback = getFallbackLocationByTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  return {
    coords: { latitude: fallback.lat, longitude: fallback.lon, accuracy: 1000 },
    name: `${fallback.name} (Offline)`,
  };
}

// ─── Constants ────────────────────────────────────────────────
const ALIGNMENT_THRESHOLD_DEG = 8;
const HEADING_SMOOTHING = 0.12;
const SENSOR_TIMEOUT_MS = 8000;
const LS_CALIBRATION_SHOWN = 'qibla-calibration-shown-v2';

// ─── Colors ───────────────────────────────────────────────────
const THEME = {
  primary: '#C9860A',
  primaryLight: '#E8A020',
  accent: '#C9860A',
  accentLight: '#E8A020',
  cream: '#F2EDE4',
  creamDark: '#EDE6D8',
  white: '#ffffff',
  offWhite: '#1a1a1a',
  warmWhite: '#111111',
  text: '#ffffff',
  textLight: '#e5e5e5',
  textMuted: '#a3a3a3',
  success: '#10B981',
  dark: '#0a0a0a',
  darker: '#000000',
  surface: '#141414',
  surfaceLight: '#1f1f1f',
  border: '#2a2a2a',        // ← was missing, caused `undefined` in border styles
};

// Tick marks every 5 degrees
const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);

// ─── Kaaba SVG Icon ─────────────────────────────────────────────
const KaabaIcon = ({ size = 40 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Base */}
    <rect x="6" y="16" width="36" height="28" rx="2" fill={THEME.surface} stroke={THEME.accent} strokeWidth="2" />
    {/* Roof */}
    <path d="M6 16 L24 6 L42 16" fill={THEME.darker} stroke={THEME.accent} strokeWidth="2" strokeLinejoin="round" />
    {/* Door */}
    <rect x="17" y="26" width="14" height="18" rx="1" fill={THEME.accent} opacity="0.9" />
    {/* Kiswa bands */}
    <line x1="6" y1="24" x2="42" y2="24" stroke={THEME.accent} strokeWidth="1.5" opacity="0.6" />
    <line x1="6" y1="32" x2="42" y2="32" stroke={THEME.accent} strokeWidth="1" opacity="0.4" />
    {/* Golden thread detail */}
    <rect x="23" y="26" width="2" height="18" fill={THEME.accentLight} opacity="0.8" />
  </svg>
);

// ─── Decorative Ornament ─────────────────────────────────────────
const IslamicOrnament = () => (
  <svg width="120" height="24" viewBox="0 0 120 24" fill="none" className="opacity-30">
    <path d="M60 2 L60 22" stroke={THEME.accent} strokeWidth="1" />
    <circle cx="60" cy="12" r="4" stroke={THEME.accent} strokeWidth="1" fill="none" />
    <path d="M20 12 Q40 2 60 12 Q80 22 100 12" stroke={THEME.accent} strokeWidth="1" fill="none" />
    <circle cx="20" cy="12" r="2" fill={THEME.accent} />
    <circle cx="100" cy="12" r="2" fill={THEME.accent} />
  </svg>
);

// ─── Component ────────────────────────────────────────────────
const QiblaCompassModern = () => {
  const { t: ti18n } = useI18n();
  const { effectiveTheme } = useSettings();
  const isDark = effectiveTheme === 'dark';

  // ── Location State ───────────────────────────────────────────
  const [bootLocation] = useState(loadInitialLocation);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationCoordinates | null>(bootLocation.coords);
  const [qiblaResult, setQiblaResult] = useState<QiblaResult | null>(
    () => calculateQibla(bootLocation.coords.latitude, bootLocation.coords.longitude)
  );
  const [cityName, setCityName] = useState<string>(bootLocation.name);

  // ── Compass State ────────────────────────────────────────────
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [compassState, setCompassState] = useState<CompassState>('idle');
  const [showCalibrationHint, setShowCalibrationHint] = useState(false);
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [alignmentState, setAlignment] = useState<{
    isAligned: boolean;
    instruction: { direction: 'left' | 'right'; degrees: number };
    isDeviceFlat: boolean;
    magneticInterference: boolean;
  } | null>(null);

  // ── Refs ─────────────────────────────────────────────────────
  const locationRef = useRef<LocationCoordinates | null>(bootLocation.coords);
  const cityNameRef = useRef(bootLocation.name);
  const isMountedRef = useRef(true);
  const orientationListenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const sensorTimeoutRef = useRef<number | null>(null);
  const hasSensorEventRef = useRef(false);
  const smoothedHeadingRef = useRef<number | null>(null);
  const calibrationShownRef = useRef(false);
  const hapticFiredRef = useRef(false);
  const nativeCompassUnsubscribeRef = useRef<(() => void) | null>(null);
  const motionListenerRef = useRef<{ remove: () => void } | null>(null);
  const distanceUpdateIntervalRef = useRef<number | null>(null);

  // ── Error Handler ───────────────────────────────────────────
  const handleSensorError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Sensor error';
    console.error('QiblaCompass sensor error:', msg);
    setSensorError(msg);
    setCompassState('unsupported');
  }, []);

  // ── Stop Tracking ───────────────────────────────────────────
  const maybeShowCalibrationHint = useCallback(() => {
    // Check if we should show calibration hint (periodically, not just once)
    const lastShown = localStorage.getItem(LS_CALIBRATION_SHOWN);
    const now = Date.now();
    
    // Show if never shown, or if last shown was more than 7 days ago
    if (!lastShown || (now - parseInt(lastShown)) > 7 * 24 * 60 * 60 * 1000) {
      calibrationShownRef.current = true;
      setShowCalibrationHint(true);
      localStorage.setItem(LS_CALIBRATION_SHOWN, now.toString());
      window.setTimeout(() => setShowCalibrationHint(false), 5000);
    }
  }, []);

  const requestManualCalibration = useCallback(() => {
    // Force show calibration hint when user requests it
    setShowCalibrationHint(true);
    window.setTimeout(() => setShowCalibrationHint(false), 5000);
  }, []);

  const applyLocationData = useCallback((nextLocation: LocationCoordinates, nextCityName?: string) => {
    const resolvedCityName = nextCityName ?? cityNameRef.current;
    
    locationRef.current = nextLocation;
    cityNameRef.current = resolvedCityName;

    setLocation(nextLocation);
    setCityName(resolvedCityName);
    
    // Set synchronous first (uses cached or WMM-lite declination)
    setQiblaResult(calculateQibla(nextLocation.latitude, nextLocation.longitude));

    // Advanced Mechanics: Calculate and apply precise magnetic declination via BGS API for high accuracy
    calculateQiblaBearingMagnetic(nextLocation.latitude, nextLocation.longitude)
      .then((magneticBearing) => {
        setQiblaResult(prev => prev ? {
          ...prev,
          bearing: magneticBearing,
          cardinalDirection: getCardinalDirection(magneticBearing),
          formattedBearing: `${Math.round(magneticBearing)}°`,
        } : null);
      })
      .catch(console.warn);
  }, []);

  const applyFallbackLocation = useCallback((reason?: string) => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fallbackLocation = getFallbackLocationByTimezone(userTimezone);

    if (distanceUpdateIntervalRef.current !== null) {
      window.clearInterval(distanceUpdateIntervalRef.current);
      distanceUpdateIntervalRef.current = null;
    }

    applyLocationData(
      {
        latitude: fallbackLocation.lat,
        longitude: fallbackLocation.lon,
        accuracy: 1000,
      },
      `${fallbackLocation.name} (Offline)`
    );

    setLocationError(reason ?? 'Using an approximate Qibla direction for your timezone.');
  }, [applyLocationData]);

  const stopDistanceTracking = useCallback(() => {
    if (distanceUpdateIntervalRef.current !== null) {
      window.clearInterval(distanceUpdateIntervalRef.current);
      distanceUpdateIntervalRef.current = null;
    }
  }, []);

  const stopCompassTracking = useCallback(() => {
    if (orientationListenerRef.current) {
      window.removeEventListener('deviceorientationabsolute', orientationListenerRef.current, true);
      window.removeEventListener('deviceorientation', orientationListenerRef.current, true);
      orientationListenerRef.current = null;
    }
    if (sensorTimeoutRef.current !== null) {
      window.clearTimeout(sensorTimeoutRef.current);
      sensorTimeoutRef.current = null;
    }
    if (motionListenerRef.current) {
      motionListenerRef.current.remove();
      motionListenerRef.current = null;
    }
    if (nativeCompassUnsubscribeRef.current) {
      nativeCompassUnsubscribeRef.current();
      nativeCompassUnsubscribeRef.current = null;
    }
    if (Capacitor.isNativePlatform()) {
      void nativeQiblaService.stopCompass();
    }
    hasSensorEventRef.current = false;
    smoothedHeadingRef.current = null;
    setDeviceHeading(null);
  }, []);

// ── Continuous Distance Updates ─────────────────────────────
   const startDistanceTracking = useCallback(() => {
     stopDistanceTracking();

     // Update distance every 30 seconds (reduced from 3s to minimize geolocation calls)
     // GPS only, no API calls - distance is calculated locally
     distanceUpdateIntervalRef.current = window.setInterval(async () => {
       const currentLocation = locationRef.current;
       if (!currentLocation) return;

       // Don't update GPS if we're using offline fallback
       if (cityNameRef.current.includes('(Offline)')) return;

       try {
         // Get fresh location with high accuracy but allow cached results (30 seconds old to reduce geolocation calls)
         const freshPosition = await GeolocationService.getCurrentPosition({
           enableHighAccuracy: true,
           timeout: 5000,
           maximumAge: 30000 // Increased from 5s to 30s to reduce geolocation calls
         });

         // Only update if position changed significantly (more than 50 meters instead of 10m)
         const distanceMoved = calculateDistanceToKaabaKm(
           freshPosition.latitude,
           freshPosition.longitude
         ) - calculateDistanceToKaabaKm(currentLocation.latitude, currentLocation.longitude);

         if (Math.abs(distanceMoved) > 0.05) { // Changed from 0.01km (10m) to 0.05km (50m) threshold
           applyLocationData(freshPosition, cityNameRef.current);
         }
       } catch (error) {
         // Silent fail for continuous updates - don't show errors to user
         console.warn('Continuous location update failed:', error);
       }
     }, 30000); // Changed from 3s to 30s interval to reduce geolocation calls
   }, [applyLocationData, stopDistanceTracking]);

  // ── Read Heading from Event ───────────────────────────────────
  const readHeadingFromEvent = useCallback((event: DeviceOrientationEvent): number | null => {
    const e = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
      return normalizeDegrees(e.webkitCompassHeading);
    }
    if (event.alpha !== null && typeof event.alpha === 'number' && !Number.isNaN(event.alpha)) {
      return normalizeDegrees(360 - event.alpha);
    }
    return null;
  }, []);

  // ── Attach Compass Tracking ───────────────────────────────────
  const attachWebCompassTracking = useCallback(() => {
    try {
      stopCompassTracking();
      setCompassState('activating');
      setSensorError(null);

      // FIX: Track whether absolute orientation has fired to avoid double-processing
      let absoluteFired = false;

      // Inner processor — does the smoothing + setState work.
      const processEvent = (event: DeviceOrientationEvent) => {
        try {
          // Skip deviceorientation if deviceorientationabsolute already provides data
          if (event.type === 'deviceorientation' && absoluteFired) return;
          if (event.type === 'deviceorientationabsolute') absoluteFired = true;

          const rawHeading = readHeadingFromEvent(event);
          if (rawHeading === null) return;

          hasSensorEventRef.current = true;
          const prev = smoothedHeadingRef.current;
          const next =
            prev === null
              ? rawHeading
              : normalizeDegrees(prev + shortestSignedAngle(prev, rawHeading) * HEADING_SMOOTHING);

          smoothedHeadingRef.current = next;
          setDeviceHeading(next);
          setCompassState('active');
          maybeShowCalibrationHint();
        } catch (err) {
          handleSensorError(err);
        }
      };

      //
      // THROTTLE: rafThrottle caps invocation to the next animation frame
      // (~30–60 Hz depending on device tier).  The deviceorientation APIs
      // can fire at 60 Hz on high-end phones but React can only render a
      // new compass rotation at VSYNC anyway; passing every sample through
      // was generating excess re-renders and unnecessary smoothing work,
      // which would drop the Qibla page to ~26 FPS on mid-tier devices.
      //
      const listener: (event: DeviceOrientationEvent) => void = rafThrottle(processEvent);

      orientationListenerRef.current = listener;
      window.addEventListener('deviceorientationabsolute', listener, true);
      window.addEventListener('deviceorientation', listener, true);

      // Capacitor Motion fallback
      try {
        import('@capacitor/motion')
          .then(({ Motion }) => {
            Motion.addListener('orientation', (evt) => {
              try {
                if (hasSensorEventRef.current) return;
                const alpha = (evt as unknown as { alpha: number }).alpha;
                if (typeof alpha === 'number' && !Number.isNaN(alpha)) {
                  const rawHeading = normalizeDegrees(360 - alpha);
                  hasSensorEventRef.current = true;
                  const prev = smoothedHeadingRef.current;
                  const next =
                    prev === null
                      ? rawHeading
                      : normalizeDegrees(prev + shortestSignedAngle(prev, rawHeading) * HEADING_SMOOTHING);
                  smoothedHeadingRef.current = next;
                  setDeviceHeading(next);
                  setCompassState('active');
                }
              } catch (e) { console.error(e); }
            }).then((listener) => {
              motionListenerRef.current = listener;
            }).catch((e) => { console.error(e); });
          })
          .catch((e) => { console.error(e); });
      } catch (e) { console.error(e); }

      sensorTimeoutRef.current = window.setTimeout(() => {
        if (!hasSensorEventRef.current) {
          stopCompassTracking();
          setCompassState('no-data');
        }
      }, SENSOR_TIMEOUT_MS);
    } catch (err) {
      handleSensorError(err);
    }
  }, [handleSensorError, maybeShowCalibrationHint, readHeadingFromEvent, stopCompassTracking]);

  const attachNativeCompassTracking = useCallback(async () => {
    stopCompassTracking();
    setCompassState('activating');
    setSensorError(null);

    try {
      nativeCompassUnsubscribeRef.current = nativeQiblaService.onQiblaDirectionChange((data) => {
        try {
          if (typeof data.compassAngle !== 'number' || Number.isNaN(data.compassAngle)) {
            return;
          }

          hasSensorEventRef.current = true;
          setDeviceHeading(normalizeDegrees(data.compassAngle));
          setCompassState('active');
          maybeShowCalibrationHint();
          
          // Update alignment state with device orientation and magnetic interference
          // FIX: was `setAlignmentState` (ReferenceError) — correct name is `setAlignment`
          if (data.isDeviceFlat !== undefined || data.magneticInterference !== undefined) {
            setAlignment(prev => {
              const currentHeading = data.compassAngle;
              const currentBearing = qiblaResult?.bearing || 0;
              return prev ? {
                ...prev,
                isDeviceFlat: data.isDeviceFlat ?? prev.isDeviceFlat,
                magneticInterference: data.magneticInterference ?? prev.magneticInterference,
              } : {
                isAligned: isFacingQibla(currentHeading, currentBearing, ALIGNMENT_THRESHOLD_DEG),
                instruction: getRotationInstruction(currentHeading, currentBearing),
                isDeviceFlat: data.isDeviceFlat ?? true,
                magneticInterference: data.magneticInterference ?? false,
              };
            });
          }
        } catch (err) {
          handleSensorError(err);
        }
      });

      const result = await nativeQiblaService.startCompass();
      if (!result.success) {
        throw new Error(result.message);
      }

      sensorTimeoutRef.current = window.setTimeout(() => {
        if (!hasSensorEventRef.current) {
          stopCompassTracking();
          setCompassState('no-data');
        }
      }, SENSOR_TIMEOUT_MS);
    } catch (err) {
      console.warn('Native Qibla compass unavailable, falling back to web sensors:', err);
      if (nativeCompassUnsubscribeRef.current) {
        nativeCompassUnsubscribeRef.current();
        nativeCompassUnsubscribeRef.current = null;
      }
      attachWebCompassTracking();
    }
  }, [attachWebCompassTracking, handleSensorError, maybeShowCalibrationHint, stopCompassTracking]);

  const attachCompassTracking = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      void attachNativeCompassTracking();
      return;
    }

    attachWebCompassTracking();
  }, [attachNativeCompassTracking, attachWebCompassTracking]);

  // ── Detect Compass Availability ───────────────────────────────
  const detectCompassAvailability = useCallback(() => {
    try {
      if (Capacitor.isNativePlatform()) {
        attachCompassTracking();
        return;
      }
      if (typeof window === 'undefined' || typeof window.DeviceOrientationEvent === 'undefined') {
        setCompassState('unsupported');
        return;
      }
      const ctor = window.DeviceOrientationEvent as DeviceOrientationConstructorWithPermission;
      if (typeof ctor.requestPermission === 'function') {
        setCompassState('permission-required');
        return;
      }
      attachCompassTracking();
    } catch (err) {
      handleSensorError(err);
    }
  }, [attachCompassTracking, handleSensorError]);

  // ── Enable Compass (with permission) ──────────────────────────
  const enableCompass = useCallback(async () => {
    try {
      setSensorError(null);
      if (Capacitor.isNativePlatform()) {
        attachCompassTracking();
        return;
      }
      if (typeof window === 'undefined' || typeof window.DeviceOrientationEvent === 'undefined') {
        setCompassState('unsupported');
        return;
      }
      const ctor = window.DeviceOrientationEvent as DeviceOrientationConstructorWithPermission;
      if (typeof ctor.requestPermission === 'function') {
        setCompassState('activating');
        try {
          const result = await ctor.requestPermission();
          if (result !== 'granted') {
            setCompassState('denied');
            return;
          }
        } catch {
          setCompassState('permission-required');
          return;
        }
      }
      attachCompassTracking();
    } catch (err) {
      handleSensorError(err);
    }
  }, [attachCompassTracking, handleSensorError]);

  // ── Refresh Location ───────────────────────────────────────────
  const refreshLocation = useCallback(async (mode: 'initial' | 'manual' = 'manual') => {
    if (mode === "initial") setIsLoadingLocation(true); else setIsRefreshingLocation(true);
    setLocationError(null);
    stopDistanceTracking();

    // Check location permissions first on web
    if (!Capacitor.isNativePlatform() && navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'denied') {
          if (cityNameRef.current.includes('(Offline)')) {
            // No usable location at all → timezone approximation
            applyFallbackLocation('Location access denied. Showing an approximate Qibla based on your timezone.');
          } else if (mode === 'manual') {
            // GPS failed but a saved location exists — keep it
            setLocationError('Location permission denied. Showing the saved location.');
          }
          setIsLoadingLocation(false);
          setIsRefreshingLocation(false);
          return;
        }
      } catch (err) {
        console.warn('Permission check failed, proceeding anyway:', err);
      }
    }

    // Fast path: low-accuracy fix that can reuse a recent cached position
    // (returns near-instantly when a fix exists), so the compass updates
    // without waiting for a fresh satellite lock.
    let position: LocationCoordinates | null = null;
    try {
      position = await GeolocationService.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000,
      });
    } catch {
      // fall through to the high-accuracy path
    }

    // Slow path: fresh high-accuracy GPS fix
    if (!position) {
      try {
        position = await GeolocationService.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      } catch {
        position = null;
      }
    }

    if (!isMountedRef.current) return;

    if (position) {
      // Drop any stale "(Offline)" marker now that GPS is live
      const resolvedName = cityNameRef.current.replace(/\s*\(Offline\)\s*$/, '');
      applyLocationData(position, resolvedName);
      // Start continuous distance tracking
      startDistanceTracking();
    } else if (cityNameRef.current.includes('(Offline)')) {
      // No usable location at all → timezone approximation
      applyFallbackLocation('Location unavailable. Showing an approximate Qibla for your timezone.');
    } else if (mode === 'manual') {
      // GPS failed but we already have a saved location — keep it
      setLocationError('Could not refresh location. Showing the saved location.');
    }

    setIsLoadingLocation(false);
    setIsRefreshingLocation(false);
  }, [applyFallbackLocation, applyLocationData, startDistanceTracking, stopDistanceTracking]);

  // ── Initialize: render instantly, then refine location & compass ──
  useEffect(() => {
    isMountedRef.current = true;

    // The stored/timezone location is already applied synchronously by the
    // state initializers, so the compass renders on the first paint. Refine
    // its magnetic bearing right away (async BGS declination lookup).
    if (locationRef.current) {
      applyLocationData(locationRef.current, cityNameRef.current);
    }

    // Upgrade the fix in the background (cached → GPS) without blocking the UI.
    void refreshLocation('initial');

    // Fast sensor sniff (~300ms) — sets state immediately instead of waiting 8s
    detectOrientationSensor().then((result) => {
      if (!isMountedRef.current) return;
      if (result === 'unsupported') {
        setCompassState('unsupported');
      } else if (result === 'permission-required') {
        setCompassState('permission-required');
      } else {
        detectCompassAvailability();
      }
    });

    return () => {
      isMountedRef.current = false;
      stopCompassTracking();
      stopDistanceTracking();
    };
  }, [applyLocationData, detectCompassAvailability, refreshLocation, stopCompassTracking, stopDistanceTracking]);

  // ── Derived Values ─────────────────────────────────────────────
  const alignment = useMemo(() => {
    if (deviceHeading === null || qiblaResult === null) return null;
    return {
      isAligned: isFacingQibla(deviceHeading, qiblaResult.bearing, ALIGNMENT_THRESHOLD_DEG),
      instruction: getRotationInstruction(deviceHeading, qiblaResult.bearing),
      isDeviceFlat: alignmentState?.isDeviceFlat ?? true,
      magneticInterference: alignmentState?.magneticInterference ?? false,
    };
  }, [deviceHeading, qiblaResult, alignmentState]);

  const isLiveCompass = compassState === 'active' && deviceHeading !== null;
  const compassUnavailable = compassState === 'unsupported' || compassState === 'no-data';

  // ── Haptic Feedback on Alignment ─────────────────────────────
  useEffect(() => {
    if (deviceHeading === null || qiblaResult === null) return;

    const deviation = Math.abs(shortestSignedAngle(deviceHeading, qiblaResult.bearing));

    // Strong haptic when perfectly aligned
    if (alignment?.isAligned && !hapticFiredRef.current) {
      hapticFiredRef.current = true;
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    }
    // Gentle haptic when getting close (within 15 degrees)
    else if (deviation <= 15 && deviation > 8 && !hapticFiredRef.current) {
      if ('vibrate' in navigator) navigator.vibrate(30);
    }
    // Reset when moving away from alignment
    else if (!alignment?.isAligned) {
      hapticFiredRef.current = false;
    }
  }, [alignment?.isAligned, deviceHeading, qiblaResult]);

  // ── Dial & Needle Rotation ────────────────────────────────────
  // In 'Locked Needle' mode, the arrow always points straight UP (0deg).
  // The background dial rotates relative to the device heading AND the Qibla bearing.
  const dialRotation = deviceHeading === null
    ? 0
    : -deviceHeading + (qiblaResult?.bearing || 0);

  const needleRotation = 0;

  // ── Loading State ─────────────────────────────────────────────
  if (isLoadingLocation && !location) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-0 gap-6 bg-background">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-muted border-t-[#C9860A] animate-spin" />
          <Compass className="absolute inset-0 m-auto h-8 w-8 text-[#C9860A]" />
        </div>
        <p className="text-muted-foreground text-sm tracking-[0.2em] uppercase font-bold">Locating...</p>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────
  if (!location || !qiblaResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-0 gap-6 px-6 text-center bg-background">
        <div className="w-20 h-20 rounded-full bg-card border flex items-center justify-center border-border">
          <Compass className="h-10 w-10 text-[#C9860A]" />
        </div>
        <div>
          <p className="text-foreground font-bold text-lg mb-2">Location Unavailable</p>
          <p className="text-muted-foreground text-sm font-medium">{locationError ?? 'Please allow location access and try again.'}</p>
        </div>
        <button
          onClick={() => void refreshLocation('manual')}
          disabled={isRefreshingLocation}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #C9860A, #E8A020)', boxShadow: '0 8px 20px rgba(201,134,10,0.3)' }}
        >
          {isRefreshingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Try Again
        </button>
      </div>
    );
  }

  // ── Main Render ───────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 relative overflow-hidden bg-background text-foreground">
      {/* ── Background Pattern ───────────────────────────────────── */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, ${THEME.accent} 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Gradient Orbs - warm gold tones */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${isDark ? THEME.creamDark : '#fff8e7'} 0%, transparent 70%)`, filter: 'blur(60px)' }} />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${THEME.accentLight} 0%, transparent 70%)`, filter: 'blur(50px)' }} />

      {/* ── Header Section ────────────────────────────────────────── */}
      <div className="relative z-10 px-6 pt-8 pb-4">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <IslamicOrnament />
          </div>
          <p className="text-[#C9860A] text-xs tracking-[0.25em] uppercase font-bold">Qibla Direction</p>

          {/* Large Bearing Display */}
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-6xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'inherit', fontStyle: 'italic' }}>
              {Math.round(qiblaResult.bearing)}°
            </span>
            <span className="text-2xl font-bold text-[#C9860A]">
              {qiblaResult.cardinalDirection}
            </span>
          </div>

          {/* Location Info */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <MapPin className="h-3.5 w-3.5" />
            {cityName ? (
              <span>{cityName}</span>
            ) : location ? (
              <span>{location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°</span>
            ) : (
              <span>Location unknown</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Calibration Hint ── */}
      {showCalibrationHint && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full text-xs font-bold bg-card border border-border text-foreground/80 animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg whitespace-nowrap">
          📱 Move in figure-8 pattern for accuracy
        </div>
      )}

      {/* ── Device Orientation Warning ────────────────────────────── */}
      {alignment && !alignment.isDeviceFlat && isLiveCompass && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full text-xs font-medium bg-amber-500/20 border border-amber-500/40 text-amber-200 animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg whitespace-nowrap">
          📱 Keep phone flat for accuracy
        </div>
      )}

      {/* ── Magnetic Interference Warning ──────────────────────────── */}
      {alignment && alignment.magneticInterference && isLiveCompass && (
        <div className="absolute top-44 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full text-xs font-medium bg-red-500/20 border border-red-500/40 text-red-200 animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg whitespace-nowrap">
          ⚠️ Move away from metal objects
        </div>
      )}

      {/* ── Compass Section ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center relative z-10 py-4">
        <div className="relative" style={{ width: 'min(85vw, 380px)', height: 'min(85vw, 380px)' }}>

          {/* Outer Glow Ring */}
          <div
            className="absolute inset-0 rounded-full transition-all duration-500"
            style={{
              background: alignment?.isAligned
                ? `radial-gradient(circle, ${THEME.primary}20 0%, transparent 70%)`
                : `radial-gradient(circle, ${THEME.accent}10 0%, transparent 70%)`,
            }}
          />

          {/* Main Compass Ring */}
          <div
            className="absolute inset-2 rounded-full transition-shadow duration-500"
            style={{
              background: isDark 
                ? `linear-gradient(145deg, ${THEME.surface} 0%, ${THEME.dark} 100%)`
                : `linear-gradient(145deg, #ffffff 0%, #f4f4f5 100%)`,
              boxShadow: alignment?.isAligned && isLiveCompass
                ? `0 0 0 3px ${THEME.primary}, 0 0 60px ${THEME.primary}40, inset 0 0 40px rgba(0,0,0,${isDark ? '0.4' : '0.1'})`
                : isDark 
                  ? `0 0 0 2px ${THEME.accent}30, 0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)`
                  : `0 0 0 2px ${THEME.accent}30, 0 20px 40px -12px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.8)`,
            }}
          >
            {/* Inner Ring Decoration */}
            <div
              className="absolute inset-4 rounded-full border border-slate-600/10"
              style={{ background: `radial-gradient(circle at 30% 30%, ${isDark ? THEME.surfaceLight : '#000000'}05 0%, transparent 50%)` }}
            />

            {/* Rotating Dial */}
            <div
              className="absolute inset-6 rounded-full"
              style={{
                transform: `rotate(${dialRotation}deg)`,
                willChange: 'transform',
                // JS smoothing (HEADING_SMOOTHING / smoothingFactor) already handles jitter.
                // CSS transitions here cause rubber-banding/lag on legacy Android devices.
                transition: 'none',
              }}
            >
              {/* Degree Numbers */}
              {[0, 90, 180, 270].map((deg) => (
                <div
                  key={deg}
                  className="absolute inset-0 flex items-start justify-center"
                  style={{ transform: `rotate(${deg}deg)` }}
                >
                  <span
                    className="text-xs font-bold mt-3"
                    style={{ color: deg === 0 ? THEME.accent : isDark ? THEME.textMuted : '#71717a' }}
                  >
                    {deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : 'W'}
                  </span>
                </div>
              ))}

              {/* Tick Marks */}
              {TICKS.map((angle) => {
                const isCardinal = angle % 90 === 0;
                const isMajor = angle % 30 === 0;
                const colorMuted = isDark ? THEME.textMuted : '#a1a1aa';
                return (
                  <div
                    key={angle}
                    className="absolute left-1/2 top-0 h-full -translate-x-1/2"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width: isCardinal ? '3px' : isMajor ? '2px' : '1px',
                        height: isCardinal ? '18px' : isMajor ? '10px' : '6px',
                        background: isCardinal ? THEME.accent : isMajor ? colorMuted : `${colorMuted}40`,
                        marginTop: isCardinal ? '2px' : '8px',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Qibla Arrow Container */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Arrow (rotates to qibla bearing) */}
              <div
                style={{
                  transform: `rotate(${needleRotation}deg)`,
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Arrow Head */}
                <div className="relative">
                  <svg width="24" height="140" viewBox="0 0 24 140" className="overflow-visible">
                    {/* Arrow pointer */}
                    <polygon points="12,2 4,28 20,28" fill={alignment?.isAligned ? THEME.primary : THEME.accent} />
                    {/* Arrow shaft */}
                    <rect x="10" y="26" width="4" height="80" rx="2" fill={alignment?.isAligned ? THEME.primary : THEME.accent} opacity="0.9" />
                    {/* Tail indicator */}
                    <rect x="10" y="108" width="4" height="24" rx="2" fill={isDark ? THEME.textMuted : '#a1a1aa'} opacity="0.3" />
                  </svg>

                  {/* Glow effect when aligned */}
                  {alignment?.isAligned && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-24 rounded-full animate-pulse"
                      style={{ background: `linear-gradient(to bottom, ${THEME.primary}60, transparent)`, filter: 'blur(8px)' }} />
                  )}
                </div>
              </div>
            </div>

            {/* Center Kaaba Icon */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: isDark 
                    ? `linear-gradient(145deg, ${THEME.surface}, ${THEME.dark})`
                    : `linear-gradient(145deg, #ffffff, #f4f4f5)`,
                  boxShadow: isDark 
                    ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)'
                    : '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.8)',
                  border: `2px solid ${alignment?.isAligned ? THEME.primary : THEME.accent}50`,
                }}
              >
                <KaabaIcon size={36} />
              </div>
            </div>

            {/* Alignment Ring Animation */}
            {alignment?.isAligned && isLiveCompass && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none"
                style={{ border: `2px solid ${THEME.primary}` }} />
            )}
          </div>
        </div>
      </div>

      {/* ── Status & Controls Section ───────────────────────────── */}
      <div className="relative z-10 px-6 pb-8 space-y-4">

        {/* Status Badge — fixed-height slot keeps layout stable across states */}
        <div className="flex justify-center items-center min-h-[48px]">
          {alignment?.isAligned ? (
            <div className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full border animate-in fade-in zoom-in duration-300 shadow-sm",
              isDark 
                ? "bg-[#141414] border-white/5 border-[#10B981]/50 text-white/70"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            )}>
              <Navigation className="h-4 w-4" />
              <span className="font-semibold text-sm tracking-wide">FACING QIBLA</span>
            </div>
          ) : isLiveCompass && alignment?.instruction ? (
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm",
              isDark 
                ? "bg-card/60 border-border/40 text-foreground/80"
                : "bg-card border-border text-foreground/80"
            )}>
              <Compass className="h-4 w-4" style={{ color: THEME.accent }} />
              <span className="text-sm">
                Turn <span className="font-semibold" style={{ color: THEME.accent }}>{alignment.instruction.degrees}°</span> {alignment.instruction.direction}
              </span>
            </div>
          ) : !compassUnavailable ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-muted-foreground text-sm">
              {compassState === 'permission-required' ? 'Tap Enable Compass below' :
                compassState === 'denied' ? 'Compass permission denied' :
                  compassState === 'activating' ? 'Starting compass...' :
                    'Enable compass for live guidance'}
            </div>
          ) : null}
        </div>

        {/* Info Cards — grid-stacked with the no-sensor fallback so the height is constant */}
        <div className="grid grid-cols-1">
          {/* Rich no-sensor fallback UI (visible only when the compass is unavailable) */}
          <div className={cn("row-start-1 col-start-1 w-full space-y-3", compassUnavailable && qiblaResult ? "visible" : "invisible")}>
            <div className="flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border"
              style={{ background: 'rgba(201,134,10,0.06)', borderColor: 'rgba(201,134,10,0.25)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-600">
                <Compass className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold" style={{ color: THEME.accent }}>No Sensor Detected</p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">Your device doesn't have a digital compass, but you can still find the Qibla!</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-4">
              <div className="text-center pb-4 border-b border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Your Qibla Angle Is</p>
                <div className="flex items-baseline justify-center gap-1.5">
                  <p className="text-4xl font-black" style={{ color: THEME.accent, fontFamily: 'inherit' }}>{Math.round(qiblaResult.bearing)}°</p>
                  <p className="text-sm font-bold text-foreground/80">{qiblaResult.cardinalDirection}</p>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-2 mx-auto max-w-[240px] leading-relaxed">
                  This angle is a fixed geographic line from your city to Mecca. It will not change when you move your device.
                </p>
              </div>

              <div className="space-y-3.5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">How to use this number:</p>

                <div className="flex gap-3 text-left items-start">
                  <div className="w-5 h-5 mt-0.5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    <strong className="text-foreground block mb-0.5">Using a real compass:</strong>
                    Hold a plastic compass flat. Turn your body until you face the <strong>{Math.round(qiblaResult.bearing)}°</strong> mark.
                  </p>
                </div>

                <div className="flex gap-3 text-left items-start">
                  <div className="w-5 h-5 mt-0.5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    <strong className="text-foreground block mb-0.5">Using Google Maps:</strong>
                    Open Maps. The top of your screen is always North (0°). Turn to face <strong>{qiblaResult.cardinalDirection}</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Distance + Heading cards */}
          <div className={cn("row-start-1 col-start-1 space-y-3", compassUnavailable && qiblaResult ? "invisible" : "visible")}>
          {/* Enhanced Distance Card */}
          <Card className="bg-card/80 backdrop-blur-md border-border shadow-lg overflow-hidden">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <span className="p-1 rounded-md bg-muted">🕋</span>
                    Distance to Baitullah
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-foreground tracking-tighter">
                      {qiblaResult.formattedDistance.split(' ')[0]}
                    </span>
                    <span className="text-lg font-bold text-muted-foreground">
                      {qiblaResult.formattedDistance.split(' ')[1] || 'km'}
                    </span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">
                    Travel Mode
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground font-bold text-xs border border-border">
                    {qiblaResult.distanceKm < 5000 ? '🚗 Road' : '✈️ Air'}
                  </div>
                </div>
              </div>

              {/* Travel Path Visualization */}
              <div className="relative pt-6 pb-2">
                <div className="flex items-center w-full">
                  {/* Origin (Dynamic Emoji based on Distance) */}
                  <div className="flex flex-col items-center z-10">
                    <div className="w-9 h-9 rounded-full bg-card border-border flex items-center justify-center border-2 border-[#10B981]/30 shadow-sm text-lg relative overflow-hidden group">
                      {qiblaResult.distanceKm < 50
                        ? '🥰' // Overjoyed (within Mecca)
                        : qiblaResult.distanceKm < 500
                          ? '🥹' // Emotional (very close)
                          : qiblaResult.distanceKm < 1500
                            ? '😃' // Very Happy (regional)
                            : qiblaResult.distanceKm < 4000
                              ? '😊' // Happy (like Karachi range)
                              : '🙂' // Content (far)
                      }

                      {/* Subtle pulse effect for the emoji */}
                      <div className="absolute inset-0 bg-amber-200/40 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2">You</span>
                  </div>

                  {/* Connective Line */}
                  <div className="flex-1 relative flex items-center justify-center mx-2">
                    <div className="w-full border-t-2 border-dashed border-border"></div>

                    {/* Floating Distance Badge */}
                    <div className="absolute bg-card/90 backdrop-blur-sm px-3 py-1 rounded-full border border-border shadow-sm text-xs font-bold text-[#D4AF37] flex items-center gap-1.5 transform -translate-y-1/2">
                      <span>{qiblaResult.distanceKm < 5000 ? '🚗' : '✈️'}</span>
                      <span>{Math.round(qiblaResult.distanceKm)} km</span>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex flex-col items-center z-10">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#b48608] flex items-center justify-center shadow-md shadow-[#10B981]/20 border-2 border-white/50">
                      <span className="text-sm">🕋</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2">Kaaba</span>
                  </div>
                </div>

                {/* Bottom Journey Insight */}
                <div className="mt-5 p-3 rounded-2xl bg-muted/55 border border-border/60 space-y-1.5 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-45">
                    <MapPin className="w-12 h-12 text-foreground" />
                  </div>

                  <p className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#10B981] to-[#059669] animate-pulse" />
                    The Journey Estimate
                  </p>

                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    {qiblaResult.distanceKm < 100
                      ? `Subhanallah, you are extremely close! Just ${Math.round(qiblaResult.distanceKm * 1000)}m to the Holy Kaaba.`
                      : qiblaResult.distanceKm < 5000
                        ? `A spiritual road trip would take roughly ${Math.round(qiblaResult.distanceKm / 50)} hours of driving.`
                        : `You are a flight of approximately ${Math.round(qiblaResult.distanceKm / 800)} hours away from the House of Allah.`
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Heading Card */}
          <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-border shadow-sm">
            <p className="text-muted-foreground/80 text-xs uppercase tracking-wider mb-1">Current Heading</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-foreground">
                {isLiveCompass ? `${Math.round(deviceHeading)}°` : '--'}
              </span>
              <span className="text-sm text-muted-foreground">
                {isLiveCompass ? getCardinalDirection(deviceHeading) : 'No compass'}
              </span>
            </div>
            <p className="text-muted-foreground/70 text-xs mt-1">
              {isLiveCompass ? 'Device orientation' : 'Enable compass for direction'}
            </p>
          </div>
          </div>
        </div>

        {/* Control Buttons */}
        {/* Control Buttons */}
        <div className="pt-2">
          <button
            onClick={() => {
              if ('vibrate' in navigator) navigator.vibrate(50);
              if (compassState === 'permission-required' || compassState === 'denied') {
                void enableCompass();
              } else {
                void refreshLocation('manual');
                if (isLiveCompass) {
                  requestManualCalibration();
                }
              }
            }}
            disabled={compassState === 'activating' || isRefreshingLocation}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            style={{
              background: compassState === 'permission-required' ? `${THEME.primary}20` : 'transparent',
              border: `1px solid ${compassState === 'permission-required' ? THEME.primary : THEME.border}`,
              color: compassState === 'permission-required' ? THEME.primary : THEME.textMuted,
            }}
          >
            {compassState === 'activating' || isRefreshingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : compassState === 'permission-required' || compassState === 'denied' ? (
              <Compass className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            
            {compassState === 'activating' ? 'Starting...' :
             compassState === 'permission-required' ? 'Enable Compass' :
             compassState === 'denied' ? 'Permission Denied (Retry)' :
             isRefreshingLocation ? 'Updating GPS...' :
             isLiveCompass ? 'Refresh GPS & Calibrate' :
             'Update Location'}
          </button>
        </div>

        {/* Sensor Error */}
        {sensorError && (
          <p className="text-center text-xs text-red-500/80">{sensorError}</p>
        )}

        {locationError && (
          <p
            className={cn(
              "text-center text-xs",
              cityName?.includes('(Offline)') ? "text-muted-foreground" : "text-red-500/80"
            )}
          >
            {locationError}
          </p>
        )}
      </div>
    </div>
  );
};

export default QiblaCompassModern;
