import React, { useEffect, memo, lazy, Suspense, useState } from "react";
import { m } from "framer-motion";
import { Bell, MapPin, ChevronRight, Activity, Compass, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { useI18n } from "@/hooks/useI18n";
import { globalTimerManager } from "@/lib/timer-manager";
import { useAnimationTier } from "@/hooks/useAnimationTier";

// Lazy load widget components to reduce initial bundle size
const EnhancedDailyAyah = lazy(() => import("@/components/EnhancedDailyAyah"));
const EnhancedDailyHadith = lazy(() => import("@/components/EnhancedDailyHadith"));
const RamadanWidget = lazy(() => import("@/components/RamadanWidget"));
const WeeklySalahChart = lazy(() => import("@/components/WeeklySalahChart"));
const QuranProgressWidget = lazy(() => import("@/components/QuranProgressWidget"));
const IslamicEventsWidget = lazy(() => import("@/components/IslamicEventsWidget"));
const QazaTracker = lazy(() => import("@/components/QazaTracker"));

const WidgetFallback = () => <div className="h-40 w-full rounded-2xl bg-card/40 animate-pulse border border-border/40 backdrop-blur-sm" />;


interface PrayerTime {
  name: string;
  time: string;
  icon: React.ReactNode;
  isActive?: boolean;
  isUpcoming?: boolean;
  isCompleted?: boolean;
  onCheckIn?: () => void;
}

interface PremiumDashboardProps {
  hijriDate: string;
  nextPrayer: {
    name: string;
    time: string;
    targetTime?: Date | null;
    progress: number;
  };
  prayers: PrayerTime[];
  locationLabel: string;
  onServiceClick?: (route: string) => void;
  onVerseClick?: () => void;
  onHadithClick?: () => void;
  onNotificationClick?: () => void;
  onLocationClick?: () => void;
  showManualLocationDialog: boolean;
  setShowManualLocationDialog: (show: boolean) => void;
  LocationSearch: any;
  GeocodingService: any;
  AladhanAPI: any;
  location: any;
  prayerTimesHook: any;
  setLoadingAPI: (loading: boolean) => void;
  toast: any;
}

function LiveClock({ animationEnabled, hijriDate, timeFormat }: { animationEnabled: boolean; hijriDate: string; timeFormat: '12' | '24' }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = globalTimerManager.addCallback(() => setTime(new Date()), 10000, 'premium-clock');
    return () => globalTimerManager.removeCallback(timerId);
  }, []);

  const timeStr = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12',
  });

  return (
    <div className="text-center pt-3 pb-4 flex flex-col justify-center items-center gap-1">
      <h1
        className="font-black leading-none tracking-tighter text-foreground"
        style={{ fontSize: 'clamp(52px, 18vw, 96px)' }}
      >
        {timeStr}
      </h1>
      <p
        className="text-sm md:text-base font-semibold tracking-wide text-primary px-4 text-center leading-tight"
      >
        {hijriDate}
      </p>
    </div>
  );
}

function LiveCountdown({ targetTime }: { targetTime?: Date | null }) {
  const [timeRemaining, setTimeRemaining] = useState("00:00:00");

  useEffect(() => {
    if (!targetTime) {
      setTimeRemaining("00:00:00");
      return;
    }

    const updateDisplay = () => {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining(prev => (prev === "00:00:00" ? prev : "00:00:00"));
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const countdownStr = hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : `${minutes}m ${seconds}s`;

      setTimeRemaining(prev => (prev === countdownStr ? prev : countdownStr));
    };

    updateDisplay();
    const timerId = globalTimerManager.addCallback(updateDisplay, 1000, 'premium-countdown');
    return () => globalTimerManager.removeCallback(timerId);
  }, [targetTime]);

  return <span className="text-sm font-black font-mono tabular-nums" style={{ color: '#C9860A' }}>{timeRemaining}</span>;
}

function PremiumDashboardInner({
  hijriDate,
  nextPrayer,
  prayers,
  locationLabel,
  onNotificationClick,
  onLocationClick,
  showManualLocationDialog,
  setShowManualLocationDialog,
  LocationSearch,
  GeocodingService,
  AladhanAPI,
  location,
  prayerTimesHook,
  setLoadingAPI,
  toast,
}: PremiumDashboardProps) {
  const { animationEnabled } = useSettings();
  const { tier } = useAnimationTier();
  const { isRamadan, ramadanDay } = useIslamicCalendar();
  const { t } = useI18n();
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>(() => (localStorage.getItem('time-format') as '12' | '24') || '24');

  useEffect(() => {
    const handleFormatChange = (e: CustomEvent) => {
      if (e.detail?.format) setTimeFormat(e.detail.format as '12' | '24');
    };
    window.addEventListener('time-format-changed', handleFormatChange as EventListener);
    return () => window.removeEventListener('time-format-changed', handleFormatChange as EventListener);
  }, []);

  const motionProps = (props: any) => (animationEnabled && tier !== 'low' && tier !== 'minimal') ? props : {};

  // Location label with a translated "(Offline)" suffix — the stored
  // locationName embeds a literal English " (Offline)" (see location-state.ts),
  // which leaked into every language. Split it off and use offlineSuffix.
  const hasOfflineSuffix = /\(\s*offline\s*\)\s*$/i.test(locationLabel || '');
  const bareLocation = (locationLabel || '').replace(/\s*\(\s*offline\s*\)\s*$/i, '').trim();
  const offlineSuffixT = t('offlineSuffix');
  const displayLocation = hasOfflineSuffix && offlineSuffixT !== 'offlineSuffix'
    ? `${bareLocation} ${offlineSuffixT}`
    : (locationLabel || '');

  // Translate the next-prayer name. The API returns names like "Fajr",
  // "Sunrise", or "Fajr (Tomorrow)". Lowercasing the whole string made keys
  // like "fajr (tomorrow)" miss and leak the raw key into the UI; translate
  // the base prayer name and append the localized "tomorrow" instead.
  const nextPrayerDisplayName = (() => {
    const rawName = (nextPrayer.name || '').trim();
    if (!rawName || rawName === 'Loading...') return t('loading');
    const isTomorrow = /\(\s*tomorrow\s*\)/i.test(rawName);
    const base = rawName.replace(/\s*\([^)]*\)\s*/g, '').trim() || rawName;
    const baseKey = base.toLowerCase();
    const translated = t(baseKey);
    // i18next returns the key itself on a miss — fall back to the proper-cased name
    const baseName = translated && translated !== baseKey ? translated : base;
    const tomorrowT = t('tomorrow');
    return isTomorrow && tomorrowT !== 'tomorrow'
      ? `${baseName} (${tomorrowT})`
      : baseName;
  })();

  return (
    <div
      className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300"
    >
      {/* Manual Location Dialog */}
      {showManualLocationDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <m.div
            {...motionProps({ initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } })}
            className="w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden bg-card border border-border/40 shadow-2xl rounded-[32px] transition-colors"
          >
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-foreground">{t('setLocation')}</h3>
                <button
                  onClick={() => setShowManualLocationDialog(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  <Grid3X3 className="w-4 h-4 rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={async () => {
                    const success = await location.detectLocation();
                    if (success) {
                      toast({ title: t('locationDetected'), description: t('updatedTo', { name: location.locationName }) });
                      setShowManualLocationDialog(false);
                    } else {
                      toast({ title: t('locationDetectionFailed'), description: t('pleaseEnableLocationPermissions'), variant: "destructive" });
                    }
                  }}
                  disabled={location.isDetecting}
                  className="w-full h-12 rounded-2xl font-bold text-white gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 border-none hover:opacity-90 transition-opacity"
                >
                  {location.isDetecting ? <Activity className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
                  {location.isDetecting ? t('detecting') : t('autoDetectGpsIp')}
                </Button>

                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('orSearch')}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <LocationSearch
                  onLocationSelect={async (city: string, country: string) => {
                    try {
                      setLoadingAPI(true);
                      AladhanAPI.clearCachedData();
                      const coords = await GeocodingService.getCityCoordinates(city, country);
                      const result = await AladhanAPI.getTodaysPrayerTimes(coords.latitude, coords.longitude, 1);
                      location.setLocation(coords.latitude, coords.longitude, `${city}, ${country}`, result.timezone);
                      await prayerTimesHook.setManualLocation(city, country);
                      setShowManualLocationDialog(false);
                      toast({ title: t('locationUpdated'), description: t('timeAdjustedTo', { timezone: result.timezone }) });
                    } catch (err) {
                      toast({ title: t('selectionFailed'), description: t('couldNotSyncTimezone'), variant: "destructive" });
                    } finally {
                      setLoadingAPI(false);
                    }
                  }}
                  isLoading={prayerTimesHook.isLoading}
                />
              </div>
            </div>
          </m.div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-5 pb-36 pt-safe-top space-y-6 max-w-lg mx-auto w-full">

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between pt-4">
          {/* Location pill */}
          <button
            onClick={onLocationClick}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full transition-all active:scale-95 border"
            style={{ background: 'rgba(201,134,10,0.08)', borderColor: 'rgba(201,134,10,0.22)' }}
          >
            <MapPin className="w-3.5 h-3.5" style={{ color: '#C9860A' }} />
            <span className="text-xs font-semibold max-w-[130px] truncate text-foreground/85">
              {displayLocation}
            </span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </button>

          {/* Notification bell */}
          <button
            onClick={onNotificationClick}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 bg-muted/60 border border-border"
          >
            <Bell className="w-4 h-4 text-foreground/60" />
          </button>
        </div>

        {/* ── Hero Time & Date ── */}
        <LiveClock animationEnabled={animationEnabled} hijriDate={hijriDate} timeFormat={timeFormat} />

        {/* ── Next Prayer Card (Azimuth dark style) ── */}
        <m.div
          {...motionProps({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.2, duration: 0.5 } })}
          className="relative overflow-hidden rounded-[24px]"
          style={{ background: 'linear-gradient(145deg, #1A1E2E, #1E2438)', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}
        >
          <div className="relative z-10 p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#C9860A' }}>
                {t('nextPrayer')}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                {displayLocation}
              </p>
            </div>
            <div className="flex items-end justify-between mb-4">
              <p className="text-3xl font-bold text-white" style={{ fontFamily: 'inherit', fontStyle: 'italic' }}>
                {nextPrayerDisplayName}
              </p>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-0.5">{t('inCountdownLabel')}</p>
                <LiveCountdown targetTime={nextPrayer.targetTime} />
              </div>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-white/40">{t('atTime', { time: nextPrayer.time })}</span>
            </div>
            {/* Amber progress bar */}
            <div className="h-[3px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <m.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #C9860A, #E8A020)' }}
                {...motionProps({ initial: { width: 0 }, animate: { width: `${nextPrayer.progress}%` }, transition: { duration: 1, ease: 'easeOut', delay: 0.4 } })}
              />
            </div>
          </div>
        </m.div>

        {/* ── Dashboard Sections ── */}
        <div className="space-y-6">
          {/* ── Prayer Times ── */}
          <m.section
            {...motionProps({
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.4 }
            })}
            className="w-full"
          >
                      <div className="flex items-center justify-between px-1 mb-4">
                        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t('prayerTimes')}</h2>
                        <button
                          onClick={onLocationClick}
                          className="text-xs font-semibold uppercase tracking-widest transition-all text-muted-foreground hover:text-foreground"
                        >
                          {t('changeCity')}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {prayers.map((prayer, i) => (
                          <m.div
                            key={prayer.name}
                            {...motionProps({
                              initial: { opacity: 0, scale: 0.92 },
                              animate: { opacity: 1, scale: 1 },
                              transition: { delay: i * 0.05, type: 'spring', stiffness: 220, damping: 20 },
                            })}
                            className="relative overflow-hidden p-4 rounded-[20px] bg-card border border-border"
                            style={prayer.isActive ? {
                              borderColor: 'rgba(201,134,10,0.3)',
                              boxShadow: '0 0 0 1px rgba(201,134,10,0.1)',
                            } : {}}
                          >
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-3">
                                <div
                                  className="w-8 h-8 flex items-center justify-center rounded-xl"
                                  style={prayer.isActive
                                    ? { background: 'rgba(201,134,10,0.12)', color: '#C9860A' }
                                    : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                                >
                                  {prayer.icon}
                                </div>
                                {prayer.isUpcoming && (
                                  <span
                                    className="text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                    style={{ background: 'rgba(201,134,10,0.1)', color: '#C9860A' }}
                                  >
                                    {t('next')}
                                  </span>
                                )}
                              </div>

                              <p className="font-bold text-sm leading-tight text-foreground">
                                {t(prayer.name.toLowerCase())}
                              </p>
                              <p className="text-sm mt-0.5 font-semibold" style={{ color: prayer.isActive ? '#C9860A' : 'hsl(var(--muted-foreground))' }}>
                                {prayer.time}
                              </p>
                            </div>
                          </m.div>
                        ))}
                      </div>
          </m.section>

          {/* ── Daily Salah ── */}
          <m.div
            {...motionProps({
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.4 }
            })}
            className="p-5 rounded-[28px] bg-card/40 border border-border/40 backdrop-blur-md"
          >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t('dailySalah')}</h3>
                        <div className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(201,134,10,0.1)', color: '#C9860A' }}>
                          {prayers.filter(p => p.isCompleted).length} / 5
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        {prayers.map((prayer) => (
                          <button
                            key={`tracker-${prayer.name}`}
                            onClick={() => prayer.onCheckIn?.()}
                            className="flex flex-col items-center gap-2 group"
                          >
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
                              style={prayer.isCompleted
                                ? { background: '#C9860A', color: 'white', boxShadow: '0 0 14px rgba(201,134,10,0.35)', transform: 'scale(1.1)' }
                                : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}
                            >
                              {prayer.isCompleted ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                prayer.icon
                              )}
                            </div>
                            <span className="text-xs font-semibold" style={{ color: prayer.isCompleted ? '#C9860A' : 'hsl(var(--muted-foreground))' }}>
                              {t(prayer.name.toLowerCase()).slice(0, 3)}
                            </span>
                          </button>
                        ))}
                      </div>
          </m.div>

          {/* ── Daily Ayah ── */}
          <m.div
            {...motionProps({
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.4 }
            })}
          >
            <Suspense fallback={<WidgetFallback />}><EnhancedDailyAyah /></Suspense>
          </m.div>

          {/* ── Daily Hadith ── */}
          <m.div
            {...motionProps({
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.4 }
            })}
          >
            <Suspense fallback={<WidgetFallback />}><EnhancedDailyHadith /></Suspense>
          </m.div>

          {/* ── Ramadan (Suhoor/Iftar) — shown only during Ramadan ── */}
          {isRamadan && (
            <m.div
              {...motionProps({
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.4 }
              })}
            >
              <Suspense fallback={<WidgetFallback />}>
                <RamadanWidget
                  isRamadan={isRamadan}
                  ramadanDay={ramadanDay}
                  prayerTimesWithEnd={prayerTimesHook?.prayerTimesWithEnd || null}
                  timeFormat={timeFormat}
                />
              </Suspense>
            </m.div>
          )}

          {/* ── Weekly Salah Chart ── */}
          <m.div
            {...motionProps({
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.4 }
            })}
          >
            <Suspense fallback={<WidgetFallback />}><WeeklySalahChart /></Suspense>
          </m.div>

          {/* ── Quran Progress ── */}
          <m.div
            {...motionProps({
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.4 }
            })}
          >
            <Suspense fallback={<WidgetFallback />}><QuranProgressWidget /></Suspense>
          </m.div>

          {/* ── Islamic Events ── */}
          <m.div
            {...motionProps({
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.4 }
            })}
          >
            <Suspense fallback={<WidgetFallback />}><IslamicEventsWidget /></Suspense>
          </m.div>

          {/* ── Qaza Tracker ── */}
          <m.div
            {...motionProps({
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.4 }
            })}
          >
            <Suspense fallback={<WidgetFallback />}><QazaTracker compact={true} /></Suspense>
          </m.div>
        </div>
      </div>
    </div>
  );
}

export const PremiumDashboard = memo(PremiumDashboardInner);
export default PremiumDashboard;
