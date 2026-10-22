/**
 * Update Safety
 * Lightweight boot-time check that runs when the app version changes.
 *
 * Goals:
 *  - Detect (and record) app version transitions across APK/PWA updates.
 *  - Warn loudly (console only) if user data that previously existed appears
 *    to be missing after an update — e.g. the historical WebView origin change
 *    (http://localhost → https://localhost) that made old localStorage and
 *    IndexedDB unreachable.
 *  - Expose storage quota/usage health for diagnostics.
 *
 * HARD RULES:
 *  - NEVER deletes, moves or rewrites any user data.
 *  - NEVER throws into boot: every step is individually guarded.
 *  - Dependency-free apart from @capacitor/preferences (with a localStorage
 *    fallback, mirroring the pattern in haptic-service.ts).
 */

import { Preferences } from '@capacitor/preferences';
import { CURRENT_APP_VERSION } from './constants';

const LAST_VERSION_KEY = 'noor:last-app-version';
const DATA_SEEN_FLAG_KEY = 'noor:essential-data-seen';

/**
 * Keys whose presence proves "real user data exists in this WebView origin".
 * Derived from the STORAGE_KEYS inventory in storage.ts + backup-service.ts.
 * Used ONLY for read-only health checks.
 */
const ESSENTIAL_DATA_KEYS: readonly string[] = [
  'bookmarks',
  'favorites',
  'tasbeeh-total',
  'tasbeeh-history',
  'quran-last-read',
  'salah-session-history',
  'haidh-tracker-v2',
  'prayer-settings',
  'location-storage',
  'madhab',
  'time-format',
  'theme',
  'calculation-method',
  'cached-prayer-times',
];

export interface UpdateSafetyResult {
  from: string | null;
  to: string;
  changed: boolean;
  firstRun: boolean;
}

export interface EssentialKeyStatus {
  key: string;
  present: boolean;
  bytes: number;
}

export interface StorageHealth {
  quotaEstimateSupported: boolean;
  usage: number | null;
  quota: number | null;
}

// ─── Internal helpers (all guarded, never throw) ──────────────────────────────

const readLastVersion = async (): Promise<string | null> => {
  try {
    const { value } = await Preferences.get({ key: LAST_VERSION_KEY });
    if (value) return value;
  } catch {
    // fall through to localStorage
  }
  try {
    return localStorage.getItem(LAST_VERSION_KEY);
  } catch {
    return null;
  }
};

const writeLastVersion = async (version: string): Promise<void> => {
  try {
    await Preferences.set({ key: LAST_VERSION_KEY, value: version });
  } catch {
    try {
      localStorage.setItem(LAST_VERSION_KEY, version);
    } catch {
      // Nothing more we can do; the next boot will simply re-detect.
    }
  }
};

const readDataSeenFlag = async (): Promise<boolean> => {
  try {
    const { value } = await Preferences.get({ key: DATA_SEEN_FLAG_KEY });
    if (value === 'true') return true;
    if (value === 'false') return false;
  } catch {
    // fall through to localStorage
  }
  try {
    return localStorage.getItem(DATA_SEEN_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
};

const writeDataSeenFlag = async (seen: boolean): Promise<void> => {
  try {
    await Preferences.set({ key: DATA_SEEN_FLAG_KEY, value: seen ? 'true' : 'false' });
  } catch {
    try {
      localStorage.setItem(DATA_SEEN_FLAG_KEY, seen ? 'true' : 'false');
    } catch {
      // ignore — flag is best-effort
    }
  }
};

const readEssentialKeyStatus = (): EssentialKeyStatus[] => {
  const status: EssentialKeyStatus[] = [];
  for (const key of ESSENTIAL_DATA_KEYS) {
    let present = false;
    let bytes = 0;
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        present = item.length > 0;
        bytes = item.length;
      }
    } catch {
      present = false;
    }
    status.push({ key, present, bytes });
  }
  return status;
};

const warnMissingEssentialData = (status: EssentialKeyStatus[], from: string): void => {
  try {
    console.warn(
      `[update-safety] App updated ${from} → ${CURRENT_APP_VERSION}: ` +
      `ALL essential data keys are unexpectedly EMPTY although data existed ` +
      `on a previous run. This usually means the WebView storage origin ` +
      `changed (e.g. http://localhost → https://localhost) or storage was ` +
      `cleared externally. Reporting ONLY — no data is modified.`
    );
    console.table(status);
  } catch {
    // console.table unavailable — fall back to a plain line
    console.warn(
      '[update-safety] Essential data keys all empty:',
      status.map(s => `${s.key}=${s.present ? s.bytes + 'B' : '∅'}`).join(', ')
    );
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Boot-time update check. Fire-and-forget safe: never rejects, never throws.
 * Call once after i18n init and before React renders (see src/main.tsx).
 */
export async function initUpdateSafety(): Promise<UpdateSafetyResult | null> {
  try {
    const from = await readLastVersion();
    const firstRun = from === null;
    const changed = !firstRun && from !== CURRENT_APP_VERSION;
    const versionChangedOrFirstRun = firstRun || changed;

    if (versionChangedOrFirstRun) {
      // Record the new version (idempotent).
      await writeLastVersion(CURRENT_APP_VERSION);

      // Announce the transition for anyone listening (diagnostics only).
      try {
        window.dispatchEvent(
          new CustomEvent('noor:app-updated', {
            detail: { from: from ?? null, to: CURRENT_APP_VERSION },
          })
        );
      } catch {
        // window may be unavailable in exotic embeds — ignore
      }

      // Data-loss sentinel: only meaningful when a previous version ran and
      // flagged that essential data existed, yet now every essential key is
      // empty. Read-only check; the flag is intentionally NOT cleared.
      if (!firstRun) {
        const status = readEssentialKeyStatus();
        const anyPresent = status.some(s => s.present);
        const seenBefore = await readDataSeenFlag();
        if (seenBefore && !anyPresent) {
          warnMissingEssentialData(status, from as string);
        }
      }
    }

    // Keep the "data existed" flag fresh on every boot (monotonic: once true,
    // stays true unless someone deliberately resets it).
    try {
      const status = readEssentialKeyStatus();
      if (status.some(s => s.present)) {
        const seenBefore = await readDataSeenFlag();
        if (!seenBefore) await writeDataSeenFlag(true);
      }
    } catch {
      // ignore
    }

    return { from: from ?? null, to: CURRENT_APP_VERSION, changed, firstRun };
  } catch (error) {
    console.warn('[update-safety] init skipped (non-fatal):', error);
    return null;
  }
}

/**
 * Storage usage/quota estimate for diagnostics.
 * Returns quotaEstimateSupported=false when the API is unavailable.
 */
export async function getStorageHealth(): Promise<StorageHealth> {
  try {
    const storageManager = (
      navigator as {
        storage?: {
          estimate?: () => Promise<{ usage?: number; quota?: number }>;
        };
      }
    ).storage;
    if (storageManager && typeof storageManager.estimate === 'function') {
      const estimate = await storageManager.estimate();
      return {
        quotaEstimateSupported: true,
        usage: typeof estimate.usage === 'number' ? estimate.usage : null,
        quota: typeof estimate.quota === 'number' ? estimate.quota : null,
      };
    }
  } catch {
    // ignore — fall through to unsupported
  }
  return { quotaEstimateSupported: false, usage: null, quota: null };
}
