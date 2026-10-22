/**
 * Stale-chunk recovery — self-heals the app after a redeploy.
 *
 * When a deployment replaces hashed chunks, a browser still holding a
 * stale index.html (cached HTML or an old precache) requests chunk files
 * that no longer exist. The SPA rewrite answers those requests with
 * index.html (text/html), so the dynamic import fails with
 * "Failed to fetch dynamically imported module" / MIME-type errors and
 * the ErrorBoundary takes over.
 *
 * Recovery: clear the app's caches, unregister service workers and
 * reload once so the tab boots from the fresh deployment. A
 * sessionStorage guard makes this a one-shot per tab session so a
 * non-cache-related failure can never cause a reload loop. Recovery is
 * skipped while the browser is offline (purging would brick the
 * offline app); the ErrorBoundary UI stays visible instead.
 */

const RELOAD_GUARD_KEY = 'nc-stale-chunk-reload-used';

const STALE_CHUNK_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'mime type of "text/html"',
  'expected a javascript-or-wasm module script',
];

export function isStaleChunkError(error: unknown): boolean {
  if (!error) return false;
  const msg = String((error as Error)?.message ?? error).toLowerCase();
  return STALE_CHUNK_PATTERNS.some((p) => msg.includes(p));
}

/** Delete every runtime cache this app ever created. */
export async function purgeAppCaches(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('noor-connect-') || k.startsWith('workbox-'))
          .map((k) => caches.delete(k))
      );
    }
  } catch {
    /* ignore */
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
}

/** True when a recovery reload has already been used in this tab session. */
function recoveryAlreadyUsed(): boolean {
  try {
    return sessionStorage.getItem(RELOAD_GUARD_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Attempt one-shot cache-purge recovery. Returns true when a reload is
 * starting (callers should suppress their own error UI).
 */
export function recoverFromStaleChunk(error?: unknown): boolean {
  try {
    if (recoveryAlreadyUsed()) return false;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    if (error !== undefined && !isStaleChunkError(error)) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
    void purgeAppCaches().finally(() => window.location.reload());
    return true;
  } catch {
    return false;
  }
}

/** Install global listeners (idempotent-safe: call once from main.tsx). */
export function installStaleChunkRecovery(): void {
  if (typeof window === 'undefined') return;
  // Vite emits this when a modulepreload/dynamic-import fetch fails inside
  // the preload helper (typical stale-chunk failure after a redeploy).
  window.addEventListener('vite:preloadError', (e) => {
    e.preventDefault();
    recoverFromStaleChunk();
  });
  // Route-level dynamic imports that reject outside React's error
  // handling surface here.
  window.addEventListener('unhandledrejection', (e) => {
    if (isStaleChunkError(e.reason)) {
      e.preventDefault();
      recoverFromStaleChunk();
    }
  });
}
