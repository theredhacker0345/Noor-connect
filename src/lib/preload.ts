/**
 * Route-chunk preloaders (fire-and-forget).
 *
 * Goal: make the Quran list open near-instantly. The /quran route is a lazy
 * chunk (src/pages/SurahList); when a user taps the Quran tab before the
 * app-level idle preloader has run, that tap pays the full chunk
 * download+parse behind a full-screen Suspense spinner. Warm the chunk as
 * early as possible instead:
 *  - App.tsx preloads it on idle (startup path),
 *  - BottomNav's Quran tab calls this on pointerdown/focus (tap path).
 *
 * This resolves the exact same module instance React.lazy uses, so by the
 * time the route mounts, the chunk is already fetched, parsed and evaluated.
 * Never throws; a failed dynamic import clears the flag so a later tap can
 * retry.
 */

let quranListPreloadStarted = false;

export function preloadQuranList(): void {
  if (quranListPreloadStarted) return;
  quranListPreloadStarted = true;
  // Same specifier React.lazy uses for the /quran route — the browser module
  // map dedupes the work; the promise result is intentionally ignored.
  import("@/pages/SurahList").catch(() => {
    quranListPreloadStarted = false;
  });
}
