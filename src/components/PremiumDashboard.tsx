import React, { useEffect, memo, lazy, Suspense, useState } from "react";
import { m } from "framer-motion";
import { Bell, MapPin, ChevronRight, ChevronDown, Activity, Compass, X, Clock, Sparkles } from "lucide-react";
import { formatTime } from "@/lib/time-formatter";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { useI18n } from "@/hooks/useI18n";
import { globalTimerManager } from "@/lib/timer-manager";
import { useAnimationTier } from "@/hooks/useAnimationTier";
import { PRAYER_ARABIC_NAMES } from "@/lib/prayer-display";

// Lazy load widget components to reduce initial bundle size
const EnhancedDailyAyah = lazy(() => import("@/components/EnhancedDailyAyah"));
const EnhancedDailyHadith = lazy(() => import("@/components/EnhancedDailyHadith"));
const RamadanWidget = lazy(() => import("@/components/RamadanWidget"));
const WeeklySalahChart = lazy(() => import("@/components/WeeklySalahChart"));
const QuranProgressWidget = lazy(() => import("@/components/QuranProgressWidget"));
const IslamicEventsWidget = lazy(() => import("@/components/IslamicEventsWidget"));
const QazaTracker = lazy(() => import("@/components/QazaTracker"));

const WidgetFallback = () => <div className="h-40 w-full rounded-2xl bg-card/40 animate-pulse border border-border/40" />;

/**
 * Per-prayer identity tints for the dashboard grid icon chips (subtle alpha
 * washes that sit on both light and dark themes): dawn indigo for Fajr,
 * high-sun gold for Dhuhr, deepening amber for Asr, sunset rose for Maghrib
 * and night blue for Isha. Active prayer keeps the brand amber.
 */
const PRAYER_TINTS: Record<string, { bg: string; color: string }> = {
  fajr: { bg: 'rgba(99,102,241,0.12)', color: '#818CF8' },
  sunrise: { bg: 'rgba(251,191,36,0.14)', color: '#D97706' },
  dhuhr: { bg: 'rgba(245,158,11,0.13)', color: '#F59E0B' },
  asr: { bg: 'rgba(217,119,6,0.12)', color: '#D97706' },
  maghrib: { bg: 'rgba(244,63,94,0.11)', color: '#FB7185' },
  isha: { bg: 'rgba(96,165,250,0.12)', color: '#60A5FA' },
  jummah: { bg: 'rgba(201,134,10,0.13)', color: '#C9860A' },
};

const iconTintStyle = (prayerName: string, isActive?: boolean): React.CSSProperties => {
  if (isActive) return { background: 'rgba(201,134,10,0.14)', color: '#C9860A' };
  const tint = PRAYER_TINTS[(prayerName || '').toLowerCase()];
  return tint
    ? { background: tint.bg, color: tint.color }
    : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' };
};

/** Decorative eight-pointed star (khatam) used on the dark hero cards. */
const HeroStarOrnament = ({ className = '', opacity = 0.12 }: { className?: string; opacity?: number }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 100 100"
    className={`pointer-events-none ${className}`}
    style={{ opacity }}
  >
    <g stroke="#C9860A" strokeWidth="1" fill="none">
      <rect x="28" y="28" width="44" height="44" rx="2" />
      <rect x="28" y="28" width="44" height="44" rx="2" transform="rotate(45 50 50)" />
      <circle cx="50" cy="50" r="13" />
      <circle cx="50" cy="50" r="5" />
    </g>
  </svg>
);


interface PrayerTime {
  name: string;
  /** Internal prayer key — differs from `name` on Fridays (Jummah display). */
  originalName?: string;
  time: string;
  /** Formatted END of the prayer's valid time window ("06:12") — already localized. */
  endsAt?: string;
  /** Optional i18n key explaining the end basis (e.g. islamicMidnight for Isha). */
  endsBasisKey?: string;
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
  // Optional (nafl) prayer windows — collapsed behind a small toggle chip.
  const [showOptionalPrayers, setShowOptionalPrayers] = useState(false);

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

  // Arabic name of the upcoming prayer (decorative companion line in the hero).
  const nextPrayerArabicName = (() => {
    const rawName = (nextPrayer.name || '').trim();
    if (!rawName || rawName === 'Loading...') return null;
    const base = rawName.replace(/\s*\([^)]*\)\s*/g, '').trim();
    return PRAYER_ARABIC_NAMES[base] || null;
  })();

  // End of the upcoming prayer's valid window, promoted to the hero so the
  // countdown card answers "until when?" without hunting the grid below.
  const upcomingEndsAt = prayers.find((p) => p.isUpcoming)?.endsAt || null;

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
                  aria-label={t('close')}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <X className="w-4 h-4" />
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
            aria-label={`${t('changeCity')}: ${displayLocation}`}
            className="flex items-center gap-2 ps-3 pe-2 py-1.5 rounded-full transition-all active:scale-95 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            style={{ background: 'rgba(201,134,10,0.08)', borderColor: 'rgba(201,134,10,0.22)' }}
          >
            <MapPin className="w-3.5 h-3.5" style={{ color: '#C9860A' }} />
            <span className="text-xs font-semibold max-w-[130px] truncate text-foreground/85">
              {displayLocation}
            </span>
            <ChevronRight className="w-3 h-3 text-muted-foreground chevron-right rtl-icon" />
          </button>

          {/* Notification bell */}
          <button
            onClick={onNotificationClick}
            aria-label={t('notificationHistory')}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 bg-muted/60 border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
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
          {/* Eight-pointed star ornament — ties the hero to the Services hub. */}
          <HeroStarOrnament className="absolute -top-7 -right-7 w-40 h-40 z-0" opacity={0.14} />
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
              <div className="min-w-0">
                <p className="text-3xl font-bold text-white leading-tight" style={{ fontFamily: 'inherit', fontStyle: 'italic' }}>
                  {nextPrayerDisplayName}
                </p>
                {/* Arabic prayer name — hidden from AT, decorative for sighted users. */}
                {nextPrayerArabicName && (
                  <p aria-hidden="true" dir="rtl" lang="ar" className="text-base font-semibold text-white/50 mt-1">
                    {nextPrayerArabicName}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-0.5">{t('inCountdownLabel')}</p>
                <LiveCountdown targetTime={nextPrayer.targetTime} />
              </div>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-white/40">{t('atTime', { time: nextPrayer.time })}</span>
              {upcomingEndsAt && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  dir="auto"
                  style={{ background: 'rgba(201,134,10,0.12)', color: '#E8A020' }}
                >
                  <Clock className="w-2.5 h-2.5" strokeWidth={2.5} />
                  {t('endsAt', { time: upcomingEndsAt })}
                </span>
              )}
            </div>
            {/* Amber progress bar */}
            <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <m.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #C9860A, #E8A020)', boxShadow: '0 0 8px rgba(201,134,10,0.55)' }}
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
                      <div className="flex items-center justify-between px-1 mb-1">
                        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t('prayerTimes')}</h2>
                        <button
                          onClick={onLocationClick}
                          aria-label={t('changeCity')}
                          className="text-xs font-semibold uppercase tracking-widest transition-all text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-full px-2 py-1 min-h-[32px]"
                        >
                          {t('changeCity')}
                        </button>
                      </div>
                      {/* One-line rule for how the shown end times are derived
                          (single source of truth, mirrored in the README). */}
                      <p className="text-[11px] leading-snug text-muted-foreground/80 px-1 mb-3" dir="auto">
                        {t('endsFormula')}
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        {prayers.length === 0 && (
                          // Loading skeleton — same footprint as a prayer card
                          // (icon chip, name, time, ends chip) so the grid never
                          // jumps when times arrive.
                          <>
                            {[0, 1, 2, 3].map((i) => (
                              <div
                                key={`prayer-skeleton-${i}`}
                                aria-hidden="true"
                                className="p-4 rounded-[20px] bg-card/60 border border-border/40 animate-pulse"
                              >
                                <div className="w-8 h-8 rounded-xl bg-muted mb-3" />
                                <div className="h-3.5 w-16 rounded bg-muted mb-2" />
                                <div className="h-3 w-12 rounded bg-muted mb-2" />
                                <div className="h-4 w-20 rounded-full bg-muted" />
                              </div>
                            ))}
                          </>
                        )}
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
                            {/* Amber wash bleeding down from the top edge on the
                                current prayer — reads as "you are here". */}
                            {prayer.isActive && (
                              <div
                                aria-hidden="true"
                                className="absolute inset-x-0 top-0 h-16 pointer-events-none"
                                style={{ background: 'linear-gradient(180deg, rgba(201,134,10,0.10), transparent)' }}
                              />
                            )}
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-3">
                                <div
                                  className="w-8 h-8 flex items-center justify-center rounded-xl"
                                  style={iconTintStyle(prayer.originalName || prayer.name, prayer.isActive)}
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
                              {prayer.endsAt && (
                                <span
                                  className={`inline-flex items-center gap-1 mt-1.5 px-2 py-[3px] rounded-full border text-[10px] font-semibold ${prayer.isActive ? '' : 'bg-muted/50 border-border/60 text-muted-foreground'}`}
                                  dir="auto"
                                  title={prayer.endsBasisKey ? t(prayer.endsBasisKey) : undefined}
                                  style={prayer.isActive
                                    ? { background: 'rgba(201,134,10,0.10)', borderColor: 'rgba(201,134,10,0.28)', color: '#C9860A' }
                                    : undefined}
                                >
                                  <Clock className="w-2.5 h-2.5" strokeWidth={2.5} />
                                  {t('endsAt', { time: prayer.endsAt })}
                                </span>
                              )}
                            </div>
                          </m.div>
                        ))}
                      </div>

                      {/* Optional (nafl) prayer windows — Ishraq / Duha / Tahajjud.
                          Computed offline (madhab-aware) by the prayer hook; hidden
                          behind a small chip so the main grid stays clean. */}
                      {(() => {
                        const we = prayerTimesHook?.prayerTimesWithEnd || null;
                        const rows = we ? [
                          { key: 'ishraq', win: we.ishraq },
                          { key: 'duha', win: we.duha },
                          { key: 'tahajjud', win: we.tahajjud },
                        ].filter(r => r.win?.start && r.win?.end
                          && !Number.isNaN(new Date(r.win.start).getTime())
                          && !Number.isNaN(new Date(r.win.end).getTime())) : [];
                        if (rows.length === 0) return null;
                        return (
                          <div className="mt-3 px-1">
                            <button
                              type="button"
                              onClick={() => setShowOptionalPrayers(v => !v)}
                              aria-expanded={showOptionalPrayers}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 active:scale-95 transition-all min-h-[32px] ${showOptionalPrayers ? 'text-foreground border-primary/40' : ''}`}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {t('extraPrayers')}
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOptionalPrayers ? 'rotate-180' : ''}`} />
                            </button>
                            {showOptionalPrayers && (
                              <div className="mt-2 grid grid-cols-3 gap-3">
                                {rows.map(({ key, win }) => (
                                  <div key={key} className="p-3 rounded-[16px] bg-card/60 border border-border/60">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/80" dir="auto">{t(key)}</p>
                                    <p className="text-sm font-bold text-foreground mt-0.5 tabular-nums" dir="auto">{formatTime(new Date(win.start), timeFormat)}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5" dir="auto">
                                      {t('endsAt', { time: formatTime(new Date(win.end), timeFormat) })}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
          </m.section>

          {/* ── Daily Salah ── */}
          <m.div
            {...motionProps({
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.4 }
            })}
            className="p-5 rounded-[28px] bg-card/80 border border-border/40"
          >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t('dailySalah')}</h3>
                        <div className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(201,134,10,0.1)', color: '#C9860A' }}>
                          {prayers.filter(p => p.isCompleted).length} / 5
                        </div>
                      </div>
                      {prayers.length === 0 ? (
                        // Loading skeleton — five pulse circles matching the
                        // check-in row footprint so nothing jumps on arrival.
                        <div className="flex items-center justify-between" aria-hidden="true">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div key={`salah-skeleton-${i}`} className="flex flex-col items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                              <div className="w-7 h-2.5 rounded-full bg-muted animate-pulse" />
                            </div>
                          ))}
                        </div>
                      ) : (
                      <div className="flex items-center justify-between">
                        {prayers.map((prayer) => {
                          const labelPrayer = t((prayer.originalName || prayer.name).toLowerCase());
                          return (
                          <button
                            key={`tracker-${prayer.name}`}
                            onClick={() => prayer.onCheckIn?.()}
                            aria-label={
                              prayer.isCompleted
                                ? t('prayerCheckInCompletedAria', { prayer: labelPrayer })
                                : t('prayerCheckInAria', { prayer: labelPrayer })
                            }
                            className="flex flex-col items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-full p-1"
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
                          );
                        })}
                      </div>
                      )}
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
