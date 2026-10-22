import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, Sunset, Cloud, CloudMoon } from "lucide-react";
import { PremiumDashboard } from "@/components/PremiumDashboard";
import { LocationSearch } from "@/components/LocationSearch";
import { getTodayPrayers, togglePrayer, resolvePrayerTimes, checkStreakReset, type PrayerName, type DailyPrayers } from "@/lib/salah-tracker";
import { syncMissedPrayersToQaza } from "@/lib/qaza-tracker";

import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { getTimeFormat, formatTime } from "@/lib/time-formatter";
import { useLocationState } from "@/lib/location-state";
import { AladhanAPI } from "@/lib/aladhan-api";
import { getEffectiveAladhanMethodId, getEffectiveCalculationMethod } from "@/lib/prayer-method-resolver";
import { getMadhab } from "@/lib/storage";
import { type PrayerTime } from "@/lib/local-notifications";
import { useToast } from "@/hooks/use-toast";
import { GeocodingService } from "@/lib/geocoding";
import { PageTransition } from "@/components/PageTransition";

export default function Dashboard() {
  const navigate = useNavigate();
  const [minuteTick, setMinuteTick] = useState(0);
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  // Use Islamic calendar hook for accurate Hijri dates
  const { hijriDate, isEidAlFitr, isEidAlAdha } = useIslamicCalendar();
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>('24');
  const [nextPrayerName, setNextPrayerName] = useState<string>("");
  const [nextPrayerTime, setNextPrayerTime] = useState<string>("");
  const [loadingAPI, setLoadingAPI] = useState(false);
  const [targetTime, setTargetTime] = useState<Date | null>(null);
  const { toast } = useToast();

  // Memoized prayer icons
  const prayerIcons = useMemo((): Record<string, React.ReactNode> => ({
    Fajr: <Moon className="w-5 h-5 text-indigo-400" />,
    Dhuhr: <Sun className="w-5 h-5 text-amber-400" />,
    Asr: <Cloud className="w-5 h-5 text-blue-400" />,
    Maghrib: <Sunset className="w-5 h-5 text-orange-400" />,
    Isha: <CloudMoon className="w-5 h-5 text-purple-400" />,
  }), []);

  // Global location state
  const location = useLocationState();

  const [showManualLocationDialog, setShowManualLocationDialog] = useState(false);
  const [showBatteryOptDialog, setShowBatteryOptDialog] = useState(false);
  const [todayPrayers, setTodayPrayers] = useState<DailyPrayers | null>(null);

  // Initialize and listen for prayer tracking updates
  useEffect(() => {
    setTodayPrayers(getTodayPrayers());
    
    const handleSalahUpdated = () => {
      setTodayPrayers(getTodayPrayers());
    };
    
    window.addEventListener('salah-updated', handleSalahUpdated);
    return () => window.removeEventListener('salah-updated', handleSalahUpdated);
  }, []);

  // Bridge: sync missed prayers to qaza when prayer times are available
  useEffect(() => {
    if (todayPrayers && prayers.length > 0) {
      const resolvedTimes = resolvePrayerTimes();
      if (resolvedTimes) {
        const syncData = {
          fajr: todayPrayers.fajr,
          dhuhr: todayPrayers.dhuhr,
          asr: todayPrayers.asr,
          maghrib: todayPrayers.maghrib,
          isha: todayPrayers.isha,
        };
        syncMissedPrayersToQaza(syncData, resolvedTimes);
      }
    }
  }, [todayPrayers, prayers]);

  // Reset streak check when app comes to foreground
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkStreakReset();
        setTodayPrayers(getTodayPrayers());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);


  const prayerTimesHook = usePrayerTimes();
  // Note: useWidgetSync is registered globally in App.tsx (AppShell) — a
  // second registration here would double-fire widget bridge pushes.

  const prayerLocation = prayerTimesHook.location;

  // Priority: GPS location > VPN/API location
  // If GPS location is set, use it regardless of whether it's default
  const locationLabel = useMemo(() => {
    // If GPS location has coordinates, use it (even if default Karachi)
    if (location.latitude && location.longitude) {
      return location.locationName;
    }

    // Otherwise, use VPN/API location if available
    if (prayerLocation?.city && prayerLocation?.country) {
      return `${prayerLocation.city}, ${prayerLocation.country}`;
    }

    // Fallback to default location
    return location.locationName;
  }, [location, prayerLocation]);

  // Similar priority for timezone — consumed by PremiumDashboard's location
  // state; the dashboard itself only needs the human-readable label.


  useEffect(() => {
    const currentFormat = getTimeFormat();
    setTimeFormat(currentFormat);
  }, [setTimeFormat]);

  // Helper function to format time from API using global formatter
  const formatTimeFromAPI = useCallback((timeStr: string): string => {
    return formatTime(timeStr, timeFormat);
  }, [timeFormat]);

  // Helper function to parse time string to Date (handles "HH:MM (TZ)" from Aladhan API)
  const parseTimeToDate = useCallback((timeStr: string): Date => {
    const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
    const parts = cleaned.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const date = new Date();
    if (isNaN(hours) || isNaN(minutes)) return date;
    date.setHours(hours, minutes, 0, 0);
    return date;
  }, []);

  // Load prayer times using global location
  const loadPrayerTimes = useCallback(async () => {
    if (!location.latitude || !location.longitude) return;
    setLoadingAPI(true);

    try {
      // Use the same effective calculation method as every other code path
      // (user's explicit choice or the region-recommended one), instead of a
      // hardcoded method that disagreed with the hook, notifications & adhan.
      const methodId = getEffectiveAladhanMethodId(location.latitude, location.longitude);
      const schoolParam = getMadhab() === 'hanafi' ? 1 : 0;

      // Check if we have cached data for this specific location
      const hasValidCache = AladhanAPI.isCachedDataValid(location.latitude, location.longitude, schoolParam, methodId);

      if (!hasValidCache) {
        // Fetch fresh data for current month
        await AladhanAPI.fetchMonthlyCalendar(
          location.latitude,
          location.longitude,
          undefined,
          undefined,
          methodId,
          schoolParam
        );
      }

      // Get today's prayer times and metadata (including timezone)
      const { timings, timezone: fetchedTimezone } = await AladhanAPI.getTodaysPrayerTimes(location.latitude, location.longitude, methodId, schoolParam);

      // Update global location state with the fetched timezone if it's different or not set
      if (fetchedTimezone && fetchedTimezone !== location.timeZone) {
        location.setLocation(location.latitude, location.longitude, location.locationName, fetchedTimezone);
      }

      // Prayer times are loaded, Hijri date comes from useIslamicCalendar hook

      const prayerList: PrayerTime[] = [
        { name: "Fajr", time: formatTimeFromAPI(timings.Fajr), date: parseTimeToDate(timings.Fajr) },
        { name: "Dhuhr", time: formatTimeFromAPI(timings.Dhuhr), date: parseTimeToDate(timings.Dhuhr) },
        { name: "Asr", time: formatTimeFromAPI(timings.Asr), date: parseTimeToDate(timings.Asr) },
        { name: "Maghrib", time: formatTimeFromAPI(timings.Maghrib), date: parseTimeToDate(timings.Maghrib) },
        { name: "Isha", time: formatTimeFromAPI(timings.Isha), date: parseTimeToDate(timings.Isha) },
      ];

      setPrayers(prayerList);

      // Get next prayer countdown
      const nextEvent = await AladhanAPI.getNextEventCountdown(location.latitude, location.longitude, methodId, false);
      if (nextEvent) {
        setNextPrayerName(nextEvent.name);
        setNextPrayerTime(nextEvent.time || "--:--");
        if (nextEvent.targetDate) {
          setTargetTime(nextEvent.targetDate);
        }
      }
    } catch (error) {
      console.error('Failed to load API prayer times:', error);
      // Fallback to offline calculation
      const { calculatePrayerTimes, formatPrayerTime } = await import('@/lib/prayer-calculator');
      const times = calculatePrayerTimes(
        location.latitude,
        location.longitude,
        new Date(),
        getEffectiveCalculationMethod(location.latitude, location.longitude)
      );

      setPrayers([
        { name: "Fajr", time: formatTimeFromAPI(times.fajr.toTimeString().slice(0, 5)), date: times.fajr },
        { name: "Dhuhr", time: formatTimeFromAPI(times.dhuhr.toTimeString().slice(0, 5)), date: times.dhuhr },
        { name: "Asr", time: formatTimeFromAPI(times.asr.toTimeString().slice(0, 5)), date: times.asr },
        { name: "Maghrib", time: formatTimeFromAPI(times.maghrib.toTimeString().slice(0, 5)), date: times.maghrib },
        { name: "Isha", time: formatTimeFromAPI(times.isha.toTimeString().slice(0, 5)), date: times.isha },
      ]);

      const { getNextPrayer } = await import('@/lib/prayer-calculator');
      const nextPrayer = getNextPrayer(location.latitude, location.longitude);
      if (nextPrayer) {
        setNextPrayerName(nextPrayer.name);
        setNextPrayerTime(formatTimeFromAPI(nextPrayer.time.toTimeString().slice(0, 5)));
        setTargetTime(nextPrayer.time);
      }
    } finally {
      setLoadingAPI(false);
    }
  }, [location.latitude, location.longitude, location.timeZone, location.locationName, location.setLocation, formatTimeFromAPI, parseTimeToDate, timeFormat]);

  useEffect(() => {
    // Add online listener to refresh prayer times as soon as internet is back
    const handleOnline = () => {
      loadPrayerTimes();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [loadPrayerTimes]);

  // Initialize prayer times when location changes
   useEffect(() => {
     if (location.latitude && location.longitude) {
       loadPrayerTimes();
     }
   }, [location.latitude, location.longitude, loadPrayerTimes]);

// Listen for time format changes from settings
   useEffect(() => {
     const handleStorageChange = (e: StorageEvent) => {
       if (e.key === 'time-format' && e.newValue) {
         setTimeFormat(e.newValue as '12' | '24');
         // Time formatting is a presentation concern - no API call needed
       }
     };

     const handleCustomTimeFormatChange = (e: CustomEvent) => {
       if (e.detail?.format) {
         setTimeFormat(e.detail.format as '12' | '24');
         // Time formatting is a presentation concern - no API call needed
       }
     };

     window.addEventListener('storage', handleStorageChange);
     window.addEventListener('time-format-changed', handleCustomTimeFormatChange as EventListener);

     return () => {
       window.removeEventListener('storage', handleStorageChange);
       window.removeEventListener('time-format-changed', handleCustomTimeFormatChange as EventListener);
     };
   }, [setTimeFormat]);

  // Reload prayer times when the calculation method or madhab changes so the
  // dashboard grid never shows times from the previous method.
  useEffect(() => {
    const handleRecalculate = () => {
      loadPrayerTimes();
    };
    window.addEventListener('prayer-method-changed', handleRecalculate);
    window.addEventListener('madhab-changed', handleRecalculate);
    return () => {
      window.removeEventListener('prayer-method-changed', handleRecalculate);
      window.removeEventListener('madhab-changed', handleRecalculate);
    };
  }, [loadPrayerTimes]);

  // Clear stale location data on mount to prevent ISTRES issue
  useEffect(() => {
    // Helper function to handle ISTRES cleanup without hard reload
    const cleanupIstres = (reason: string) => {
      localStorage.removeItem('user-location-data');
      localStorage.removeItem('location-storage');
      console.log('Cleared location data due to ISTRES:', reason);
      if (location.locationName?.includes('Istres') || location.locationName?.includes('ISTRES')) {
        location.resetToDefault();
      }
    };

    // Clear any stale IP-based location that might show wrong city
    const staleKeys = ['user-location-data', 'location-storage'];
    staleKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.city === 'Istres' || parsed.locationName?.includes('Istres') ||
            parsed.city === 'ISTRES' || parsed.locationName?.includes('ISTRES')) {
            cleanupIstres('localStorage contains ISTRES');
          }
        }
      } catch (error) {
        console.warn('Failed to check location data:', error);
      }
    });

    if (location.locationName?.includes('Istres') || location.locationName?.includes('ISTRES')) {
      cleanupIstres('location state contains ISTRES');
    }
  }, []);


  // Stable minute tick ref for nextPrayerInfo to avoid depending on currentTime directly
  const minuteTickRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      minuteTickRef.current = (minuteTickRef.current + 1) % 60;
      setMinuteTick(t => t + 1);
    }, 60000);
    return () => clearInterval(id);
  }, []);

const handleCheckIn = useCallback((pKey: PrayerName) => {
    const resolvedTimes = resolvePrayerTimes();
    const result = togglePrayer(pKey, resolvedTimes || undefined);
    toast({
      title: result.success ? "Check-in Updated" : "Cannot Check-in",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  }, [toast, resolvePrayerTimes]);

  const dashboardPrayers = useMemo(() => {
    void minuteTick;
    const now = new Date();
    // Prayer end times (valid-time windows) from the canonical hook —
    // Isha's end is madhab-aware (Hanafi: Fajr; jumhur: Islamic midnight).
    const withEnd = prayerTimesHook.prayerTimesWithEnd;
    const endsByName: Partial<Record<string, Date>> = withEnd ? {
      Fajr: withEnd.fajr.end,
      Dhuhr: withEnd.dhuhr.end,
      Asr: withEnd.asr.end,
      Maghrib: withEnd.maghrib.end,
      Isha: withEnd.isha.end,
    } : {};
    const polarSafe = (d?: Date) => (d && !Number.isNaN(d.getTime()) ? d : undefined);
    return prayers.map(p => {
      const prayerDate = p.date;
      const isUpcoming = prayerDate && prayerDate > now;
      const pKey = p.name.toLowerCase() as PrayerName;
      const isCompleted = todayPrayers ? !!todayPrayers[pKey] : false;

      // Check if it's Friday and handle Jummah logic
      const isFriday = now.getDay() === 5;
      const isAfter2PM = now.getHours() >= 14;
      let displayName = p.name;

      if (p.name === 'Dhuhr' && isFriday && !isAfter2PM) {
        displayName = 'Jummah';
      }

      // Formatted valid-time end ("Ends HH:MM"); formatted at render time so
      // 12/24h flips stay live. Uses the same device-local convention as every
      // other hook-derived Date in the app (no timeZone override — start times
      // are device-local wall-clock labels too). Guarded against polar-day
      // Invalid Dates.
      const endDate = polarSafe(endsByName[p.name]);
      const endsAt = endDate ? formatTime(endDate, timeFormat) : undefined;
      // Jumhur users see Isha end at Islamic midnight — expose the basis for a
      // tooltip so the late hour is self-explanatory.
      const endsBasisKey = p.name === 'Isha' && getMadhab() !== 'hanafi'
        ? 'islamicMidnight'
        : undefined;

      return {
        name: displayName,
        originalName: p.name,
        time: p.time,
        endsAt,
        endsBasisKey,
        icon: prayerIcons[p.name] || <Sun className="w-5 h-5" />,
        isActive: nextPrayerName === p.name,
        // "NEXT" pill must mark ONLY the actual next prayer, not every
        // remaining prayer of the day.
        isUpcoming: Boolean(isUpcoming) && nextPrayerName === p.name,
        isCompleted,
        onCheckIn: () => handleCheckIn(pKey),
      };
    });
  }, [prayers, minuteTick, todayPrayers, nextPrayerName, handleCheckIn, prayerIcons, prayerTimesHook.prayerTimesWithEnd, timeFormat]);

  const nextPrayerInfo = useMemo(() => {
    const nextIdx = prayers.findIndex(p => p.name === nextPrayerName);
    const prevPrayer = nextIdx > 0 ? prayers[nextIdx - 1] : null;
    const prevDate = prevPrayer?.date;
    if (!prevDate || !targetTime) return {
      name: nextPrayerName || "Loading...",
      time: nextPrayerTime || "--:--",
      targetTime: targetTime,
      progress: 0,
    };
    const start = prevDate.getTime();
    const end = targetTime.getTime();
    // Use minuteTickRef to trigger recalculation without depending on currentTime directly
    void minuteTickRef.current;
    const now = Date.now();
    if (end <= start) return {
      name: nextPrayerName || "Loading...",
      time: nextPrayerTime || "--:--",
      targetTime: targetTime,
      progress: 0,
    };
    const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    return {
      name: nextPrayerName || "Loading...",
      time: nextPrayerTime || "--:--",
      targetTime: targetTime,
      progress,
    };
}, [prayers, nextPrayerName, nextPrayerTime, targetTime]);

  // Stable callbacks for PremiumDashboard props
  const onServiceClick = useCallback((route: string) => navigate(route), [navigate]);
  const onVerseClick = useCallback(() => navigate('/quran'), [navigate]);
  const onHadithClick = useCallback(() => navigate('/hadith/collections'), [navigate]);
  const onNotificationClick = useCallback(() => navigate('/notification-history'), [navigate]);
  const onLocationClick = useCallback(() => setShowManualLocationDialog(true), [setShowManualLocationDialog]);

return (
    <PageTransition>
      <PremiumDashboard
        hijriDate={hijriDate || ""}
        nextPrayer={nextPrayerInfo}
        prayers={dashboardPrayers}
        locationLabel={locationLabel}
        onServiceClick={onServiceClick}
        onVerseClick={onVerseClick}
        onHadithClick={onHadithClick}
        onNotificationClick={onNotificationClick}
        onLocationClick={onLocationClick}
        showManualLocationDialog={showManualLocationDialog}
        setShowManualLocationDialog={setShowManualLocationDialog}
        LocationSearch={LocationSearch}
        GeocodingService={GeocodingService}
        AladhanAPI={AladhanAPI}
        location={location}
        prayerTimesHook={prayerTimesHook}
        setLoadingAPI={setLoadingAPI}
        toast={toast}
      />
    </PageTransition>
  );
}
