import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BottomNav from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { notificationManager } from "@/lib/notification-manager";
import { serviceWorkerManager } from "@/lib/service-worker-registration";

import { islamicEventsService } from "@/lib/islamic-events-service";
import { LayoutManager } from "@/components/LayoutManager";
import { SplashScreen } from "@/components/SplashScreen";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { LazyMotionWrapper } from "@/components/LazyMotionWrapper";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n-new";
import { LOCATION_STORAGE_KEY } from "@/lib/location-config";
import { useWidgetSync } from "@/hooks/useWidgetSync";
import { App as CapacitorApp } from '@capacitor/app';
import { AutoBackupRestoreDialog } from "@/components/AutoBackupRestoreDialog";
import { initBackupService } from "@/lib/backup-service";
import { useAutoBackup } from "@/hooks/useAutoBackup";
import { useAnimationTier } from "@/hooks/useAnimationTier";
import { preloadCriticalResources, isLowEndDevice, monitorFPS } from "@/lib/performance-optimizations";
import { applyTieredVisualOverrides, getAnimationTier } from "@/lib/device-performance";

/**
 * DeepLinkListener — subscribes to widget deep-links (noorconnect://app/<path>?<query>)
 * and routes them through React Router. Must live inside <BrowserRouter> so useNavigate works.
 *
 * Handles both cold start (Capacitor delivers the launch URL on appUrlOpen) and warm start
 * (MainActivity.onNewIntent forwards the intent to the App plugin). No-op on web.
 */
function DeepLinkListener() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    const routeFromUrl = (rawUrl: string) => {
      if (!rawUrl) return;
      // Accept "noorconnect://app/<path>" and bare "/<path>"
      const path = rawUrl.replace(/^noorconnect:\/\/app/, '').replace(/^https?:\/\/[^/]+/, '');
      if (!path || path === '/' || cancelled) return;
      try {
        navigate(path, { replace: true });
      } catch (e) {
        // ignore navigation errors (e.g. unknown route)
        console.warn('DeepLinkListener: could not navigate to', path, e);
      }
    };

    // Warm start: subsequent URL opens while app is running
    const cleanupPromise = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      routeFromUrl(url);
    });

    // Cold start: if app was launched from a widget tap, get the launch URL
    CapacitorApp.getLaunchUrl()
      .then(({ url }) => routeFromUrl(url))
      .catch(() => {});

    return () => {
      cancelled = true;
      cleanupPromise.then(h => h?.remove?.()).catch(() => {});
    };
  }, [navigate]);
  return null;
}

// Create QueryClient for React Query with performance optimizations
const isLowEndForQuery = isLowEndDevice();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: isLowEndForQuery ? 5 * 60 * 1000 : 60 * 60 * 1000, // 5 min for low-end, 1 hour for others
      gcTime: isLowEndForQuery ? 2 * 60 * 1000 : 5 * 60 * 1000, // 2 min for low-end, 5 min for others
      retry: isLowEndForQuery ? 0 : 1, // No retry for low-end devices
      refetchOnWindowFocus: false,
      refetchOnReconnect: !isLowEndForQuery, // Disable reconnection refetch on low-end
    },
    mutations: {
      retry: isLowEndForQuery ? 0 : 1,
    },
  },
});

// Global Players - Lazy loaded
const GlobalRadioPlayer = lazy(() => import("@/components/GlobalRadioPlayer").then(m => ({ default: m.GlobalRadioPlayer })));
const GlobalQuranPlayer = lazy(() => import("@/components/GlobalQuranPlayer").then(m => ({ default: m.GlobalQuranPlayer })));
const GlobalNasheedPlayer = lazy(() => import("@/components/GlobalNasheedPlayer").then(m => ({ default: m.GlobalNasheedPlayer })));
import { EidChecklistNotification } from "@/components/EidChecklistNotification";
import { FitranaCalculatorNotification } from "@/components/FitranaCalculatorNotification";

// Lazy load critical components
const GlobalPrayerAlarm = lazy(() => import("@/components/GlobalPrayerAlarm").then(module => ({ default: module.GlobalPrayerAlarm })));
const SalamGreeting = lazy(() => import("@/components/SalamGreeting").then(module => ({ default: module.SalamGreeting })));
const FestivePopup = lazy(() => import("@/components/FestivePopup").then(module => ({ default: module.FestivePopup })));
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt").then(module => ({ default: module.PWAInstallPrompt })));

import Dashboard from "./pages/Dashboard";

// Lazy load route components
const DashboardWidgets = lazy(() => import("./pages/DashboardWidgets"));
const SurahList = lazy(() => import("./pages/SurahList"));
const QuranReader = lazy(() => import("./pages/QuranReader"));
const QuranProgress = lazy(() => import("./pages/QuranProgress"));
const Tasbeeh = lazy(() => import("./pages/Tasbeeh"));
const Qibla = lazy(() => import("./pages/Qibla"));
const Duas = lazy(() => import("./pages/Duas"));
const Hadith = lazy(() => import("./pages/Hadith"));
const HadithCollections = lazy(() => import("./pages/HadithCollections"));
const HadithBook = lazy(() => import("./pages/HadithBook"));
const HadithBookContent = lazy(() => import("./pages/HadithBookContent"));
const HadithDetail = lazy(() => import("./pages/HadithDetail"));
const HadithBookmarksPage = lazy(() => import("./pages/HadithBookmarks"));
const Profile = lazy(() => import("./pages/Profile"));
const IslamicCalendar = lazy(() => import("./pages/IslamicCalendar"));
const Ebooks = lazy(() => import("./pages/EbooksModern"));
const QazaPage = lazy(() => import("./pages/QazaPage"));
const RamadanMode = lazy(() => import("./pages/RamadanMode"));

const NotificationHistory = lazy(() => import("./pages/NotificationHistory"));
const ZakatCalculator = lazy(() => import("./pages/ZakatCalculator"));
const NamesOfAllah = lazy(() => import("./pages/NamesOfAllah"));
const IslamicQuiz = lazy(() => import("./pages/EnhancedIslamicQuiz"));
const PrayerStats = lazy(() => import("./pages/PrayerStats"));
const HabitTracker = lazy(() => import("./pages/HabitTracker"));
const QuranRadio = lazy(() => import("./pages/QuranRadio"));
const QuranAudio = lazy(() => import("./pages/QuranAudio"));
const NasheedPlayer = lazy(() => import("./pages/NasheedPlayer"));
const LiveStreams = lazy(() => import("./pages/LiveStreams"));
const RadioStats = lazy(() => import("./pages/RadioStats"));
const Services = lazy(() => import("./pages/Services"));
const IslamicRemedies = lazy(() => import("./pages/IslamicRemedies"));
const RemedyFavorites = lazy(() => import("./pages/RemedyFavorites"));
const Tafsir = lazy(() => import("./pages/Tafsir-New"));
const EidChecklist = lazy(() => import("./pages/EidChecklist"));
const FitranaCalculator = lazy(() => import("./pages/FitranaCalculator"));
const Settings = lazy(() => import("./pages/Settings"));
const SettingsSubPage = lazy(() => import("./pages/SettingsSubPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SeerahHome = lazy(() => import("./pages/SeerahHome"));
const SeerahReader = lazy(() => import("./pages/SeerahReader"));
const HaidhTracker = lazy(() => import("./pages/HaidhTracker"));
const QisasHome = lazy(() => import("./pages/QisasHome"));
const QisasReader = lazy(() => import("./pages/QisasReader"));

function AnimationInitializer() {
  useEffect(() => {
    const storedAnimationPreference = localStorage.getItem("animations_enabled");
    const isLowEndDeviceCheck = isLowEndDevice();
    let isAnimationDisabled: boolean;

    if (storedAnimationPreference === null) {
      isAnimationDisabled = isLowEndDeviceCheck;
      localStorage.setItem("animations_enabled", isAnimationDisabled.toString());
    } else {
      isAnimationDisabled = storedAnimationPreference === "false";
    }

    if (isAnimationDisabled) {
      document.documentElement.classList.add("no-animations");
    }
    document.documentElement.dataset.animations = isAnimationDisabled ? "off" : "on";
  }, []);
  return null;
}

function AppRoutes() {
  const location = useLocation();
  const { t } = useTranslation(undefined, { i18n });

  // Scroll to top on navigation — single pass, no repeated layout thrashing
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      // Only reset the main scroll container instead of querySelectorAll('.overflow-y-auto')
      // which forces a layout query across the whole DOM on every navigation.
      const scrollContainer = document.getElementById("main-content");
      if (scrollContainer) scrollContainer.scrollTop = 0;
    };
    resetScroll();
    // A single deferred reset handles containers that mount after navigation.
    const id = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1128] via-[#1a237e] to-[#0d1b2a]">
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-[#e0c097]/30 border-t-[#e0c097]" />
          <p className="text-[#e0c097] text-sm font-semibold tracking-widest uppercase">{t('loading')}</p>
        </div>
      </div>
    }>
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard-widgets" element={<DashboardWidgets />} />
        {/* Widget deep-link targets (WidgetDeeplink.kt) that have no dedicated page */}
        <Route path="/prayers" element={<Navigate to="/dashboard" replace />} />
        <Route path="/quran/reading" element={<Navigate to="/quran-progress" replace />} />
        <Route path="/quran" element={<SurahList />} />
        <Route path="/quran-reader/:surahNumber" element={<Navigate to="/quran" replace />} />
        <Route path="/quran/:surahName" element={<QuranReader />} />
        <Route path="/quran-progress" element={<QuranProgress />} />
        <Route path="/tasbeeh" element={<Tasbeeh />} />
        <Route path="/qibla" element={<Qibla />} />
        <Route path="/duas" element={<Duas />} />
        <Route path="/hadith" element={<Hadith />} />
        <Route path="/hadith/collections" element={<HadithCollections />} />
        <Route path="/hadith/collections/:collection" element={<HadithBook />} />
        <Route path="/hadith/collections/:collection/:book" element={<HadithBookContent />} />
        <Route path="/hadith/collections/:collection/:book/:hadithNumber" element={<HadithDetail />} />
        <Route path="/hadith/bookmarks" element={<HadithBookmarksPage />} />
        <Route path="/seerah" element={<SeerahHome />} />
        <Route path="/seerah/:chapterId" element={<SeerahReader />} />
        <Route path="/qisas" element={<QisasHome />} />
        <Route path="/qisas/:prophetId" element={<QisasReader />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/calendar" element={<IslamicCalendar />} />
        <Route path="/ebooks" element={<Ebooks />} />
        <Route path="/qaza" element={<QazaPage />} />
        <Route path="/ramadan" element={<RamadanMode />} />
        <Route path="/menstrual-mode" element={<Navigate to="/noor-cycle" replace />} />
        <Route path="/enhanced-menstrual-mode" element={<Navigate to="/noor-cycle" replace />} />
        <Route path="/noor-cycle" element={<HaidhTracker />} />
        <Route path="/notification-history" element={<NotificationHistory />} />
        <Route path="/zakat" element={<ZakatCalculator />} />
        <Route path="/names-of-allah" element={<NamesOfAllah />} />
        <Route path="/quiz" element={<IslamicQuiz />} />
        <Route path="/prayer-stats" element={<PrayerStats />} />
        <Route path="/habit-tracker" element={<HabitTracker />} />
        <Route path="/quran-radio" element={<QuranRadio />} />
        <Route path="/quran-audio" element={<QuranAudio />} />
        <Route path="/nasheeds" element={<NasheedPlayer />} />
        <Route path="/live" element={<LiveStreams />} />
        <Route path="/radio-stats" element={<RadioStats />} />
        <Route path="/services" element={<Services />} />
        <Route path="/islamic-remedies" element={<IslamicRemedies />} />
        <Route path="/remedy-favorites" element={<RemedyFavorites />} />
        <Route path="/tafsir" element={<Tafsir />} />
        <Route path="/eid-checklist" element={<EidChecklist />} />
        <Route path="/fitrana-calculator" element={<FitranaCalculator />} />
        <Route path="/settings" element={<Navigate to="/profile" replace />} />
        <Route path="/settings/:sectionId" element={<SettingsSubPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function AppContent() {
  const { animationEnabled, greetingEnabled } = useSettings();
  const tier = useAnimationTier();
  const reduceMotion = tier.shouldReduceAnimations;

  return (
    <MotionConfig reducedMotion={(!animationEnabled || reduceMotion) ? "always" : "never"}>
      <LazyMotionWrapper>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="flex flex-col min-h-screen overflow-hidden">
            <div className="flex-shrink-0">
              <Suspense fallback={null}>
                <GlobalPrayerAlarm />
                {greetingEnabled && <SalamGreeting />}
                <FestivePopup />
                <PWAInstallPrompt />
                <EidChecklistNotification />
                <FitranaCalculatorNotification />
                <AutoBackupRestoreDialog />
              </Suspense>
            </div>

            <LayoutManager>
              <ErrorBoundary>
                <DeepLinkListener />
                <AppRoutes />
              </ErrorBoundary>
            </LayoutManager>
          </div>

          <BottomNav />
          <Suspense fallback={null}>
            <GlobalRadioPlayer />
            <GlobalQuranPlayer />
            <GlobalNasheedPlayer />
          </Suspense>
        </BrowserRouter>
      </LazyMotionWrapper>
    </MotionConfig>
  );
}

function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  const { animationEnabled, splashGreetingEnabled, splashEnabled } = useSettings();
  // Always-on auto backup: runs immediately, then every 20 minutes of app use
  // while any page is open (not just the Settings page).
  useAutoBackup();
  // Push Quran-progress + tasbeeh state to native widgets when they change
  useWidgetSync();
  
  // Initialize animation preference (deferred from module scope)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const storedAnimationPreference = localStorage.getItem("animations_enabled");
      const isLowEndDeviceCheck = isLowEndDevice();
      let isAnimationDisabled: boolean;

      if (storedAnimationPreference === null) {
        isAnimationDisabled = isLowEndDeviceCheck;
        localStorage.setItem("animations_enabled", isAnimationDisabled.toString());
      } else {
        isAnimationDisabled = storedAnimationPreference === "false";
      }

      if (isAnimationDisabled) {
        document.documentElement.classList.add("no-animations");
      }
      document.documentElement.dataset.animations = isAnimationDisabled ? "off" : "on";
    }
  }, []);

  // Apply tiered visual overrides (deferred from module scope)
  const tierInitializedRef = useRef(false);
  useEffect(() => {
    if (!tierInitializedRef.current) {
      tierInitializedRef.current = true;
      applyTieredVisualOverrides(getAnimationTier());
    }
  }, []);

  useEffect(() => {
    // If splash is disabled, hide it immediately
    if (!splashEnabled) {
      setShowSplash(false);
    }
  }, [splashEnabled]);

  // Initialize performance optimizations
  useEffect(() => {
    preloadCriticalResources();

    // ── FPS monitor: DEV only ─────────────────────────────────────────────
    // monitorFPS runs a lightweight rAF loop and fires its callback once per
    // second with the current frame rate.  We only enable this in development
    // so there is zero overhead in production APK builds.
    if (import.meta.env.DEV) {
      const stopFPS = monitorFPS((fps: number) => {
        // Colour-code: green ≥ 55, yellow 30–54, red < 30
        const style =
          fps >= 55
            ? 'color:#4ade80;font-weight:bold'
            : fps >= 30
            ? 'color:#facc15;font-weight:bold'
            : 'color:#f87171;font-weight:bold';
        console.debug(`%c[FPS] ${fps}`, style);
      });
      return () => {
        stopFPS();
      };
    }
  }, []);

  useEffect(() => {
    notificationManager.start();

    // Unified backup service: legacy migration + app-pause snapshots
    initBackupService();
    
    // Safety clear for Ramadan notifications if it's not Ramadan
    import('@/lib/islamic-calendar-service').then(async ({ islamicCalendarService }) => {
      try {
        const info = await islamicCalendarService.getIslamicCalendarInfo();
        if (info.hijriMonth !== 9) {
          const { RamadanNotifications } = await import('@/lib/ramadan-notifications');
          const instance = RamadanNotifications.getInstance();
          await instance.clearRamadanNotifications();
        }
      } catch (e) {
        console.error('Failed to safety clear Ramadan notifications', e);
      }
    });

    islamicEventsService.scheduleUpcomingEvents().catch(error => {
      console.error('Failed to schedule Islamic events:', error);
    });

    if (import.meta.env.PROD && !navigator.serviceWorker.controller) {
      serviceWorkerManager.register();
    }

    const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (savedLocation) {
      try {
        const { latitude, longitude, locationName } = JSON.parse(savedLocation);
        import('@/lib/widget-service').then(({ WidgetService }) => {
          WidgetService.startAutoUpdate(latitude, longitude, locationName);
        });
      } catch (err) {
        console.warn('Failed to start widget auto-update', err);
      }
    }

    return () => {
      notificationManager.stop();
    };
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AnimatePresence>
        {showSplash && splashEnabled && (
          <SplashScreen
            animationsEnabled={animationEnabled}
            showGreeting={splashGreetingEnabled}
            onComplete={() => setShowSplash(false)}
          />
        )}
      </AnimatePresence>
      <AppContent />
    </TooltipProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AppShell />
        </SettingsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
