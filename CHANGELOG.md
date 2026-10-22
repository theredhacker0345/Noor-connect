# Changelog

All notable changes to Noor Connect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

## [2.4.0] - 2026-10-23

### Added

- **Prayer end times on the home screen**: every prayer card in the dashboard grid now shows when that prayer's valid time ends ("Ends 06:12"), formatted per the user's 12/24-hour preference and re-formatted live when the preference changes. Fajr ends at sunrise, Dhuhr at Asr, Asr at Maghrib, Maghrib at Isha.
- **Madhab-aware Isha end**: Isha's window end follows the user's madhab — Islamic midnight (midpoint of Maghrib → tomorrow's Fajr) for the jumhur position (Shafi'i/Maliki/Hanbali, the app default), and Subh Sadiq (tomorrow's Fajr) for Hanafi. A tooltip on the Isha card explains the Islamic-midnight basis.
- **Android notification channels**: a central registry of 8 stable channel ids (Prayer Times, Prayer Prep, Ramadan, Hydration, Noor Cycle, Reminders, Events, Sleep) with localized names/descriptions, sensible importance levels and vibration — visible and manageable in Android's notification settings.
- **Richer notification text**: prayer notifications carry the localized prayer name with its Arabic name and a per-prayer authentic reminder; adhan, Ramadan countdown and Islamic-event notifications are fully localized (previously hard-coded English) across all 7 languages.
- A prayer end-times research document (`docs/research/prayer-end-times.md`) covering the fiqh rules per madhab, the Aladhan API / adhan library comparison, and the integration plan.

- Noor Cycle gains pregnancy mode: weeks/days + trimester + due-date countdown with a 40-week progress ring, an honest fiqh note (pregnancy bleeding is istiḥāḍah — prayers continue), a "Baby arrived — start Nifās" handoff, duʿās of pregnancy and birth, and suppression of period predictions while expecting. Old tracker data migrates safely.
- Pregnancy Mode is now easy to find: a dedicated **Pregnancy** button in the Noor Cycle header (visible whenever tracking is idle) and a prominent sky-tinted "Pregnancy Mode" card directly under the Today-tab hero — no more hunting for the old collapsed "Expecting?" row.
- Noor Cycle Fiqh tab: the recommended-dhikr list is now a tap-to-count counter (per-dhikr goals like 33/34/100, daily totals, counts reset each day and persist in a dedicated storage key).
- Noor Cycle Today tab: a phase-aware self-care card (hydration, iron-rich and sunnah foods with cited sources, sleep, movement, self-compassion) that adapts to haidh / tuhr / premenstrual / fertile / pregnancy phases, plus a daily water tracker.
- The Qisas library is complete: the story of Prophet Muhammad ﷺ (sirah from Ibn Hisham, Bukhari, Muslim and classical scholarship) joins the 24 existing stories — 25 prophets, from Adam to the Final Messenger.
- 60 new authentic duʿās across 8 new categories (Rizq, Wudu, Dressing, After Adhan, Anxiety & Grief, Guidance & Steadfastness, Laylatul Qadr, Istikharah) — 140 duʿās total, every entry sourced from the Qur'an or the six hadith collections.

### Changed

- **Services hub redesigned**: "Discover Resources" hero, clearly grouped sections (Worship & Prayer, Qur'an & Recitation, Learning, Media, Calculators & Tools), animations honoring the existing animation setting, dark-mode consistency, and preserved seasonal Fitrana/Eid-checklist gating.
- **Notification History redesigned**: grouped by day, per-type icons, clearer empty state, clear-all.
- **Home screen polish**: prayer cards show end times, the next-prayer hero shows the Arabic prayer name (shared with the notification layer so both always agree), tightened spacing/typography, dead code stripped from the Dashboard shell.
- **README fully documented**: 226 → 485 lines with a feature index and 35 per-feature sections; corrected stale claims along the way (87,018 hadiths across 16 collections, 158 radio stations, spa5k tafsir API with 27 editions, accurate nasheed feature list).
- i18n catalogue extended to 1,208 keys with full parity across all 7 locales (English, Arabic, Urdu, Bengali, Russian, French, Korean); new keys are RTL-aware for Arabic/Urdu.

### Fixed

- **Islamic midnight was civil midnight**: the fallback computed 00:00 of the next civil day instead of the fiqh midnight. It is now the true Maghrib → tomorrow-Fajr midpoint (equivalent to adhan's `SunnahTimes.middleOfTheNight`), with a polar-day guard.
- **Tahajjud window corrected**: the old fallback midpointed civil midnight → Fajr; the window now starts at the last third of the night (`SunnahTimes.lastThirdOfTheNight`). Sleep/Tahajjud reminders inherit the corrected windows.
- **Aladhan offline fallback poisoned night fields**: the offline path hard-coded `Midnight`/`Firstthird`/`Lastthird` to `00:00`, which parsed downstream as a real (already-past) time. The fields are now simply absent when unknown, and fiqh night semantics are always computed locally (Aladhan's default `Midnight` spans Sunset↔Sunrise, not the fiqh span).
- **"undefined" in prayer notification bodies**: `PRAYER_QUOTES` was indexed as an array instead of a record, so bodies read "…prayer.\nundefined". Quotes are now indexed per prayer with a safe default pool.
- **Quran-recitation notification type tag shadowed**: a duplicate `type` key in the media-style notification data silently broke the recitation-action routing; renamed to `recitationType`.
- Isha's valid-time window no longer overstates to tomorrow's Fajr for non-Hanafi users, and current/prayer-window boundary comparisons are now end-exclusive.

- The category bar on the Duas page was impossible to scroll: it was built on a vertical-only scroll container that clipped the 35 category chips, so categories beyond the first few were unreachable on any screen size. It is now a native horizontally-scrollable chip row (touch-friendly, consistent with the rest of the app).
- The console spam after app updates is gone at the root: the service worker served a stale cached index.html that referenced deleted chunks, so chunk requests were answered with HTML ("Expected a JavaScript-or-Wasm module script…" / "Failed to fetch dynamically imported module" / ErrorBoundary crash). Navigations are now network-first with a 3 s timeout and only fall back to the precached HTML offline; asset caching rejects text/html responses so a missing chunk can never poison the cache; cache names bumped to v2 for a clean rebuild; index.html and sw.js are served must-revalidate; and the nasheed cache is no longer wiped on every service-worker activation.
- Self-healing on stale chunks: Vite's preload-error event and dynamic-import failures now purge the app caches and reload once per tab session (skipped offline so the cached app can't be bricked), and the ErrorBoundary shows an "updating" spinner instead of an error screen for this specific failure.
- "Failed to register notification action types: Not implemented on web" no longer appears on browsers: notification action types are only registered on native platforms.
- Removed an unused image preload from index.html that produced "preloaded using link preload but not used" console warnings on every load.
- The home prayer grid showed a gold "NEXT" pill on every remaining prayer of the day; only the actual next prayer is marked now.
- Three prophet stories (Nuh, Hud, Saleh) carried an invalid "antediluvian" era value that excluded them from the "Pre-Flood" filter; they are now classified as "pre-flood".

### Fixed (previous batch)

- Ebook PDFs from archive.org no longer fail with "Cannot access '$' before initialization": the internal archive.org URL helper was defined after the viewer's loading/error early-returns, so opening any archive.org book crashed pdf.js loading and showed an error screen. The helper now lives at module scope, and the CMap CDN URL was updated to match the bundled pdf.js version (4.10.38).
- The Quran page now opens much faster: the app's idle preloader was warming a dead, unrouted page instead of the real surah list, so every first visit paid the full chunk download behind the loading spinner. The real list chunk is now preloaded on idle and on Quran-tab pointerdown, the list no longer pulls the animation runtime into its chunk, and several stacked GPU blur layers above the fold were simplified.
- Storage no longer wipes user data when local storage fills up: if a write fails due to storage pressure, the app now clears only re-downloadable caches (surah lists, reciter directory, daily ayah/hadith, cached prayer times, daily remedy, exchange rates) and retries once. Bookmarks, Quran progress, tasbeeh counts, notes, history and settings are never deleted; if space still cannot be freed the write is skipped and logged instead.
- Added a boot-time update-safety check that records the app version, dispatches an internal event when the version changes, and logs a diagnostic report if previously present user data appears empty after an update. It is read-only and never modifies user data.

### Added (previous batch)

- Haptic settings now detect devices without a vibration motor (desktop browsers, tablets, TV boxes, emulators) and show a clear popup explaining that vibration won't work, plus a persistent banner and a disabled "Test now" button. Settings are kept in case the user switches devices. Detection uses the W3C Vibration API contract (a 0 ms cancel probe returning false on motor-less devices) rather than API presence, which desktop browsers falsely report.
- Haptics page redesigned with consistent cards, unified icon chips and typography rhythm.

## [2.3.0] - 2026-10-07

### 🔔 Enhanced Adhan & Notification System

- **Stop Adhan from Notification**: Added "⏹ Stop Adhan" action button to both native Android notifications (via `AdhanPlaybackService`) and Capacitor web/PWA notifications (via `LocalNotifications`). Tapping it immediately stops the adhan playback.
- **Notification Auto-Dismiss**: The adhan notification now automatically dismisses when the adhan finishes playing — `onCompletionListener` and `onErrorListener` both cancel the notification and stop the foreground service cleanly.
- **Expanded Prayer Quotes**: Added 5+ new quotes per prayer (Fajr, Dhuhr, Asr, Maghrib, Isha, Jummah) sourced from Quran and authentic Hadith collections — more variety in notification bodies.
- **Tablet Sleep Fix (Lenovo, Samsung, Xiaomi, etc.)**: Fixed adhan cutting off early on devices with aggressive battery optimizations by:
  - Adding `MediaPlayer.setWakeMode(PowerManager.PARTIAL_WAKE_LOCK)` to keep CPU awake during playback
  - Increasing WakeLock timeout in `AdhanAlarmReceiver` from 10s to 60s for slow tablet startup
  - This prevents the system from killing the MediaPlayer mid-adhan
- **Web Notification Actions**: Added "Stop Adhan" and "Open App" action buttons to Capacitor LocalNotifications with proper action listener in `LocalNotificationManager.initialize()`

### 🇰🇷 Korean Language Support

- Full Korean (한국어) translation added for all app UI strings — prayer names, navigation, settings, notifications, and in-app content.
- Korean is now a first-class supported language alongside English, Arabic, Urdu, Bengali, Russian, and French.
- All Korean translation keys reviewed and corrected for accurate, natural phrasing.

### 🗑️ Widget System Removed

- The native Android home-screen widget suite (Next Prayer, Daily Ayah, Daily Hadith, Quran Progress, Tasbeeh Counter) and all supporting infrastructure have been removed to simplify the codebase.
- All widget-related Kotlin/Java source files, Android manifest receivers/services/activities, web bridge code (`widgetBridge.ts`, `widget-service.ts`, `widget-types.ts`, `widget-refresh.ts`), and UI customizer (`WidgetCustomizer.tsx`, `SafeWidgetPreview.tsx`) deleted.
- All widget sync hooks (`useWidgetSync`), dashboard widget route, and language bridge for widget strings removed.

### 💚 Simplified Donation Section

- Replaced crypto wallet addresses (BTC, SOL, BNB) in the Support & Donate settings section with a clean WhatsApp contact card.
- If you'd like to donate, kindly contact the developer directly on WhatsApp via the number given in the app. Jazak Allah Khair.

### 🛡️ Stability & Performance Improvements

- Android 7.0+ WebView crash fix: Added `browserslist` targeting Chrome 51+, `core-js` + `regenerator-runtime` polyfills, and esbuild syntax downleveling for optional chaining, nullish coalescing, dynamic import, and BigInt
- Switch minification from Terser to esbuild (3–5× faster parse on low-end CPUs)
- Enable `modulePreload` polyfill for parallel chunk loading
- Move `pdf-vendor` (220 KB) and `charts` (102 KB) chunks out of main bundle → lazy-loaded only on demand
- Add `requestIdleCallback` preload for 5 key routes (Quran, Hadith, Tasbeeh, Qibla, QuranReader)
- Native splash screen control via `@capacitor/splash-screen` — smooth 300ms fade when app is ready
- Timer cleanup fixes in `Dashboard.tsx` and `PremiumDashboard.tsx`

---

## [2.2.1] - 2026-08-22

### 📱 Android Widgets — Stability, Deep-Links & Accent Colors

- **Widgets No Longer Break on Android 8–11**: Removed all `RemoteViews` reflection calls to `View.setRotation` from the Next Prayer and Quran Progress widgets. That method only became `@RemotableViewMethod`-safe in Android 12; on API ≤ 30 every widget update threw an `ActionException` during rendering and the launcher showed "Problem loading widget". Progress rings now render purely via `setImageLevel` on the `useLevel` ring drawable, which works on every supported API level (and the redundant rotation/level double-rendering is gone — the arc starts at 12 o'clock).
- **Next Prayer Widget Tap Fixed**: Tapping the widget (and its "Get Started" empty-state CTA) deep-linked to `/prayers`, a route that didn't exist — users landed on the 404 page. Added a `/prayers → /dashboard` redirect so the tap lands on prayer times.
- **Quran Progress Widget Tap Fixed**: The widget deep-linked to `/quran/reading`, which accidentally matched the `/quran/:surahName` route and opened a reader at an invalid surah. Added a `/quran/reading → /quran-progress` redirect.
- **In-App Tasbeeh Now Reaches the Widget**: `useWidgetSync` listened for a `noorconnect:tasbeeh-changed` event that nothing in the app ever dispatched (the real event is `tasbeeh-updated` from `storage.ts`), so tasbeeh counted in-app never updated the home-screen widget — only widget-side taps did. The hook now listens for the correct event, and every in-app tap pushes the delta to the widget instantly.
- **Accent Color Config Now Actually Applies**: The widget configure screen saved the user's accent pick to `WidgetConfigPrefs`, but no rendering code ever read it — every widget stayed emerald regardless of choice. Widgets now resolve the saved accent per widget instance and apply it to their accent-colored text (countdown, empty-state CTA, Quran percent, Tasbeeh count). Added the missing Amber, Blue, Purple, Teal, and Red accent palettes for both light and dark themes (only Emerald/Gold existed before, so four of the seven offered choices had no backing color).
- **No More Silent Prayer-Sync Drops**: The widget payload builder silently filtered out prayers with missing times, and the native validator then rejected the resulting 3–5 entry payload — the whole sync was dropped with only a console warning. The builder now explicitly refuses to sync unless all six times are present, with a clear warning.
- **Dead Code Removed**: Deleted the unused `WidgetPrefs` update-throttle helpers, the never-invoked duplicate step-detection registration in `WidgetRefreshWorker` (the live implementation lives in `WidgetForegroundService`), an unused import, and the inert `android.appwidget.configure` manifest meta-data blocks (real wiring is `android:configure` in each widget info XML).

### 🎵 Quran Audio & Player Enhancements
- **Quran Audio Page Redesigned**: Complete Spotify-style UI/UX remake — dark hero card, horizontal reciter carousel with circular gold-gradient avatars, surah list with diamond number plates and animated equalizer on the playing row, sticky search bar, and playback via GlobalQuranPlayer mini-player app-wide.
- **GlobalQuranPlayer Repeat Loop**: Added repeat toggle (loop current surah indefinitely); audio automatically restarts from 0:00 when ended and repeat is enabled.
- **GlobalQuranPlayer Progress Bar**: Added thin gold progress bar in mini-player showing seek position; expanded player includes seek backward/forward 10s buttons with proper SkipBack/SkipForward icons (was placeholder Repeat icons).
- **GlobalRadioPlayer Transparency Fixed**: Mini-player background changed from semi-transparent `bg-card/95 backdrop-blur-xl` to solid `bg-card` for fully opaque white appearance.
- **Download Manager Listing**: Added `listDownloaded()` method to QuranDownloadManager — returns per-reciter offline surah info (count, total size, reciter IDs) for storage stats and "wipe downloads" action.
- **Quran Audio Play Badge Interactivity**: Circular play icon beside download button now toggles play/pause (was decorative-only).
- **Performance Fix**: Stabilized `getRowProgress` callback via `useRef` to prevent 114 surah row re-renders during active downloads, fixing FPS degradation.

### 📻 Live Streams — Migrated to Official SBA CDN
- **Replaced dead streams**: The `m.live.net.sa` Wowza server was decommissioned (returning 404) and the Aloula CDN redirect URLs were CORS-blocked. Both replaced with official SBA streams served via Globecast/Akamai CDN (`cdn-globecast.akamaized.net`). HTTPS, CORS-enabled globally, works on both native Android and web.
- **Unified platform URLs**: Removed the native/web URL split — both platforms now use the same HTTPS endpoint. No more cleartext HTTP or Android network security config exceptions for live streams.
- **Makkah fallback**: Added Kwikmotion 1080p (Akamai CDN) as an automatic secondary source for Makkah. Madinah has no alternative CORS-enabled source at this time.
- **Cleaned up Android config**: Removed `m.live.net.sa` from `network_security_config.xml` cleartext whitelist (no longer needed).
- **Updated UI text**: In-player source info cards and Live Streams page now reflect the new SBA/Globecast/Akamai CDN source.

---

## [2.2.0] - 2026-08-01

### ⚙️ Modular Settings Architecture & Android OOM Crash Elimination
- **Legacy Android WebView OOM Resolution**: Deprecated the 1,600-line monolithic Settings page that rendered 15+ sections simultaneously.
- **Index Landing Page (`/profile`)**: Replaced with a fast navigation index leveraging 500ms single-pass deferred async state fetching to eliminate UI-thread blocking.
- **Lazy-Loaded Sub-Pages (`/settings/:sectionId`)**: Built 12 modular sub-pages covering Theme, Haptics, Personal Info, Prayer Calculation, Notifications, Adhan, Backup, Storage, Privacy, About, Support, and Developer Contact.
- **Authentic Contact & Support**: Restored verified developer WhatsApp, Portfolio, Gmail, ProtonMail links, and BTC/SOL/BNB donation addresses.

### 🔔 Expanded Smart Notification Suite
- **Pre-Fajr Tahajjud & Night Prayer**: Reminders during the last third of the night to stand in prayer.
- **Salat al-Duha Alerts**: Mid-morning Duha prayer notification to fulfill daily body joint charity.
- **Sunnah Fasting Reminders**: Automated Monday & Thursday Sunnah fasting notifications.
- **Daily Quran Tilawat Goal**: Evening reminder to complete daily Quran reading targets.
- **Bedtime Sunnah Azkar**: Nightly reminder to recite Ayatul Kursi and protection surahs before sleep.

### 📦 APK Size Optimization
- **Mushaf Downscale**: 606 images → 810×1145 WebP q75 (83.9 → 56.6 MB).
- **Hadith Gzip**: 34 JSON files → `.json.gz` (95.4 → 19.8 MB, 79 MB saved), loaded via `DecompressionStream` with fallback.
- **Vite Duplicate Purge**: `clean-dist-data.js` strips all redundant `.br`/`.gz` from dist (except hadith `.json.gz`), reducing dist from 110 → 34.8 MB.
- **Gradle Asset Optimization**: `stripCompressedAssets` removes vite browser duplicates from APK; `moveMushafImages` copies downscaled mushaf into APK at build time.
- **Final APK**: 94.4 MB (was ~97.4 MB), all offline features intact.

### ⚡ 5-Phase Performance Optimization Pass
- **Re-render churn eliminated**: Subscriber-counted global timer scheduler (starts/stops with subscribers); dashboard's 30s clock tick replaced with a derived 60s `minuteTick`; guarded state updates in countdown widgets, Ramadan widget, and the radio player stop redundant re-renders.
- **Long list rendering**: Hadith collections render in pages of 300 with IntersectionObserver infinite scroll; memoized cards for hadith, books, and radio stations; debounced Tafsir / Names of Allah search with cached filtered results.
- **Startup & bundle size**: Premium dashboard and the weekly chart are code-split (chart renders only when animations are enabled and the device can handle it); dead `chart.tsx` removed; module preload hints filtered for heavy chunks; first auto-backup and daily hadith fetch deferred to idle time with an in-memory parse cache.
- **GPU & CSS**: Gold shimmer sweep and skeletons run on compositor-only properties; 48 `transition: all` rules replaced with targeted transitions; framer `layout`/`layoutId` FLIP animations replaced with cheap fades; `reduce-blur` now also strips `.blur-light`/`.blur-medium` and all `blur-*` filters on low-end devices; static `will-change` layers removed.
- **Timer & memory leaks fixed**: Ebook download progress interval cleared on failure; periodic notification checks made idempotent with tracked interval + removable listener + `stopPeriodicChecks()`; dead `PrayerCountdown` component deleted; animation tier benchmark runs once per session instead of on every consumer mount.

### 📻 Live Streams Reliability & Fullscreen Fixes
- **Fixed Broken Makkah & Madinah Streams**: Replaced the CORS-blocked Aloula CDN redirect URLs (rejected by browsers before playback starts) with `m.live.net.sa` HLS streams (later superseded by v2.2.1 — see above).
- **Automatic Source Fallback**: If the primary stream fails, the player automatically switches to a secondary source once before showing a friendly error with Retry.
- **Android Fullscreen Rendering Fix**: Entering fullscreen now uses native `requestFullscreen` + landscape orientation lock on Android, fills the entire screen edge-to-edge (`100vw`/`100vh` with safe-area insets), and recalculates video sizing on `resize`/`orientationchange` so the picture stays centered with `object-fit: contain`. Exiting fullscreen restores the 16:9 layout and unlocks orientation.
- **Quality Selector Cleanup**: Quality picker hidden when the active stream only exposes a single quality level.
- **Source Info Cards**: In-player stream source info cards reflect the current CDN source configuration.

### 🤖 Android Stability
- **Android 14+ Crash Fix**: Replaced the adaptive app icon (rejected by Android 14+ strict notification validation) with a proper white-on-transparent vector drawable — fixes the `BadForegroundServiceNotificationException` crash in `WidgetForegroundService` and prevents the same crash in `AdhanPlaybackService` and `WidgetRefreshWorker`.
- **Android 12+ Background Service Crash Fix**: Wrapped `startForegroundService` in a `try-catch` block to prevent `ForegroundServiceStartNotAllowedException` when widgets trigger updates from the background.

### 📱 Native Widget Reliability
- **Quran Progress Sync Fixed**: The Quran Progress widget never updated because the sync payload was missing its `lastUpdated` timestamp and was silently rejected by runtime validation on every push. The hook now sends a valid timestamp, so reading progress, streak, and goal data reach the widget.
- **Daily Content No Longer Dropped**: When no hadith cache existed yet, the fallback hadith had an empty `source` which failed payload validation and dropped the entire ayah + hadith update. The fallback now carries a valid source so Daily Ayah / Daily Hadith widgets always receive content.
- **Shared Service Lifecycle Fixed**: Each widget's `onDisabled` stopped the shared foreground service when only *its own* instances were gone — removing one widget type while others remained killed step/location monitoring and prayer alarms for the survivors. All five providers now check whether **any** widget type still has instances before stopping the service or cancelling alarms.
- **DST Double-Shift Removed**: A manual daylight-saving adjustment in the widget payload builder shifted every prayer time by +1h whenever the device timezone had DST, showing prayer times one hour late during DST months. Adhan times are UTC-anchored and already render correctly in device-local time, so the adjustment (which also ignored the widget's actual location timezone) was removed entirely.
- **Prayer Payload Shape Fixed**: `usePrayerTimes` was passing the Aladhan API *string* map (e.g. `"05:30"`) to the widget builder, which expects `Date` objects — every `getTime()` was `undefined`, all entries were filtered out, and the payload was dropped, leaving widgets stale until the 30-minute timer recomputed times offline. The hook now pushes the parsed `Date` objects, so widgets reflect the exact times shown in-app.
- **Direct Boot Support**: Enabled device-protected storage context for `WidgetPrefs`, allowing widgets to read preferences and update correctly even when the phone is locked immediately after a reboot.
- **Dead Code Removed**: Deleted orphaned `StepDetectionService` and `LocationChangeService` (superseded by the inline step/location logic in `WidgetForegroundService`).

### 🎨 Native Widget Quality Pass — Light & Dark Theme Support
- **Premium Visual Redesign**: All five widgets completely redesigned with Material 3 glassmorphism, translucent inner rim borders, gold gradient dividers, and unified Arabic brand headers (`نور`).
- **Light + Dark Themes**: All five widgets now ship a full light palette (warm parchment) alongside the dark theme, with dedicated `values-night` / `values-night-v31` overrides — the widgets gracefully switch appearance with the system theme on every Android version, and follow Material You dynamic color on Android 12+.
- **System Corner Radius (Tier 1 WS-2)**: On API 31+ widgets now use the platform-provided `system_app_widget_background_radius` / `system_app_widget_inner_radius` instead of a hardcoded radius, so corners visually match the launcher and OEM surfaces.
- **Reconfigurable Widgets (Tier 1 WS-4)**: All five widget providers now declare `widgetFeatures="reconfigurable"`, letting users tap an existing widget on the home screen to reconfigure it (size, theme, accent) without removing and re-adding it.
- **Contrast & Readability Pass (WC-3)**: Accent and text colors darkened in both palettes (deeper emerald/gold, darker `#BA1A1A` da'if-grade red) and the stale-data badge darkened — every element now clears WCAG AA contrast on light backgrounds.

### 🕌 Major Prayer Times & Quran Refactor
- **usePrayerTimes Hook Complete Rewrite**: Simplified logic with signature-based caching deduping, robust fallback chain (geolocation → stored → manual → timezone default), and separated notification scheduling into new `usePrayerNotifications` hook with 1s throttle.
- **Removed Standalone Mushaf Viewer**: Deleted the standalone `/mushaf` image-based viewer feature to streamline the app. The app now exclusively uses the vertical-scrolling `/quran` reader (which still utilizes the beautiful Madani Mushaf WebP images and integrates with recitation progress/streaks).
- **GlobalPrayerAlarm Optimization**: localStorage caching skips redundant geolocation/API calls when today's times already cached; abort controller for clean fetch cancellation.

### 🌸 Noor Cycle & Women's Wellness
- **Smart Notifications**: Added highly contextual local nudges for Fertile Window tracking (15 days before predicted period) and a smart Qaza Fasting reminder (Sunday evening prompt to make up missed Ramadan fasts, if the user is in Tuhr).
- **Major UI/UX Overhaul**: Transitioned the tracker from a sidebar layout to a fully mobile-optimized native Bottom Tab Bar, preventing layout overlaps.
- **Health Tracking Integrations**: Built a daily Water Hydration Tracker (8 glasses) and a 1-10 Pain Scale logger directly into the Today and Log tabs.
- **Deep System Integration**: Unified the `haidh-tracker-v2` engine. It now actively communicates with the broader app to automatically silence Prayer Notifications and halt Qaza (Missed Prayer) auto-syncing while a cycle is active.
- **Log Confirmation UX**: "Log Today's Data" now shows a "Logged for {date}" confirmation card with a locked summary and a Modify Data button — no more ambiguous saves.
- **Pain Scale Persistence**: Pain levels are now saved into the daily log record (survive tab switches and app restarts) instead of existing only in component state.
- **Missed Fast Count Fix**: Turning off a missed fast now decrements the count instead of double-counting.
- **Performance Optimizations**: Eliminated a heavy, GPU-bound `animate-pulse` effect on the Tuhr icon that was causing frame drops on legacy devices. Removed fragmented legacy state files.
- **Islamic Wellness Library**: Curated Fiqh & Wellness articles added to the Islamic knowledge tab, covering nutrition, exercise, and mental health from an Islamic perspective.

### 🎵 Nasheed Player Upgrades
- **New Equalizer Component**: Animated audio visualizer with configurable bars, colors, heights, and animation timing.
- **Offline Playback Cache**: Played nasheeds cached for offline listening (200 tracks, 90-day retention, quota-safe) with cache status indicators.
- **Filter by Artist**: Quick artist-filter chips for browsing 400+ nasheed library.
- **Back to Top**: Instant jump to top of long library lists.

### ⚡ Performance & Core Web Vitals
- **Added react-window & @types/react-window** for virtualized list support.
- **Prayer Times Hook**: Race condition fixes (removed stale ref checks), `parseTime` throws on invalid input instead of returning current time.
- **GlobalPrayerAlarm**: Module-level side effects moved to `useEffect`; event listener type safety fixed; missing cleanup listeners added.

### 🛡️ Code Quality & Lint Fixes
- **Resolved 12 lint errors**: 5 empty catch blocks (added non-critical comments), 1 `require()`→`import` conversion, 4 `@ts-ignore`→`@ts-expect-error` with descriptions, 1 parsing error (extra closing braces).
- **Settings.tsx**: Fixed empty catch block (eslint error).
- **TypeScript**: Stricter types in prayer times and alarm modules.

### 🕌 Prayer Tracking & Qaza Fixes
- **Critical Prayer Tracking Bridge**: `syncMissedPrayersToQaza()` moved from unused SalahTracker into Dashboard.tsx — missed prayers auto-detected and added to qaza from home screen.
- **Dashboard Prayer Time Validation**: Check-in passes prayer times to `togglePrayer()`, showing "Cannot check in before prayer time" error instead of silently bypassing.
- **Qaza History Centralized**: Moved to `qaza-tracker.ts` lib functions (`getQazaHistory`, `addQazaHistoryEntry`, `getQazaDailyGoal`, `setQazaDailyGoal`).
- **Streak Reset on Foreground**: `visibilitychange` listener calls `checkStreakReset()` on app return, ensuring streaks reset correctly after days away.
- **Hadith Collection Flash Fix**: `HadithBookView` initializes `metadataLoading` to `true`, checks `remoteCollectionData` for loading guard — eliminates "1 book" flash.

### 🧹 Dead Code Cleanup
- **Deleted Unused Components**: `SalahTracker.tsx` (205 lines), `PrayerTimesList.tsx` (451 lines), `EnhancedPrayerTimesList.tsx` (111 lines) — imported but never rendered.
- **Dashboard Cleanup**: Removed unused lazy imports for `PrayerTimesList`, `SalahTracker`, `QazaTracker`.

### 🌐 Complete Language & Translation Overhaul
- **All 5 Languages Synchronized**: English, Arabic, Urdu, Bengali, Russian — 410 translation keys each (was 278-314 with 99-105 missing).
- **Hardcoded English Strings Eliminated**: 20+ AppBar titles, BottomNav labels, DashboardFeatureCards now use `t()`.
- **Locale-Aware Formatting**: `time-formatter.ts`, `useI18n.ts`, `widget-service.ts` respect selected language.
- **RTL/Widget Sync Consistency**: Migrated to `useLanguage()` for proper RTL and widget string sync.
- **Widget String Sync**: Android widgets receive translated prayer labels in all 5 languages.

### 🔔 Intelligent Notification Engine
- **Ghost Notification Fix**: Ramadan reminders (Suhoor, Iftar, Tarawih) no longer persist into other months — safety clear on-boot sweeps native OS buffer.
- **Deterministic Scheduling**: Predictable ID mapping (`Suhoor: 2001`, `Iftar: 2002`) replaces random hashes for proper overwrite/cancel.
- **Accurate Calendar Countdowns**: Async `islamicCalendarService` replaces deprecated tabular estimates.

### 🛡️ Bulletproof Backup & Restore System
- **Unified Backup Service**: Single `backup-service.ts` consolidates legacy systems — existing backups auto-migrated on first launch.
- **Complete Data Capture**: All localStorage + Capacitor Preferences + e-book metadata, Seerah/Qisas/Hadith progress, quiz economy, sleep settings, global player states, Eid checklists.
- **Always-On Auto Save**: Snapshot every 20 min of use + on app close; latest overwrites previous; offered back on reinstall.
- **Google Cloud Backup Rules**: `backup_rules.xml` + `data_extraction_rules.xml` declare WebView storage and preferences for Android Auto Backup (caches excluded for 25MB limit).
- **Real Export on Android**: Backup button opens system share sheet (save to Downloads, Drive, Files) — previously failed silently in WebView.
- **First-Launch Restore Prompt**: Auto-detects previous data after reinstall, offers one-tap restore.
- **Never Loses Data Silently**: Verifies integrity, warns on older-over-newer import, recovers partially from failures, reports in plain language.

---

## [2.0.1] - 2026-07-21

### Quran Progress Tracking Fixes

#### 🐛 Bug Fixes
- Fixed incorrect surah count: Progress now only counts fully completed surahs (when all ayahs are read), not partially read ones.
- Fixed misleading UI text: Updated "Surahs Completed" to "Surahs fully Completed" for clarity.
- Fixed wrong progress calculation: Changed from ayah-based estimation to accurate page-based tracking (604 total pages).
- Fixed position tracking bug: Progress now tracks current page position instead of maximum page ever visited.
- Fixed widget sync mismatch: Added widget-compatible localStorage key sync for native Android widgets.

#### ⚡ Improvements
- Updated `QuranProgressWidget` to display pages read (X/604) instead of ayahs.
- Modified `quran-features` service to track pages read and calculate percentage based on pages.
- Fixed `QuranReader` to use current page instead of `maxPageViewed` for progress.
- Added widget progress synchronization with proper payload formatting.

---

## [2.0.0] - 2026-07-10

### Noor Connect 2.0 — Major Release

#### ✨ New Features
- **Widget System v2**: 5 native Kotlin widgets (Next Prayer, Daily Ayah, Daily Hadith, Quran Progress, Tasbeeh Counter) rebuilt from scratch with Material You dynamic color.
- **Noor Cycle**: Ovulation day tracking, cycle insights, fertile window, analytics tab with recharts, and PDF doctor report export.
- **Seerah chapters and Qisas (Stories of Prophets)**: Reader with offline tafsir support and progress tracking.
- **Zakat Calculator**: Silver asset calculation, exchange rate fallback service, and preferred currency persistence.
- **Hadith expansion**: 10 new collections (adab, ahmad, bulugh, darimi, forty, hisn, malik, mishkat, riyadussalihin, shamail), HadithDetail page, and HadithBookmarks.
- **Backup & Restore**: Cross-platform localStorage-based backup with auto-restore on reinstall and smart background processing.
- **Low-end device optimizations**: Device detection, adaptive performance settings, React Query tuning, and 30+ FPS target on 2016+ devices.
- **Islamic Remedies**: Mood grid redesign, full-screen remedy viewer with framer-motion entrance animations, gamification, and Dashboard widget.
- **Radio Statistics & Achievements**: Per-station listening stats, total watch time, streak tracking, and unlockable achievements.
- **Quran reading progress (X/Y)**: On all book cards, uploads, and detail modal; PDF reader with local worker and blob: CSP fix.
- **LiveStreams**: Aggressive HLS buffering (120s), quality switcher UI (Auto/320p/480p), and hardcapped recovery loop to prevent OS freezing on weak networks.
- **Qibla enhancements**: Single smart button with geo-anchor note, magnetic declination correction via NOAA API, device orientation and metal-interference warnings with calibration UX.

#### 🐛 Bug Fixes
- Critical Haidh Tracker fixes: prayer pause/resume on cycle start/end, backup inclusion, gender filter, and route consolidation.
- TypeScript strictness: removed unsafe `JSON.parse` and `as any` casts, fixed dependency arrays, race conditions, and memory leaks.
- Widget stability: `WidgetBootReceiver` refactor, payload validation logging, thread-safe `HadithBundle.cachedHadiths`, and Arabic RTL fixes.
- Quran Reader: Chunked progressive rendering to fix massive FPS drop and CLS; surah-to-page mapping corrected with proper +2 image offset.
- SurahList: Wrapped navigation in `startTransition` to fix poor INP; replaced react-window v1 List with standard mapped list.
- Splash screen: Removed framer-motion and rewrote in pure CSS, cutting LCP from 5s to under 1s.
- Hadith: Singleton FPS monitor, fixed double API calls, back navigation, loading states, and collection metadata (totalHadith/totalBooks).
- Hadith bookmarks: New HadithBookmarks page, `useHadithBookmarks` hook, and bookmark buttons on all hadith pages.
- Settings: Toggle "Animations" now correctly disables all heavy Framer Motion animations globally across the app.
- Quran Reader: Resolved text overflow issues where English Surah names were going off-screen on smaller devices.
- Quran Reader: Added an instant golden loading spinner and `useTransition` hook to eliminate the slight delay when opening a Surah.
- App Icon: Removed `android:roundIcon` attribute from AndroidManifest to resolve icon rendering issues on legacy Android brands.

#### ⚡ Improvements
- **F-Droid Metadata**: Updated license to GPL-3.0-or-later and synchronized feature descriptions (Widgets, Menstrual Tracker, Zakat) for store publication.
- RadioStats consolidated into unified MediaStats tracking Live Makkah/Madinah watch time.
- Spotify-inspired PremiumDashboard with gold/green accents, dynamic greetings, and backdrop blurs.
- Device performance imports fixed for backward compatibility (performance-optimizations instead of device-performance.ts).
- Removed vestigial Quran Display Settings from Profile page (font size slider, script style dropdown, and clear cache button) since Quran now uses Mushaf image pages.
- Deleted orphaned components `MushafPage.tsx` and `MushafWord.tsx` which were no longer imported anywhere in the app.
- F-Droid APK size reduction: stripped >300MB of offline JSON data via `clean-dist-data.js`, allowing the F-Droid build to heavily rely on remote CDNs for an 84MB footprint.
- Qibla performance: removed conflicting CSS transitions on the compass dial, eliminating sensor jitter and rubber-banding lag on legacy Android devices.
- App UI polish: applied the Azimuth premium dark/amber aesthetic to all dashboard widgets, standardizing colors and blurs.
- Removed chunking errors to resolve Vercel deployment circular dependency and React Context rendering issues.

---

## [1.3.0] - 2026-07-03

### Expanded Features — Zen Mode, Hadith, Widgets, Noor Cycle

#### ✨ New Features
- **Zen Mode (Tasbeeh)**: Dhikr counter, categories, and review mode.
- **Quiz expansion**: Categories, review mode, and gamification streaks.
- **Duas expansion**: Search, DuaOfDay, audio playback, and counter.
- **Hadith/Seerah/Qisas UI/UX overhaul**: Skeleton loading, Continue Reading cards, share buttons, and copy-with-toast.
- **Noor Cycle (Haidh Tracker) foundation**: 6 tabs (Calendar, Ghusl, Islamic, Log, Settings, Today).
- **Islamic Remedies**: Mood grid redesign, full-screen viewer, gamification stats, and Dashboard widget.
- **Widget system**: Rebuilt from scratch with native Kotlin implementation and Material You design.
- **Performance optimization**: Low-end device optimizations: React.memo, virtualization, code-splitting, and lazy loading.
- **Notification overhaul**: Fixed hadith randomization, low-end device throttling, dynamic SW dates, dedup scheduling, and caching.

#### 🐛 Bug Fixes
- Qibla: compass heading accuracy, layout overflow fixes, and F-Droid compliance with custom FOSS sensor implementation.
- Profile page: madhab labels updated, Islamic sleep reminder toggle added, SurahList react-window import fixed.
- Calendar: Wired `daysUntilRamadan`, replaced offline fallback with tabular Islamic calendar, and dynamic Eid date lookup.

---

## [1.2.0] - 2026-03-30

### Live Radio Widget & Native Android Improvements

#### ✨ New Features
- **Live Quran Radio Widget**: Direct background audio playback and home screen controls.
- **Next Adhan, Daily Ayah, and Daily Schedule Widgets**: Rebuilt in native Kotlin for perfect Doze mode performance.

#### 🐛 Bug Fixes
- Fixed Quiz streak logic and Daily check-in errors during Menstrual Mode overrides.
- Corrected premature Eid Mubarak popups from triggering before Shawwal.
- Replaced non-free qibla library with custom FOSS sensor implementation for F-Droid compliance.
- Refactored geolocation to use Web API and consolidated Permission Manager for cross-platform stability.
- Fixed qibla compass heading, layout overflow, and widget data flow bugs.
- Critical security fixes: TypeScript strict mode enabled, XSS vulnerability patched, ErrorBoundary added, and console.log stripped from production.

#### ⚡ Improvements
- Added premium Android 14 notification center integration with large icon display support.

---

## [1.1.0] - 2026-03-20

### Gender-Based Features & Menstrual Mode

#### ✨ New Features
- Added gender selection for personalized experience.
- Menstrual mode for prayer notification management.
- Widget customization system.

#### ⚡ Improvements
- Enhanced dashboard with customizable widgets.

---

## [1.0.0] - 2026-03-01

### Initial Release

#### ✨ Features
- Quran reading with audio recitation.
- Prayer times with location detection.
- Qibla direction finder.
- Daily ayah and hadith.
- Tasbeeh counter.
- Islamic quiz with XP system.
- Duas and supplications collection.
- 99 Names of Allah.

---

*This project is licensed under the [GNU General Public License v3.0](LICENSE).*