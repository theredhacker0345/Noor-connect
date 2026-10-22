/**
 * Changelog Service
 * Manages app changelog data and tracks which versions have been seen by the user
 */

import { CURRENT_APP_VERSION } from './constants';

export type ChangeType = 'feature' | 'fix' | 'improvement' | 'breaking' | 'security';

export interface Change {
  type: ChangeType;
  description: string;
}

export interface VersionChangelog {
  version: string;
  date: string;
  title: string;
  changes: Change[];
}

export interface ChangelogState {
  lastSeenVersion: string;
  dismissedVersions: string[];
}

const STORAGE_KEYS = {
  CHANGELOG_STATE: 'changelog-state',
};

// Changelog data - ordered from newest to oldest
export const CHANGELOG_DATA: VersionChangelog[] = [
  {
    version: '2.4.0',
    date: '2026-10-23',
    title: 'Prayer End Times, Pregnancy Mode & Complete Prophet Stories',
    changes: [
      { type: 'feature', description: 'Prayer end times \u2014 every prayer card on the home screen now shows when the prayer\u2019s valid time ends ("Ends 06:12"). Isha\u2019s end is madhab-aware: Islamic midnight for the majority opinion (Shafi\u02bf\u012b/Maliki/Hanbali) and dawn (Fajr) for Hanafi.' },
      { type: 'fix', description: 'Islamic midnight & Tahajjud corrected \u2014 "midnight" was computed as civil 00:00; it is now the true midpoint between Maghrib and tomorrow\u2019s Fajr, and Tahajjud begins at the last third of the night. Sleep and Tahajjud reminders inherit the corrected windows.' },
      { type: 'feature', description: 'Notifications, rebuilt: Android notification channels (Prayer Times, Ramadan, Noor Cycle, Sleep and more) with proper importance and vibration, richer localized text (localized prayer names with Arabic and per-prayer reminders), and localized adhan, Ramadan and Islamic-event notifications \u2014 all in your language.' },
      { type: 'fix', description: 'Fixed two notification text bugs: prayer reminders could show "undefined" instead of a reminder quote, and Quran-recitation notifications carried a broken internal type tag.' },
      { type: 'improvement', description: 'Notification History redesigned \u2014 grouped by day with per-type icons and a clear-all action.' },
      { type: 'improvement', description: 'Services hub redesigned \u2014 a "Discover Resources" hero and clearly grouped sections (Worship & Prayer, Qur\u2019an, Learning, Media, Calculators), with the seasonal Fitrana/Eid-checklist cards kept exactly as before.' },
      { type: 'improvement', description: 'Home screen polish \u2014 prayer cards now show end times, the hero shows the Arabic prayer name, and spacing/typography got a consistent dark-mode pass.' },
      { type: 'improvement', description: 'The README now documents every feature in full \u2014 35 feature sections with code-verified numbers (87,018 hadiths, 140 du\u02bf\u0101s, 25 prophet stories, 158 radio stations and more).' },
      { type: 'feature', description: 'Noor Cycle \u2014 Pregnancy Mode: a 40-week progress ring with weeks/days count, trimester badge and due-date countdown; an honest fiqh note (pregnancy bleeding is isti\u1e25\u0101\u1e0dah \u2014 prayers continue); du\u02bf\u0101s of pregnancy and birth; and a "Baby arrived \u2014 start Nif\u0101s" handoff. Period predictions pause while expecting, prayer alerts never do, and old tracker data migrates safely. Pregnancy Mode is now front and centre: a dedicated Pregnancy button in the Noor Cycle header and a prominent "Pregnancy Mode" card on the Today tab.' },
      { type: 'feature', description: 'Noor Cycle Fiqh tab \u2014 the recommended-dhikr list is now a tap-to-count counter with per-dhikr goals (33/33/34/100), haptic ticks, daily totals and a reset-today button; counts persist and reset each day.' },
      { type: 'feature', description: 'Noor Cycle Today tab \u2014 a phase-aware self-care card (hydration, iron-rich and sunnah foods with cited sources, sleep, movement, self-compassion) that adapts to haidh / tuhr / premenstrual / fertile / pregnancy phases, plus a daily water tracker.' },
      { type: 'feature', description: 'The Qisas library is complete: the story of Prophet Muhammad \ufdfa (sirah from Ibn Hisham, Bukhari, Muslim and classical scholarship) joins the 24 existing stories \u2014 25 prophets, from Adam to the Final Messenger.' },
      { type: 'feature', description: '60 new authentic du\u02bf\u0101s across 8 new categories (Rizq, Wudu, Dressing, After Adhan, Anxiety & Grief, Guidance & Steadfastness, Laylatul Qadr, Istikharah) \u2014 140 du\u02bf\u0101s total, every entry sourced from the Qur\u02bean or the six hadith collections.' },
      { type: 'fix', description: 'Duas page \u2014 the category bar now scrolls horizontally: all 35 category chips are reachable on every screen size (previously the chips were clipped and the bar could not be scrolled at all).' },
      { type: 'fix', description: 'The console spam after app updates is gone at the root: the service worker no longer serves a stale cached index.html that references deleted chunks, chunk failures self-heal (purge caches + one reload), and cache names were bumped for a clean rebuild.' },
      { type: 'fix', description: '"Failed to register notification action types: Not implemented on web" no longer appears in browsers \u2014 notification action types are only registered on native platforms.' },
      { type: 'fix', description: 'Ebook PDFs from archive.org no longer fail with "Cannot access \u02bc$\u02bc before initialization" \u2014 the internal URL helper now lives at module scope and the pdf.js CMap CDN matches the bundled version.' },
      { type: 'improvement', description: 'The Quran page opens much faster \u2014 the real surah-list chunk is preloaded on idle and on Quran-tab press, and stacked GPU blur layers above the fold were simplified.' },
      { type: 'fix', description: 'Storage pressure can no longer wipe user data \u2014 when local storage fills, only re-downloadable caches are cleared and the write retried; bookmarks, Quran progress, tasbeeh counts, notes and settings are never deleted. A read-only boot-time update-safety check now logs diagnostics if data ever appears missing after an update.' },
      { type: 'improvement', description: 'Haptics \u2014 devices without a vibration motor (desktops, tablets, TV boxes) now get a clear popup explaining vibration won\u02bct work, plus a persistent banner and a disabled Test button; the Haptics page was redesigned with consistent cards and typography.' },
      { type: 'fix', description: 'The home prayer grid no longer shows a gold "NEXT" pill on every remaining prayer of the day \u2014 only the actual next prayer is marked. Three prophet stories (Nuh, Hud, Saleh) are correctly classified as "pre-flood" again.' },
    ],
  },
  {
    version: '2.3.0',
    date: '2026-10-06',
    title: 'Korean Language, Widget System Removal & Donation Simplification',
    changes: [
      { type: 'feature', description: 'Korean Language Support: Full Korean (한국어) translation added for all app UI strings — prayer names, navigation, settings, notifications, and in-app content. Korean is now a first-class supported language alongside English, Arabic, Urdu, Bengali, Russian, and French.' },
      { type: 'improvement', description: 'Widget System Removed: The native Android home-screen widget suite (Next Prayer, Daily Ayah, Daily Hadith, Quran Progress, Tasbeeh Counter) and all supporting infrastructure have been removed to simplify the codebase. All widget-related Kotlin/Java files, Android manifest entries, web bridge code, and UI customizer have been deleted.' },
      { type: 'improvement', description: 'Simplified Donation Section: Replaced crypto wallet addresses (BTC, SOL, BNB) in the Support section with a clean WhatsApp contact card — if you wish to donate, contact the developer directly on WhatsApp.' },
      { type: 'fix', description: 'Korean Translation Quality: Reviewed and corrected all Korean translation keys including prayer time labels, navigation items, settings, and notification messages for accuracy and natural phrasing.' },
    ],
  },
  {
    version: '2.2.1',
    date: '2026-08-22',
    title: 'Live Streams — Migrated to Official SBA CDN',
    changes: [
      { type: 'fix', description: 'Android Widgets — Android 8–11 Rendering Fix: Removed RemoteViews reflection calls to View.setRotation (unsupported before Android 12) that made every Next Prayer / Quran Progress widget update fail with "Problem loading widget". Progress rings now render via drawable levels on all supported versions.' },
      { type: 'fix', description: 'Android Widgets — Tap Targets Fixed: Next Prayer widget tap (and its empty-state CTA) now opens prayer times on the dashboard instead of a not-found page; Quran Progress widget tap now opens the Quran progress page.' },
      { type: 'fix', description: 'Android Widgets — In-App Tasbeeh Syncs to the Home Screen: Fixed an event-name mismatch that meant tasbeeh counted inside the app never updated the widget; every in-app tap now reaches the widget instantly.' },
      { type: 'improvement', description: 'Android Widgets — Accent Colors Now Apply: The accent picked during widget setup is finally applied to widget text, with new Amber, Blue, Purple, Teal and Red palettes added for light and dark themes.' },
      { type: 'fix', description: 'Android Widgets — No More Silent Prayer-Sync Drops: Prayer data missing any of the six times is now rejected with a clear warning instead of being silently dropped by native validation.' },
      { type: 'fix', description: 'Replaced dead m.live.net.sa HLS streams (Wowza server decommissioned, returning 404) and CORS-blocked Aloula CDN redirects with official SBA streams via Globecast/Akamai CDN (HTTPS, CORS-enabled globally, no platform split needed).' },
      { type: 'improvement', description: 'Unified stream URLs: both native Android and web now use the same HTTPS endpoint — removed the native/web URL split and the Android cleartext HTTP whitelist for m.live.net.sa.' },
      { type: 'improvement', description: 'Added Kwikmotion 1080p as automatic fallback for Makkah (Madinah has no secondary CORS-enabled source).' },
      { type: 'fix', description: 'Updated in-player source info cards and Live Streams page to reflect the new SBA/Globecast/Akamai CDN source.' },
    ],
  },
  {
    version: '2.2.0',
    date: '2026-08-01',
    title: 'APK Size Optimization, Modular Settings Architecture, Smart Notifications & Major Refactor',
    changes: [
      { type: 'feature', description: 'Android OOM Crash Elimination & Modular Settings: Deprecated monolithic 1,600-line Settings page in favor of a lightweight navigation index landing page (/profile) with 500ms deferred async state loading and 12 lazy-loaded sub-pages (/settings/:sectionId), eliminating Android WebView heap thrashing on legacy 2016-era devices.' },
      { type: 'feature', description: 'Expanded Islamic Notification Suite: Added 5 new smart notification categories to NotificationManager and settings toggle panel — Pre-Fajr Tahajjud & Night Prayer, Salat al-Duha alerts, Sunnah Fasting (Mondays & Thursdays), Daily Quran Tilawat goal reminders, and Bedtime Sunnah Azkar.' },
      { type: 'improvement', description: 'Authentic Developer Contact & Support: Restored verified WhatsApp, Portfolio, Gmail, ProtonMail links, and multi-chain crypto donation addresses (BTC, SOL, BNB).' },
      { type: 'fix', description: 'Native Widget Reliability: Quran Progress widget now actually updates — the payload was missing its lastUpdated timestamp and was silently rejected by validation on every sync.' },
      { type: 'fix', description: 'Native Widget Reliability: Daily Ayah + Hadith content is no longer dropped when no hadith cache exists (fallback hadith had an empty source that failed validation).' },
      { type: 'fix', description: 'Native Widget Reliability: Removing one widget type no longer stops the shared foreground service or prayer alarms while other widgets are still on your home screen — monitoring survives until the last widget is removed.' },
      { type: 'fix', description: 'Native Widget Reliability: Prayer times are no longer shown one hour late during daylight-saving months — removed a manual DST adjustment that double-shifted the times in regions with DST.' },
      { type: 'fix', description: 'Native Widget Reliability: Widget prayer data now actually pushes from the app — the prayer-time hook was sending API text strings instead of Date objects, so the widget payload was silently dropped and the widget showed stale times until the 30-minute sync.' },
      { type: 'fix', description: 'Native Widget Reliability: Enabled device-protected storage context for WidgetPrefs, allowing widgets to read preferences and update correctly even when the phone is locked immediately after a reboot (Direct Boot Support).' },
      { type: 'improvement', description: 'Native Widget Cleanup: Removed dead StepDetectionService and LocationChangeService (replaced by inline logic in the foreground service).' },
      { type: 'improvement', description: 'Native Widget Quality Pass — Premium Visual Redesign: All five widgets completely redesigned with Material 3 glassmorphism, translucent inner rim borders, gold gradient dividers, and unified Arabic brand headers.' },
      { type: 'improvement', description: 'Native Widget Quality Pass — Light + Dark Themes: All 5 widgets now ship a full light palette (warm parchment) alongside the dark theme, with values-night / values-night-v31 overrides so they switch appearance with the system theme and follow Material You dynamic color on Android 12+.' },
      { type: 'improvement', description: 'Native Widget Quality Pass — System Corner Radius: On Android 12+ widgets now use the platform-provided system widget radius instead of a hardcoded value, so corners visually match the launcher and OEM surfaces.' },
      { type: 'improvement', description: 'Native Widget Quality Pass — Reconfigurable Widgets: All 5 widgets now declare widgetFeatures="reconfigurable" — tap an existing widget to reconfigure it (size, theme, accent) without removing and re-adding it.' },
      { type: 'improvement', description: 'Native Widget Quality Pass — Contrast: Accent and text colors darkened in both palettes (deeper emerald/gold, darker da\'if-grade red) and the stale-data badge darkened, so every element clears WCAG AA contrast on light backgrounds.' },
      { type: 'improvement', description: 'APK size reduced from ~97.4 MB → 94.4 MB: mushaf images downscaled to 810×1145 WebP (83.9 → 56.6 MB), hadith JSON gzip-compressed (95.4 → 19.8 MB), redundant .br/.gz purged from dist (110 → 34.8 MB).' },
      { type: 'improvement', description: 'Performance Optimization Pass: The dashboard clock no longer re-renders the app twice a second, countdown timers share a subscriber-counted scheduler, and widget state updates are guarded so nothing re-renders when values haven\'t changed — smoother scrolling and navigation everywhere.' },
      { type: 'improvement', description: 'Faster Long Lists: Hadith books now load 300 at a time with automatic infinite scroll, and cards across hadith, books, and radio stations are memoized for 60fps browsing. Tafsir and Names of Allah search is debounced with cached filtered results.' },
      { type: 'improvement', description: 'Faster App Startup: The premium dashboard loads on demand, the weekly chart only loads on capable devices, and heavy background work (first auto-backup, daily hadith fetch) is deferred to idle time.' },
      { type: 'improvement', description: 'Smoother Low-End Devices: All blur effects are stripped on low-end devices, transitions animate only GPU-friendly properties instead of everything, layout FLIP animations were replaced with cheap fades, and the device animation benchmark runs once per session.' },
      { type: 'fix', description: 'Fixed timer & memory leaks: ebook download progress stops cleanly on failure, periodic notification checks can be fully stopped, and dead code was removed.' },
      { type: 'fix', description: 'Live Streams Reliability: Replaced CORS-blocked Aloula CDN redirect URLs with m.live.net.sa HLS streams (later superseded by v2.2.1 — see above); automatic one-time fallback to the secondary source before showing a friendly error.' },
      { type: 'fix', description: 'Android Fullscreen Rendering: Native requestFullscreen + landscape orientation lock on Android, edge-to-edge 100vw/100vh container with safe-area insets, video sizing recalculated on resize/orientationchange with object-fit contain; 16:9 layout restored on exit.' },
      { type: 'improvement', description: 'Quality Selector Cleanup: Hidden automatically when the active stream exposes only a single quality level.' },
      { type: 'feature', description: 'Major usePrayerTimes Hook Rewrite: Simplified logic with signature-based caching deduping, robust fallback chain (geolocation → stored → manual → timezone default), and separated notification scheduling into new usePrayerNotifications hook with 1s throttle.' },
      { type: 'improvement', description: 'Removed Standalone Mushaf Viewer: Deleted the standalone /mushaf image-based viewer feature to streamline the app. The app now exclusively uses the vertical-scrolling /quran reader.' },
      { type: 'feature', description: 'Noor Cycle Major UI Upgrade: Transitioned from sidebar to a native-feeling Bottom Tab Bar. Added daily Water Hydration Tracker (8 glasses) and Pain Scale Logger (1-10) with local state persistence.' },
      { type: 'feature', description: 'Smart Noor Cycle Notifications: Added contextual nudges for Fertile Window tracking (15 days before period) and a smart Sunday evening Qaza Fasting reminder for missed Ramadan fasts.' },
      { type: 'feature', description: 'HaidhTracker Deep Integration: Unified state engine that automatically pauses Qaza (Missed Prayer) auto-syncing and safely clears scheduled prayer notifications during an active cycle.' },
      { type: 'improvement', description: 'Noor Cycle Log Confirmation UX: "Log Today\'s Data" now shows a "Logged for {date}" confirmation card with a locked summary (chips + Locked until tomorrow) plus a Modify Data button to reopen editing — no more ambiguous saves.' },
      { type: 'fix', description: 'Noor Cycle Pain Scale Persistence: Pain levels are now saved into the daily log record (survive tab switches and app restarts) instead of existing only in component state.' },
      { type: 'fix', description: 'Missed Fast Count Fix: Turning off a missed fast in Noor Cycle now decrements the count instead of double-counting.' },
      { type: 'fix', description: 'Android 14+ Crash Fix: Replaced the adaptive app icon (invalid as a notification icon on Android 14+) with a proper white-on-transparent vector drawable — fixes the BadForegroundServiceNotificationException crash in WidgetForegroundService and prevents the same crash in AdhanPlaybackService and WidgetRefreshWorker.' },
      { type: 'fix', description: 'Android 12+ Background Service Crash Fix: Wrapped startForegroundService in a try-catch block to prevent ForegroundServiceStartNotAllowedException when widgets trigger updates from the background.' },
      { type: 'feature', description: 'Islamic Wellness Library: Added new curated Fiqh & Wellness articles (nutrition, exercise, mental health) under the Noor Cycle Islamic Tab.' },
      { type: 'improvement', description: 'Performance & Architecture: Removed heavy GPU-bound animate-pulse from Tuhr icon to fix FPS drops; completely eliminated fragmented legacy menstrual-mode storage in favor of unified haidh-tracker-v2.' },
      { type: 'feature', description: 'GlobalPrayerAlarm Optimization: localStorage caching skips redundant geolocation/API calls when today\'s times already cached; abort controller for clean fetch cancellation.' },
      { type: 'feature', description: 'New Equalizer Component: Animated audio visualizer for Nasheed Player with configurable bars, colors, heights, and animation timing.' },
      { type: 'feature', description: 'Nasheed Offline Playback Cache: Played nasheeds cached for offline listening (200 tracks, 90-day retention, quota-safe) with cache status indicators.' },
      { type: 'feature', description: 'Nasheed Filter by Artist: Quick artist-filter chips for browsing 400+ nasheed library.' },
      { type: 'feature', description: 'Nasheed Back to Top: Instant jump to top of long library lists.' },
      { type: 'feature', description: 'Added react-window & @types/react-window dependencies for virtualized list support.' },
      { type: 'improvement', description: 'Prayer Times Hook: Race condition fixes (removed stale ref checks), parseTime throws on invalid input instead of returning current time.' },
      { type: 'improvement', description: 'GlobalPrayerAlarm: Module-level side effects moved to useEffect; event listener type safety fixed; missing cleanup listeners added.' },
      { type: 'fix', description: 'Resolved 12 lint errors: 5 empty catch blocks (added non-critical comments), 1 require()→import conversion, 4 @ts-ignore→@ts-expect-error with descriptions, 1 parsing error (extra closing braces).' },
      { type: 'fix', description: 'Settings.tsx: Fixed empty catch block (eslint error).' },
      { type: 'fix', description: 'Prayer Tracking Bridge: syncMissedPrayersToQaza() moved from unused SalahTracker into Dashboard.tsx — missed prayers auto-detected and added to qaza from home screen.' },
      { type: 'fix', description: 'Dashboard Prayer Time Validation: Check-in passes prayer times to togglePrayer(), showing "Cannot check in before prayer time" error instead of silently bypassing.' },
      { type: 'fix', description: 'Qaza History Centralized: Moved to qaza-tracker.ts lib functions (getQazaHistory, addQazaHistoryEntry, getQazaDailyGoal, setQazaDailyGoal).' },
      { type: 'fix', description: 'Streak Reset on Foreground: visibilitychange listener calls checkStreakReset() on app return, ensuring streaks reset correctly after days away.' },
      { type: 'fix', description: 'Hadith Collection Flash Fix: HadithBookView initializes metadataLoading to true, checks remoteCollectionData for loading guard — eliminates "1 book" flash.' },
      { type: 'improvement', description: 'Dead Code Cleanup: Deleted SalahTracker.tsx (205 lines), PrayerTimesList.tsx (451 lines), EnhancedPrayerTimesList.tsx (111 lines) — imported but never rendered.' },
      { type: 'improvement', description: 'Dashboard Cleanup: Removed unused lazy imports for PrayerTimesList, SalahTracker, QazaTracker.' },
      { type: 'improvement', description: 'Complete Language & Translation Overhaul: All 5 languages (EN, AR, UR, BN, RU) now have 410 translation keys each (was 278-314 with 99-105 missing). Hardcoded English strings eliminated (20+ AppBar titles, BottomNav labels). Locale-aware formatting in time-formatter.ts, useI18n.ts, widget-service.ts. RTL/Widget sync consistency via useLanguage(). Widget string sync for Android widgets in all 5 languages.' },
      { type: 'improvement', description: 'Intelligent Notification Engine: Ghost Notification Fix (Ramadan reminders no longer persist), Deterministic Scheduling (predictable ID mapping), Accurate Calendar Countdowns (async islamicCalendarService).' },
      { type: 'improvement', description: 'Bulletproof Backup & Restore: Unified Backup Service (backup-service.ts), Complete Data Capture (localStorage + Capacitor Preferences + metadata), Always-On Auto Save (20min + on close), Google Cloud Backup Rules (backup_rules.xml), Real Export on Android (system share sheet), First-Launch Restore Prompt, Never Loses Data Silently.' },
    ],
  },
  {
    version: '2.0.1',
    date: '2026-07-21',
    title: 'Quran Progress Tracking Fixes',
    changes: [
      { type: 'fix', description: 'Fixed incorrect surah count: Progress now only counts fully completed surahs (when all ayahs are read), not partially read ones.' },
      { type: 'fix', description: 'Fixed misleading UI text: Updated "Surahs Completed" to "Surahs fully Completed" for clarity.' },
      { type: 'fix', description: 'Fixed wrong progress calculation: Changed from ayah-based estimation to accurate page-based tracking (604 total pages).' },
      { type: 'fix', description: 'Fixed position tracking bug: Progress now tracks current page position instead of maximum page ever visited.' },
      { type: 'fix', description: 'Fixed widget sync mismatch: Added widget-compatible localStorage key sync for native Android widgets.' },
      { type: 'improvement', description: 'Updated QuranProgressWidget to display pages read (X/604) instead of ayahs.' },
      { type: 'improvement', description: 'Modified quran-features service to track pages read and calculate percentage based on pages.' },
      { type: 'improvement', description: 'Fixed QuranReader to use current page instead of maxPageViewed for progress.' },
      { type: 'improvement', description: 'Added widget progress synchronization with proper payload formatting.' },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-07-10',
    title: 'Noor Connect 2.0 — Major Release',
    changes: [
      { type: 'feature', description: 'Widget System v2: 5 native Kotlin widgets (Next Prayer, Daily Ayah, Daily Hadith, Quran Progress, Tasbeeh Counter) rebuilt from scratch with Material You dynamic color.' },
      { type: 'feature', description: 'Noor Cycle: ovulation day tracking, cycle insights, fertile window, analytics tab with recharts, and PDF doctor report export.' },
      { type: 'feature', description: 'Seerah chapters and Qisas (Stories of Prophets) reader with offline tafsir support and progress tracking.' },
      { type: 'feature', description: 'Zakat Calculator: silver asset calculation, exchange rate fallback service, and preferred currency persistence.' },
      { type: 'feature', description: 'Hadith expansion: 10 new collections (adab, ahmad, bulugh, darimi, forty, hisn, malik, mishkat, riyadussalihin, shamail), HadithDetail page, and HadithBookmarks.' },
      { type: 'feature', description: 'Backup & Restore: cross-platform localStorage-based backup with auto-restore on reinstall and smart background processing.' },
      { type: 'feature', description: 'Low-end device optimizations: device detection, adaptive performance settings, React Query tuning, and 30+ FPS target on 2016+ devices.' },
      { type: 'feature', description: 'Islamic Remedies: mood grid redesign, full-screen remedy viewer with framer-motion entrance animations, gamification, and Dashboard widget.' },
      { type: 'feature', description: 'Radio Statistics & Achievements: per-station listening stats, total watch time, streak tracking, and unlockable achievements.' },
      { type: 'feature', description: 'Quran reading progress (X/Y) on all book cards, uploads, and detail modal; PDF reader with local worker and blob: CSP fix.' },
      { type: 'feature', description: 'LiveStreams: aggressive HLS buffering (120s), quality switcher UI (Auto/320p/480p), and hardcapped recovery loop to prevent OS freezing on weak networks.' },
      { type: 'feature', description: 'Qibla enhancements: single smart button with geo-anchor note, magnetic declination correction via NOAA API, device orientation and metal-interference warnings with calibration UX.' },
      { type: 'fix', description: 'Critical Haidh Tracker fixes: prayer pause/resume on cycle start/end, backup inclusion, gender filter, and route consolidation.' },
      { type: 'fix', description: 'TypeScript strictness: removed unsafe JSON.parse and as any casts, fixed dependency arrays, race conditions, and memory leaks.' },
      { type: 'fix', description: 'Widget stability: WidgetBootReceiver refactor, payload validation logging, thread-safe HadithBundle.cachedHadiths, and Arabic RTL fixes.' },
      { type: 'fix', description: 'Quran Reader: chunked progressive rendering to fix massive FPS drop and CLS; surah-to-page mapping corrected with proper +2 image offset.' },
      { type: 'fix', description: 'SurahList: wrapped navigation in startTransition to fix poor INP; replaced react-window v1 List with standard mapped list.' },
      { type: 'fix', description: 'Splash screen: removed framer-motion and rewrote in pure CSS, cutting LCP from 5s to under 1s.' },
      { type: 'fix', description: 'Hadith: singleton FPS monitor, fixed double API calls, back navigation, loading states, and collection metadata (totalHadith/totalBooks).' },
      { type: 'fix', description: 'Hadith bookmarks: new HadithBookmarks page, useHadithBookmarks hook, and bookmark buttons on all hadith pages.' },
      { type: 'fix', description: 'Settings: Toggle "Animations" now correctly disables all heavy Framer Motion animations globally across the app.' },
      { type: 'fix', description: 'Quran Reader: Resolved text overflow issues where English Surah names were going off-screen on smaller devices.' },
      { type: 'fix', description: 'Quran Reader: Added an instant golden loading spinner and useTransition hook to eliminate the slight delay when opening a Surah.' },
      { type: 'fix', description: 'App Icon: Removed android:roundIcon attribute from AndroidManifest to resolve icon rendering issues on legacy Android brands.' },
      { type: 'improvement', description: 'F-Droid Metadata: Updated license to GPL-3.0-or-later and synchronized feature descriptions (Widgets, Menstrual Tracker, Zakat) for store publication.' },
      { type: 'improvement', description: 'RadioStats consolidated into unified MediaStats tracking Live Makkah/Madinah watch time.' },
      { type: 'improvement', description: 'Spotify-inspired PremiumDashboard with gold/green accents, dynamic greetings, and backdrop blurs.' },
      { type: 'improvement', description: 'Device performance imports fixed for backward compatibility (performance-optimizations instead of device-performance.ts).' },
      { type: 'improvement', description: 'Removed vestigial Quran Display Settings from Profile page (font size slider, script style dropdown, and clear cache button) since Quran now uses Mushaf image pages.' },
      { type: 'improvement', description: 'Deleted orphaned components MushafPage.tsx and MushafWord.tsx which were no longer imported anywhere in the app.' },
      { type: 'improvement', description: 'F-Droid APK size reduction: stripped >300MB of offline JSON data via clean-dist-data.js, allowing the F-Droid build to heavily rely on remote CDNs for an 84MB footprint.' },
      { type: 'fix', description: 'Qibla performance: removed conflicting CSS transitions on the compass dial, eliminating sensor jitter and rubber-banding lag on legacy Android devices.' },
      { type: 'improvement', description: 'App UI polish: applied the Azimuth premium dark/amber aesthetic to all dashboard widgets, standardizing colors and blurs.' },
      { type: 'fix', description: 'Removed chunking errors to resolve Vercel deployment circular dependency and React Context rendering issues.' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-07-03',
    title: 'Expanded Features — Zen Mode, Hadith, Widgets, Noor Cycle',
    changes: [
      { type: 'feature', description: 'Zen Mode (Tasbeeh) with dhikr counter, categories, and review mode.' },
      { type: 'feature', description: 'Quiz expansion: categories, review mode, and gamification streaks.' },
      { type: 'feature', description: 'Duas expansion: search, DuaOfDay, audio playback, and counter.' },
      { type: 'feature', description: 'Hadith/Seerah/Qisas UI/UX overhaul: skeleton loading, Continue Reading cards, share buttons, and copy-with-toast.' },
      { type: 'feature', description: 'Noor Cycle (Haidh Tracker) foundation with 6 tabs (Calendar, Ghusl, Islamic, Log, Settings, Today).' },
      { type: 'feature', description: 'Islamic Remedies mood grid redesign, full-screen viewer, gamification stats, and Dashboard widget.' },
      { type: 'feature', description: 'Widget system rebuilt from scratch with native Kotlin implementation and Material You design.' },
      { type: 'feature', description: 'Comprehensive performance optimization for low-end devices: React.memo, virtualization, code-splitting, and lazy loading.' },
      { type: 'feature', description: 'Notification overhaul: fixed hadith randomization, low-end device throttling, dynamic SW dates, dedup scheduling, and caching.' },
      { type: 'fix', description: 'Qibla: compass heading accuracy, layout overflow fixes, and F-Droid compliance with custom FOSS sensor implementation.' },
      { type: 'fix', description: 'Profile page: madhab labels updated, Islamic sleep reminder toggle added, SurahList react-window import fixed.' },
      { type: 'fix', description: 'Calendar: wired daysUntilRamadan, replaced offline fallback with tabular Islamic calendar, and dynamic Eid date lookup.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-03-30',
    title: 'Live Radio Widget & Native Android Improvements',
    changes: [
      { type: 'feature', description: 'Brand new Live Quran Radio Widget with direct background audio playback and home screen controls.' },
      { type: 'feature', description: 'Complete rebuild of Next Adhan, Daily Ayah, and Daily Schedule Widgets in native Kotlin for perfect Doze mode performance.' },
      { type: 'fix', description: 'Fixed Quiz streak logic and Daily check-in errors during Menstrual Mode overrides.' },
      { type: 'improvement', description: 'Added premium Android 14 notification center integration with large icon display support.' },
      { type: 'fix', description: 'Corrected premature Eid Mubarak popups from triggering before Shawwal.' },
      { type: 'fix', description: 'Replaced non-free qibla library with custom FOSS sensor implementation for F-Droid compliance.' },
      { type: 'fix', description: 'Refactored geolocation to use Web API and consolidated Permission Manager for cross-platform stability.' },
      { type: 'fix', description: 'Fixed qibla compass heading, layout overflow, and widget data flow bugs.' },
      { type: 'fix', description: 'Critical security fixes: TypeScript strict mode enabled, XSS vulnerability patched, ErrorBoundary added, and console.log stripped from production.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-20',
    title: 'Gender-Based Features & Menstrual Mode',
    changes: [
      { type: 'feature', description: 'Added gender selection for personalized experience' },
      { type: 'feature', description: 'Menstrual mode for prayer notification management' },
      { type: 'feature', description: 'Widget customization system' },
      { type: 'improvement', description: 'Enhanced dashboard with customizable widgets' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-01',
    title: 'Initial Release',
    changes: [
      { type: 'feature', description: 'Quran reading with audio recitation' },
      { type: 'feature', description: 'Prayer times with location detection' },
      { type: 'feature', description: 'Qibla direction finder' },
      { type: 'feature', description: 'Daily ayah and hadith' },
      { type: 'feature', description: 'Tasbeeh counter' },
      { type: 'feature', description: 'Islamic quiz with XP system' },
      { type: 'feature', description: 'Duas and supplications collection' },
      { type: 'feature', description: '99 Names of Allah' },
    ],
  },
];

export function getChangelogState(): ChangelogState {
  const saved = localStorage.getItem(STORAGE_KEYS.CHANGELOG_STATE);
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    lastSeenVersion: '',
    dismissedVersions: [],
  };
}

export function saveChangelogState(state: ChangelogState): void {
  localStorage.setItem(STORAGE_KEYS.CHANGELOG_STATE, JSON.stringify(state));
}

export function markVersionAsSeen(version: string): void {
  const state = getChangelogState();
  state.lastSeenVersion = version;
  if (!state.dismissedVersions.includes(version)) {
    state.dismissedVersions.push(version);
  }
  saveChangelogState(state);
}

export function hasUnseenChangelog(): boolean {
  const state = getChangelogState();
  const currentVersion = CURRENT_APP_VERSION;
  
  if (state.lastSeenVersion === currentVersion) {
    return false;
  }
  
  const lastSeenIndex = CHANGELOG_DATA.findIndex(c => c.version === state.lastSeenVersion);
  const currentIndex = CHANGELOG_DATA.findIndex(c => c.version === currentVersion);
  
  if (state.lastSeenVersion === '') {
    return currentIndex !== -1;
  }
  
  return currentIndex !== -1 && currentIndex < lastSeenIndex;
}

export function getUnseenChangelogs(): VersionChangelog[] {
  const state = getChangelogState();
  const lastSeenIndex = CHANGELOG_DATA.findIndex(c => c.version === state.lastSeenVersion);
  
  if (lastSeenIndex === -1) {
    const currentIndex = CHANGELOG_DATA.findIndex(c => c.version === CURRENT_APP_VERSION);
    return currentIndex !== -1 ? [CHANGELOG_DATA[currentIndex]] : [];
  }
  
  return CHANGELOG_DATA.slice(0, lastSeenIndex);
}

export function getChangelogForVersion(version: string): VersionChangelog | undefined {
  return CHANGELOG_DATA.find(c => c.version === version);
}

export function getAllChangelogs(): VersionChangelog[] {
  return CHANGELOG_DATA;
}

export function getChangeTypeIcon(type: ChangeType): string {
  switch (type) {
    case 'feature':
      return '✨';
    case 'fix':
      return '🐛';
    case 'improvement':
      return '⚡';
    case 'breaking':
      return '⚠️';
    case 'security':
      return '🔒';
    default:
      return '📝';
  }
}

export function getChangeTypeLabel(type: ChangeType): string {
  switch (type) {
    case 'feature':
      return 'New Feature';
    case 'fix':
      return 'Bug Fix';
    case 'improvement':
      return 'Improvement';
    case 'breaking':
      return 'Breaking Change';
    case 'security':
      return 'Security';
    default:
      return 'Update';
  }
}

export function getChangeTypeColor(type: ChangeType): string {
  switch (type) {
    case 'feature':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'fix':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'improvement':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'breaking':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'security':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}
