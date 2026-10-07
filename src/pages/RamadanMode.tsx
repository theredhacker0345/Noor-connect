import { useMemo, useState, useEffect, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { goBackOrFallback } from "@/lib/navigation";
import { AppBar } from "@/components/AppBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Moon, Sun, CheckCircle, TrendingUp, AlertCircle, ArrowLeft, MapPin, Clock, RefreshCw, Flame, Check, BookOpen, Minus, Plus, Star, Heart, Gift, Trophy, Droplet } from "lucide-react";
import { LayoutManager } from "@/components/LayoutManager";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLocationState } from "@/lib/location-state";
import { AladhanAPI } from "@/lib/aladhan-api";
import { getEffectiveAladhanMethodId } from "@/lib/prayer-method-resolver";
import { IslamicRamadanAPI } from "@/lib/islamic-fasting-api";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { RamadanNotifications } from "@/lib/ramadan-notifications";
import { useLanguage } from "@/contexts/LanguageContext-new";

const RAMADAN_STORAGE = 'ramadan-data';

interface RamadanData {
  fastingDays: string[]; // Array of date strings
  quranProgress: number; // Pages read (out of 604)
  dailyQuranGoal: number;
  startDate: string; // Ramadan start date
  tarawihPrayers: string[]; // Tarawih nights completed
  charityAmount: number; // Total charity given
  goodDeeds: number; // Daily good deeds counter
  eidCountdown: number; // Days until Eid
  waterRemindersEnabled: boolean; // Water reminders after Iftar
}

interface NextEventCountdownProps {
  enabled: boolean;
  suhoorTime: string;
  iftarTime: string;
  onEventChange: (evt: { name: string; time: string; countdown: string } | null) => void;
}

/**
 * Self-contained countdown ticker.
 *
 * Owns its own 1/sec setInterval and only mutates `nextEvent`.  Previously
 * `RamadanMode` itself was re-rendering its ENTIRE body (cards, progress
 * bars, framer-motion variants, etc.) every second just because a 4-digit
 * number changed.  Memoizing this component isolates the 1/sec state
 * updates to just the countdown text — not the entire 12-card page.
 */
const NextEventCountdownTicker = memo(function NextEventCountdownTicker({
  enabled,
  suhoorTime,
  iftarTime,
  onEventChange,
}: NextEventCountdownProps) {
  useEffect(() => {
    if (!enabled || !suhoorTime || !iftarTime) return;

    const parseTimeToDate = (timeStr: string): Date => {
      const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
      const [time, period] = cleaned.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      if (isNaN(hour24) || isNaN(minutes)) return date;
      date.setHours(hour24, minutes, 0, 0);
      return date;
    };

    const update = () => {
      const now = new Date();
      const suhoor = parseTimeToDate(suhoorTime);
      const iftar = parseTimeToDate(iftarTime);

      let next: { name: string; time: string; countdown: string } | null = null;

      if (suhoor > now) {
        const diff = suhoor.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        next = {
          name: 'Suhoor Ends',
          time: suhoorTime,
          countdown: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        };
      } else if (iftar > now) {
        const diff = iftar.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        next = {
          name: 'Iftar Time',
          time: iftarTime,
          countdown: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        };
      }

      onEventChange(next);
    };

    update();
    const handle = setInterval(update, 1000);
    return () => clearInterval(handle);
  }, [enabled, suhoorTime, iftarTime, onEventChange]);

  return null;
});

export default function RamadanMode() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [suhoorTime, setSuhoorTime] = useState<string>("");
  const [iftarTime, setIftarTime] = useState<string>("");
  const [nextEvent, setNextEvent] = useState<{ name: string; time: string; countdown: string } | null>(null);
  const [loadingTimes, setLoadingTimes] = useState(true);
  const [apiSource, setApiSource] = useState<'islamic' | 'aladhan' | 'fallback'>('islamic');
  const [fastingDuration, setFastingDuration] = useState<string>("");
  const [hijriDate, setHijriDate] = useState<string>("");
  const [dailyDua, setDailyDua] = useState<{ title: string; arabic: string; translation: string; transliteration: string; reference: string } | null>(null);
  const [dailyHadith, setDailyHadith] = useState<{ arabic: string; english: string; source: string; grade: string } | null>(null);
  const [ramadanYear, setRamadanYear] = useState<number>(1447);
  
  // Use Islamic calendar hook for accurate Ramadan detection
  const { isRamadan, ramadanDay, daysUntilRamadan, isLoading: islamicLoading, error: islamicError, islamicInfo } = useIslamicCalendar();
  
  const [data, setData] = useState<RamadanData>({
    fastingDays: [],
    quranProgress: 0,
    dailyQuranGoal: 20,
    startDate: new Date().toISOString(),
    tarawihPrayers: [],
    charityAmount: 0,
    goodDeeds: 0,
    eidCountdown: 30,
    waterRemindersEnabled: true
  });
  const [currentDay, setCurrentDay] = useState(1);
  const [todayFasted, setTodayFasted] = useState(false);

  // Global location state
  const location = useLocationState();

  useEffect(() => {
    // Load saved data
    const saved = localStorage.getItem(RAMADAN_STORAGE);
    if (saved) {
      const parsed = JSON.parse(saved) as RamadanData;
      setData(parsed);

      // Update current Ramadan day from hook
      if (isRamadan && ramadanDay > 0) {
        setCurrentDay(ramadanDay);
      }

      // Check if today is fasted
      setTodayFasted(parsed.fastingDays.includes(new Date().toDateString()));
    }

    // Load dynamic prayer times
    loadRamadanTimes();
  }, []);

  const loadRamadanTimes = async () => {
    setLoadingTimes(true);
    try {
      // Try Islamic Ramadan API first
      try {
        const ramadanData = await IslamicRamadanAPI.getTodaysRamadanTimes(
          location.latitude,
          location.longitude,
          3 // Muslim World League method
        );

        if (ramadanData.fastingTime && ramadanData.fullData.status === 'success') {
          const todayFasting = ramadanData.fastingTime;
          setSuhoorTime(todayFasting.time.sahur);
          setIftarTime(todayFasting.time.iftar);
          setFastingDuration(todayFasting.time.duration);
          setHijriDate(todayFasting.hijri_readable);
          setRamadanYear(ramadanData.fullData.ramadan_year);
          setApiSource('islamic');

          // Set daily dua and hadith if available
          if (ramadanData.fullData.resource) {
            setDailyDua(ramadanData.fullData.resource.dua);
            setDailyHadith(ramadanData.fullData.resource.hadith);
          }

          // Get countdown to next event
          await updateNextEventCountdown(todayFasting.time.sahur, todayFasting.time.iftar);

          // Schedule Ramadan notifications if it's Ramadan
          if (isRamadan && ramadanDay > 0) {
            const ramadanNotifications = RamadanNotifications.getInstance();
            await ramadanNotifications.scheduleDailyRamadanNotifications(
              todayFasting.time.sahur,
              todayFasting.time.iftar,
              "22:00", // Default Isha time
              location.locationName,
              ramadanDay,
              data.waterRemindersEnabled
            );
          }
          return;
        }
      } catch (islamicError) {
        console.warn('Islamic Ramadan API failed, falling back to Aladhan API:', islamicError);
      }

      // Fallback to Aladhan API
      setApiSource('aladhan');
      const hasValidCache = AladhanAPI.isCachedDataValid();

      if (!hasValidCache) {
        await AladhanAPI.fetchMonthlyCalendar(
          location.latitude,
          location.longitude,
          undefined,
          undefined,
          3 // Muslim World League method
        );
      }

      const result = await AladhanAPI.getTodaysPrayerTimes(location.latitude, location.longitude, 3);
      const timings = result.timings;

      setSuhoorTime(formatTime(timings.Imsak || timings.Fajr));
      setIftarTime(formatTime(timings.Maghrib));
      setFastingDuration(calculateDuration(timings.Imsak || timings.Fajr, timings.Maghrib));
      const hijri = islamicInfo?.currentDate?.hijri;
      setHijriDate(
        hijri ? `${hijri.day} ${hijri.month.en} ${hijri.year}` : "Calculating..."
      );
      setDailyDua(null);
      setDailyHadith(null);

      // Get countdown to next event (same effective calculation method as the app)
      const countdown = await AladhanAPI.getNextEventCountdown(
        location.latitude,
        location.longitude,
        getEffectiveAladhanMethodId(location.latitude, location.longitude),
        true // Ramadan mode
      );
      setNextEvent(countdown);

      // Schedule Ramadan notifications if it's Ramadan
      if (isRamadan && ramadanDay > 0) {
        const ramadanNotifications = RamadanNotifications.getInstance();
        await ramadanNotifications.scheduleDailyRamadanNotifications(
          timings.Fajr,
          timings.Maghrib,
          timings.Isha,
          location.locationName,
          ramadanDay,
          data.waterRemindersEnabled
        );
      }

    } catch (error) {
      console.error('All APIs failed, using offline calculation:', error);
      setApiSource('fallback');
      
      // Ultimate fallback to offline calculation
      const { calculatePrayerTimes } = await import('@/lib/prayer-calculator');
      const times = calculatePrayerTimes(location.latitude, location.longitude, new Date());

      setSuhoorTime(formatTimeFromDate(times.fajr));
      setIftarTime(formatTimeFromDate(times.maghrib));
      setFastingDuration(calculateDurationFromDates(times.fajr, times.maghrib));
      setHijriDate("Offline Mode");
      setDailyDua(null);
      setDailyHadith(null);
    } finally {
      setLoadingTimes(false);
    }
  };

  // Helper function to update next event countdown
  const updateNextEventCountdown = async (suhoor: string, iftar: string) => {
    try {
      const now = new Date();
      const suhoorTime = parseTimeToDate(suhoor);
      const iftarTime = parseTimeToDate(iftar);

      let nextEvent: { name: string; time: string; countdown: string } | null = null;

      // Check if Suhoor is next
      if (suhoorTime > now) {
        const diff = suhoorTime.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        nextEvent = {
          name: 'Suhoor Ends',
          time: suhoor,
          countdown: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
        };
      }
      // Check if Iftar is next
      else if (iftarTime > now) {
        const diff = iftarTime.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        nextEvent = {
          name: 'Iftar Time',
          time: iftar,
          countdown: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
        };
      }

      setNextEvent(nextEvent);
    } catch (error) {
      console.error('Failed to update countdown:', error);
    }
  };

  // Helper function to parse time string to Date
  const parseTimeToDate = (timeStr: string): Date => {
    const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
    const [time, period] = cleaned.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    const date = new Date();
    let hour24 = hours;
    
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    if (isNaN(hour24) || isNaN(minutes)) return date;
    date.setHours(hour24, minutes, 0, 0);
    return date;
  };

  // Helper function to calculate duration between time strings
  const calculateDuration = (suhoorStr: string, iftarStr: string): string => {
    try {
      const suhoor = parseTimeToDate(suhoorStr);
      const iftar = parseTimeToDate(iftarStr);
      
      let diff = iftar.getTime() - suhoor.getTime();
      if (diff < 0) diff += 24 * 60 * 60 * 1000; // Add 24 hours if next day
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    } catch {
      return "Calculating...";
    }
  };

  // Helper function to calculate duration between Date objects
  const calculateDurationFromDates = (suhoor: Date, iftar: Date): string => {
    try {
      let diff = iftar.getTime() - suhoor.getTime();
      if (diff < 0) diff += 24 * 60 * 60 * 1000; // Add 24 hours if next day
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    } catch {
      return "Calculating...";
    }
  };

  // Helper function to format time from API
  const formatTime = (timeStr: string): string => {
    const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
    const [hours, minutes] = cleaned.split(':').map(Number);
    const date = new Date();
    if (isNaN(hours) || isNaN(minutes)) return '--:--';
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper function to format Date to time string
  const formatTimeFromDate = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Initialize prayer times when location changes
  useEffect(() => {
    if (location.latitude && location.longitude) {
      loadRamadanTimes();
    }
  }, [location.latitude, location.longitude]);

  // Stable reference passed to <NextEventCountdownTicker />.
  // Because setNextEvent is a state setter (already identity-stable in React),
  // useCallback with empty deps produces a fixed prop for the memoized ticker
  // so its useEffect never re-subscribes unless inputs actually change.
  const handleNextEventChange = useCallback(
    (evt: { name: string; time: string; countdown: string } | null) => {
      setNextEvent(evt);
    },
    [],
  );

  const saveData = (newData: RamadanData) => {
    setData(newData);
    localStorage.setItem(RAMADAN_STORAGE, JSON.stringify(newData));
  };

  const toggleTodayFast = () => {
    const today = new Date().toDateString();
    let newFastingDays = [...data.fastingDays];

    if (todayFasted) {
      newFastingDays = newFastingDays.filter(d => d !== today);
      setTodayFasted(false);
    } else {
      newFastingDays.push(today);
      setTodayFasted(true);
    }

    saveData({ ...data, fastingDays: newFastingDays });
    toast({ title: todayFasted ? "Fast unmarked" : "Fast recorded! Mubarak!" });
  };

  const updateQuranProgress = (delta: number) => {
    const newProgress = Math.max(0, Math.min(604, data.quranProgress + delta));
    saveData({ ...data, quranProgress: newProgress });
  };

  const toggleTarawih = () => {
    const tonight = new Date().toDateString();
    let newTarawihPrayers = [...data.tarawihPrayers];

    if (newTarawihPrayers.includes(tonight)) {
      newTarawihPrayers = newTarawihPrayers.filter(d => d !== tonight);
      toast({ title: "Tarawih prayer unmarked" });
    } else {
      newTarawihPrayers.push(tonight);
      toast({ title: "Tarawih prayer recorded! May Allah accept it!" });
    }

    saveData({ ...data, tarawihPrayers: newTarawihPrayers });
  };

  const addCharity = (amount: number) => {
    const newAmount = Math.max(0, data.charityAmount + amount);
    saveData({ ...data, charityAmount: newAmount });
    if (amount > 0) {
      toast({ title: `Charity added: $${amount}`, description: "May Allah multiply your reward!" });
    }
  };

  const addGoodDeed = () => {
    const newCount = data.goodDeeds + 1;
    saveData({ ...data, goodDeeds: newCount });
    toast({ title: "Good deed recorded!", description: "Every good deed is multiplied in Ramadan!" });
  };

  const toggleWaterReminders = () => {
    const newEnabled = !data.waterRemindersEnabled;
    saveData({ ...data, waterRemindersEnabled: newEnabled });
    toast({ 
      title: newEnabled ? "Water reminders enabled!" : "Water reminders disabled",
      description: newEnabled 
        ? "You'll receive water reminders after Iftar to stay hydrated."
        : "Water reminders have been turned off."
    });
  };

  const calculateEidCountdown = () => {
    if (!isRamadan) return data.eidCountdown;
    const remainingDays = 30 - ramadanDay;
    return Math.max(0, remainingDays);
  };

  const quranPercentage = (data.quranProgress / 604) * 100;
  const juzCompleted = Math.floor(data.quranProgress / 20);
  const fastingPercentage = (data.fastingDays.length / 30) * 100;

  const resetRamadan = () => {
    const newData: RamadanData = {
      fastingDays: [],
      quranProgress: 0,
      dailyQuranGoal: 20,
      startDate: new Date().toISOString(),
      tarawihPrayers: [],
      charityAmount: 0,
      goodDeeds: 0,
      eidCountdown: 30,
      waterRemindersEnabled: data.waterRemindersEnabled
    };
    saveData(newData);
    setCurrentDay(1);
    setTodayFasted(false);
    toast({ title: "Ramadan tracker reset" });
  };

  return (
    <LayoutManager>
      <div className="min-h-screen bg-background">
        <AppBar title={t("ramadanMode") || "Ramadan Mode"} />

        <div className="max-w-lg mx-auto p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => goBackOrFallback(navigate, '/dashboard')} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold font-arabic">رمضان مبارك</h1>
              <p className="text-sm text-muted-foreground">Ramadan Mubarak</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">Day {currentDay}</p>
              <p className="text-xs text-muted-foreground">of 30</p>
            </div>
          </div>

          {/* Ramadan Status */}
          {!islamicLoading && (
            <>
              <Card className={`p-4 ${isRamadan ? 'bg-gradient-to-br from-green-500/20 to-green-600/5 border-green-500/20' : 'bg-muted/30'}`}>
                <div className="text-center space-y-2">
                                    
                  {isRamadan ? (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <Moon className="w-5 h-5 text-green-500" />
                        <p className="font-semibold text-green-600 dark:text-green-400">Ramadan Active</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Day {ramadanDay} of 30
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {islamicInfo?.currentDate.hijri.day} {islamicInfo?.currentDate.hijri.month.en} {islamicInfo?.currentDate.hijri.year}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <p className="font-semibold text-muted-foreground">Ramadan Not Started</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {daysUntilRamadan > 0 ? `${daysUntilRamadan} days until Ramadan` : 'Check calendar for Ramadan dates'}
                      </p>
                      {islamicInfo && (
                        <p className="text-xs text-muted-foreground">
                          Current: {islamicInfo.currentDate.hijri.day} {islamicInfo.currentDate.hijri.month.en}
                        </p>
                      )}
                    </>
                  )}
                  {islamicError && (
                    <p className="text-xs text-red-500">
                      Calendar data unavailable
                    </p>
                  )}
                </div>
              </Card>

              {/* Eid Countdown */}
              {isRamadan && (
                <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-orange-600/5 border-yellow-500/20">
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Gift className="w-5 h-5 text-yellow-500" />
                      <p className="font-semibold text-yellow-600 dark:text-yellow-400">Eid Countdown</p>
                    </div>
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {calculateEidCountdown()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      days until Eid al-Fitr
                    </p>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3" />
                      <span>Prepare for celebration!</span>
                      <Star className="w-3 h-3" />
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* Location Info */}
          <Card className="p-3 bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Location: {location.locationName}</span>
            </div>
          </Card>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Moon className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Suhoor Ends</p>
                    <p className="text-xl font-bold">
                      {loadingTimes ? "--:--" : suhoorTime || "--:--"}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/5 border-orange-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Sun className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Iftar Time</p>
                    <p className="text-xl font-bold">
                      {loadingTimes ? "--:--" : iftarTime || "--:--"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Fasting Duration */}
            {fastingDuration && (
              <Card className="p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Fasting Duration</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{fastingDuration}</span>
                </div>
              </Card>
            )}

            {/* Hijri Date */}
            {hijriDate && (
              <Card className="p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Hijri Date</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{hijriDate}</span>
                </div>
              </Card>
            )}

            {/* API Source Indicator */}
            <Card className="p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    apiSource === 'islamic' ? 'bg-green-500' : 
                    apiSource === 'aladhan' ? 'bg-blue-500' : 'bg-orange-500'
                  }`} />
                  <span className="text-sm font-medium">Data Source</span>
                </div>
                <div className="text-right">
                  <span className={`text-xs capitalize block ${
                    apiSource === 'islamic' ? 'text-green-600' : 
                    apiSource === 'aladhan' ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {apiSource === 'islamic' ? 'Islamic API' : 
                     apiSource === 'aladhan' ? 'Aladhan API' : 'Offline'}
                  </span>
                  {ramadanYear && (
                    <span className="text-xs text-muted-foreground block">
                      Ramadan {ramadanYear} AH
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* Next Event Countdown */}
            {nextEvent && (
              <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">{nextEvent.name}</p>
                      <p className="text-xs text-muted-foreground">in {nextEvent.countdown}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{nextEvent.time}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Refresh Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                IslamicRamadanAPI.clearCache();
                AladhanAPI.clearCachedData();
                loadRamadanTimes();
              }}
              disabled={loadingTimes}
            >
              {loadingTimes ? (
                <>
                  <RefreshCw className="w-4 h-4 ms-2 animate-spin" />
                  Updating Times...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 ms-2" />
                  Refresh Ramadan Times
                </>
              )}
            </Button>
          </div>

          {/* Fasting Tracker */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                <span className="font-medium">Fasting Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">{data.fastingDays.length}/30 days</span>
            </div>

            <Progress value={fastingPercentage} className="h-3" />

            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 30 }).map((_, i) => {
                const dayDate = new Date(data.startDate);
                dayDate.setDate(dayDate.getDate() + i);
                const isFasted = data.fastingDays.includes(dayDate.toDateString());
                const isToday = i + 1 === currentDay;

                return (
                  <div
                    key={i}
                    className={`aspect-square rounded flex items-center justify-center text-xs font-medium ${isFasted
                      ? 'bg-green-500 text-white'
                      : isToday
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-muted'
                      }`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>

            <Button
              className="w-full"
              variant={todayFasted ? "outline" : "default"}
              onClick={toggleTodayFast}
            >
              {todayFasted ? (
                <>
                  <Check className="w-4 h-4 ms-2" />
                  Today Fasted ✓
                </>
              ) : (
                "Mark Today as Fasted"
              )}
            </Button>
          </Card>

          {/* Daily Dua */}
          {dailyDua && (
            <Card className="p-4 space-y-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-600">Daily Dua</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-2">{dailyDua.title}</h4>
                  <p className="text-right text-lg arabic-text leading-loose mb-2" dir="rtl">
                    {dailyDua.arabic}
                  </p>
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Transliteration:</strong> {dailyDua.transliteration}</p>
                  <p><strong>Translation:</strong> {dailyDua.translation}</p>
                  <p><strong>Reference:</strong> {dailyDua.reference}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Daily Hadith */}
          {dailyHadith && (
            <Card className="p-4 space-y-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-600">Daily Hadith</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-right text-lg arabic-text leading-loose mb-2" dir="rtl">
                    {dailyHadith.arabic}
                  </p>
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>English:</strong> {dailyHadith.english}</p>
                  <p><strong>Source:</strong> {dailyHadith.source}</p>
                  <p><strong>Grade:</strong> {dailyHadith.grade}</p>
                </div>
              </div>
            </Card>
          )}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                <span className="font-medium">Tarawih Prayers</span>
              </div>
              <span className="text-sm text-muted-foreground">{data.tarawihPrayers.length}/30 nights</span>
            </div>

            <Progress value={(data.tarawihPrayers.length / 30) * 100} className="h-3" />

            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 30 }).map((_, i) => {
                const nightDate = new Date(data.startDate);
                nightDate.setDate(nightDate.getDate() + i);
                const isCompleted = data.tarawihPrayers.includes(nightDate.toDateString());
                const isTonight = i + 1 === currentDay;

                return (
                  <div
                    key={i}
                    className={`aspect-square rounded flex items-center justify-center text-xs font-medium ${isCompleted
                      ? 'bg-purple-500 text-white'
                      : isTonight
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-muted'
                      }`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>

            <Button
              className="w-full"
              variant={data.tarawihPrayers.includes(new Date().toDateString()) ? "outline" : "default"}
              onClick={toggleTarawih}
            >
              {data.tarawihPrayers.includes(new Date().toDateString()) ? (
                <>
                  <Check className="w-4 h-4 ms-2" />
                  Tonight Tarawih ✓
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 ms-2" />
                  Mark Tonight Tarawih
                </>
              )}
            </Button>
          </Card>

          {/* Water Reminders Settings */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Water Reminders</span>
              </div>
              <Switch
                checked={data.waterRemindersEnabled}
                onCheckedChange={toggleWaterReminders}
              />
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>💧 <strong>After Iftar:</strong></p>
              <ul className="ms-4 space-y-1 text-xs">
                <li>• 15 min - First glass of water</li>
                <li>• 30 min - Stay hydrated</li>
                <li>• 45 min - Keep drinking water</li>
                <li>• 60 min - One hour after Iftar</li>
                <li>• 90 min - Hydration break</li>
                <li>• 120 min - Important hydration time</li>
                <li>• 150 min - Keep energy up</li>
                <li>• 180 min - Final reminder before Suhoor</li>
              </ul>
              
              <p className="mt-3">🌙 <strong>Before Suhoor:</strong></p>
              <ul className="ms-4 space-y-1 text-xs">
                <li>• 20 min after Suhoor starts - Final hydration before fasting</li>
              </ul>
              
              <p className="mt-3 text-xs text-muted-foreground">
                Helps maintain proper hydration during Ramadan fasting hours
              </p>
            </div>
          </Card>

          {/* Charity & Good Deeds */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/5 border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-600 dark:text-green-400">Charity</span>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">${data.charityAmount}</p>
                <p className="text-xs text-muted-foreground mb-3">total given</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => addCharity(-10)} disabled={data.charityAmount < 10}>
                    -$10
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addCharity(10)}>
                    +$10
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-blue-600 dark:text-blue-400">Good Deeds</span>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.goodDeeds}</p>
                <p className="text-xs text-muted-foreground mb-3">this Ramadan</p>
                <Button variant="outline" size="sm" onClick={addGoodDeed} className="w-full">
                  + Add Deed
                </Button>
              </div>
            </Card>
          </div>
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="font-medium">Quran Reading</span>
              </div>
              <span className="text-sm text-muted-foreground">Juz {juzCompleted}/30</span>
            </div>

            <Progress value={quranPercentage} className="h-3" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-primary">{data.quranProgress}</p>
                <p className="text-xs text-muted-foreground">pages read (of 604)</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuranProgress(-1)}
                  disabled={data.quranProgress <= 0}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuranProgress(1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  onClick={() => updateQuranProgress(data.dailyQuranGoal)}
                >
                  +{data.dailyQuranGoal}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Daily goal: {data.dailyQuranGoal} pages ({Math.round(604 / 30)} pages/day to finish)
            </p>
          </Card>

          {/* Ramadan Progress Summary */}
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-medium text-primary">Ramadan Progress</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {Math.round((data.fastingDays.length / 30) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">Fasting</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {Math.round((data.tarawihPrayers.length / 30) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">Tarawih</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {Math.round(quranPercentage)}%
                </div>
                <p className="text-xs text-muted-foreground">Quran</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {data.goodDeeds}
                </div>
                <p className="text-xs text-muted-foreground">Good Deeds</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-primary/20">
              <p className="text-center text-sm text-muted-foreground">
                "Whoever fasts Ramadan out of faith and hope for reward, their past sins will be forgiven."
              </p>
              <p className="text-center text-xs text-muted-foreground mt-1">
                - Prophet Muhammad ﷺ
              </p>
            </div>
          </Card>
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="font-medium">Ramadan Calendar</span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-xs text-muted-foreground font-medium py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {/* Calculate starting day offset */}
              {Array.from({ length: new Date(data.startDate).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: 30 }).map((_, i) => {
                const dayDate = new Date(data.startDate);
                dayDate.setDate(dayDate.getDate() + i);
                const isFasted = data.fastingDays.includes(dayDate.toDateString());
                const isToday = i + 1 === currentDay;

                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-full flex items-center justify-center text-xs ${isFasted
                      ? 'bg-green-500 text-white'
                      : isToday
                        ? 'bg-primary text-primary-foreground'
                        : i + 1 < currentDay
                          ? 'bg-muted text-muted-foreground'
                          : 'text-foreground'
                      }`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Reset */}
          <Button variant="outline" className="w-full" onClick={resetRamadan}>
            Reset Ramadan Tracker
          </Button>
        </div>
      </div>

      {/*
        Memoized 1/sec countdown ticker.  Lives in its own component so its
        setInterval-triggered setState only re-renders the countdown bits of
        the page (the card that shows "Next Event: 3h 22m"), NOT the 12+
        framer-motion cards that make up the rest of RamadanMode.
      */}
      <NextEventCountdownTicker
        enabled={isRamadan}
        suhoorTime={suhoorTime}
        iftarTime={iftarTime}
        onEventChange={handleNextEventChange}
      />
    </LayoutManager>
  );
}
