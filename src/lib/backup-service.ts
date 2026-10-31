/**
 * BackupService — single source of truth for all backup/restore logic in Noor Connect.
 *
 * Consolidates the legacy systems:
 *   - backup.ts v2.0 (manual export/import + single auto-backup in Preferences)
 *   - backup-restore-service.ts v1.0 (localStorage backup_data/backup_metadata keys)
 *
 * Design goals (target user: completely non-technical, never saves anything manually):
 *   1. Everything is captured — every localStorage key (bounded by the ~5MB quota),
 *      every Capacitor Preference, e-book metadata.
 *   2. Nothing important is ever silently dropped — every operation returns a
 *      typed BackupResult with an error message in plain language.
 *   3. The single latest snapshot is kept in Capacitor Preferences, which is
 *      included in Android Auto Backup (see backup_rules.xml /
 *      data_extraction_rules.xml), so a snapshot taken before uninstall survives
 *      a reinstall + cloud restore.
 *   4. First launch after a fresh install automatically offers to restore the
 *      latest snapshot — zero instructions required.
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { clearAllBooks, getDownloadedBooks, type DownloadedBook } from './ebooks-storage';
import { CURRENT_APP_VERSION } from './constants';

// ─── Format & retention ───────────────────────────────────────────────────────

export const BACKUP_VERSION = '2.1';

/** Skip a snapshot if the last one is younger than this (prevents burst writes). */
const SNAPSHOT_MIN_INTERVAL_MS = 60_000;

// ─── Storage keys ─────────────────────────────────────────────────────────────

/** Single latest snapshot — always overwritten, never rotated. */
const SNAPSHOT_LATEST_KEY = 'backup-snapshot-latest';
/** Legacy rotation prefix (backup-snapshot-<ISO>); migrated and swept on upgrade. */
const SNAPSHOT_LEGACY_PREFIX = 'backup-snapshot-';
const SNAPSHOT_META_KEY = 'backup-snapshot-meta';
const AUTO_BACKUP_KEY = 'auto-backup-data';
const AUTO_BACKUP_META_KEY = 'auto-backup-metadata';
const LEGACY_DATA_KEY = 'backup_data'; // System B v1.0 (localStorage)
const LEGACY_META_KEY = 'backup_metadata'; // System B v1.0 (localStorage)
const LEGACY_CHECKED_KEY = 'backup_checked_session'; // System B v1.0 (Preferences)
const CHECK_DONE_KEY = 'backup-restore-check-done'; // localStorage, per-install
const AUTO_BACKUP_ENABLED_KEY = 'auto-backup-enabled'; // legacy toggle, removed in v2.2

/** On web, Capacitor Preferences are stored under this prefix inside localStorage. */
const WEB_PREFERENCES_PREFIX = 'CapacitorStorage.';

/** Budgets: a snapshot larger than this gets compacted (ebooks, then non-critical prefs).
 *  Web is tighter because snapshots live inside the ~5MB localStorage quota. */
const SNAPSHOT_BUDGET_NATIVE = 4 * 1024 * 1024;
const SNAPSHOT_BUDGET_WEB = 1.2 * 1024 * 1024;
const EXPORT_BUDGET = 4 * 1024 * 1024;

function snapshotBudget(): number {
  return Capacitor.isNativePlatform() ? SNAPSHOT_BUDGET_NATIVE : SNAPSHOT_BUDGET_WEB;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BackupData {
  version: string;
  appVersion?: string;
  exportedAt: string;
  storage: Record<string, string | null>;
  preferences?: Record<string, string>;
  downloadedBooks?: DownloadedBook[];
}

export interface BackupStats {
  storageKeys: number;
  prefKeys: number;
  ebookCount: number;
  sizeBytes: number;
}

export interface BackupResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface SnapshotInfo {
  timestamp: string; // ISO
  sizeBytes: number;
}

export interface RestoreSummary {
  restoredKeys: number;
  failedKeys: number;
  failedSamples: string[];
  verified: boolean;
  booksToDownload: DownloadedBook[];
  /** Set when the restored data is older than the latest snapshot. */
  warning?: string;
}

export interface RestoreOpportunity {
  snapshot: SnapshotInfo;
}

// ─── Known data keys (documentation + ordering) ───────────────────────────────
// NOTE: exportBackup intentionally captures *every* localStorage key (minus the
// backup-internal ones) so newly added features are backed up automatically.
// This list exists as the explicit inventory of what the app stores.

const KNOWN_STORAGE_KEYS: readonly string[] = [
  // Core settings
  'theme', 'madhab', 'time-format', 'calculation-method', 'prayer-method',
  'hijri-date-offset', 'prayer-reminder-minutes', 'language', 'app-language',
  'i18nextLng', 'salam-greeting-enabled', 'user-gender', 'gender-settings',
  'user-onboarded', 'permissions-granted', 'location-storage', 'user-location-data',
  'selected-reciter', 'mp3quran-selected-reciter', 'quran-font-size', 'quran-font',
  'prayer-alarm-enabled', 'show-extra-prayers', 'last-hadith', 'lastHadithDate',
  'lastHadithData', 'cached-prayer-times', 'cached_prayer_times', 'prayer-times-today',
  'animations_enabled', 'auto-sync-enabled', 'app-install-source', 'app-version-cache',
  'pwa-install-dismissed',
  // Salah & Qaza
  'salah-tracker', 'salah-streak', 'qaza-prayers', 'processed-salah-qaza',
  'qaza-history', 'qaza-daily-goal', 'menstrual-mode-data', 'haidh-tracker-v2',
  'menstrual-symptoms', 'menstrual-mood-entries', 'salah-focus-settings',
  'salah-current-session', 'salah-session-history', 'salah-audio-backup',
  'quran-volume', 'radio-volume', 'notifications-enabled',
  // Quran
  'quran-bookmarks', 'quran-notes', 'quran-recitation-progress', 'quran-reading-streak',
  'quran-achievements', 'quran-translation', 'quran-font-manager-settings',
  'quran-last-read', 'quran-surahs-cache', 'quran-recent-editions',
  'quran-audio-state', 'mp3quran-reciters-v1',
  // Tasbeeh
  'tasbeeh-total', 'tasbeeh-history',
  // Remedies
  'remedy-stats', 'remedy-favorites', 'daily-remedy', 'remedy-achievements',
  'remedy-power', 'remedy-level', 'remedy-xp',
  // Tafsir
  'tafsir-bookmarks', 'tafsir-history', 'tafsir-notes', 'tafsir-selected-edition',
  'tafsir-edition', 'tafsir-settings',
  // Habit tracker
  'habit-tracker-data', 'islamic-habits', 'habit-entries', 'custom-habits', 'hidden-habits',
  // Quiz economy
  'quiz-stats', 'enhanced-quiz-stats', 'quiz-history', 'quiz-achievements',
  'quiz-last-played', 'quiz-power-ups', 'quiz-inventory', 'quiz-store-state',
  'quiz-purchase-history', 'quiz-daily-challenge', 'quiz-daily-rewards',
  'quiz-combo-state', 'quiz-xp-transactions', 'quiz-lives-system', 'quiz-time-events',
  'quiz-active-event', 'quiz-notification-settings', 'quiz-last-notifications',
  // Favorites & social
  'favorites', 'islamic-names-favorites', 'mood-history', 'ramadan-activity',
  'duas-favorites', 'zakat-calc-history', 'preferred-currency',
  // Seerah / Qisas / Hadith readers
  'noor-seerah-progress', 'noor-seerah-bookmarks', 'noor-seerah-font-size', 'noor-seerah-last-read',
  'noor-qisas-progress', 'noor-qisas-bookmarks', 'noor-qisas-font-size', 'noor-qisas-last-read',
  'noor-hadith-progress', 'noor-hadith-bookmarks', 'noor-hadith-font-size', 'noor-hadith-last-read',
  // Ebooks
  'book-collections', 'ebook-reading-progress', 'ebook-last-read', 'ebook-bookmarks',
  // Sleep
  'islamic-sleep-enabled', 'islamic-sleep-offset', 'islamic-sleep-reminder-timeout',
  'before-sleep-enabled', 'bedtime-hour', 'bedtime-minute', 'bedtime-notification-id',
  // Global players
  'global-quran-state', 'global-nasheed-state-v2', 'global-radio-state',
  // Radio UI
  'pinned-radio-stations',
  // Notifications & adhan
  'notification-preferences', 'notification-history', 'notification-last-asked',
  'notification-permission-timestamp', 'notification-permission-denied',
  'daily-hadith-target', 'adhan-preferences', 'azan-files-metadata',
  'selected-adhan-id', 'selected-adhan', 'custom-adhans', 'adhan-config',
  // Eid & festive
  'eid-checklist-data', 'eid-prayer', 'eid-checklist-notification-shown',
  'eid-checklist-notification-dismissed', 'eid-greeting',
  'fitrana-calculator-notification-dismissed',
  // Misc
  'mystery-box-last-claim', 'mystery-box-history',
  'offline-sync-config', 'background-sync-config', 'background-sync-task',
  'next-sync-time', 'daily-ayah-cache', 'daily-hadith-cache',
  // Dynamic (prefixed) keys — matched by prefix at runtime
  'noor-water-<date>', 'ebook-<bookId>', 'exchange-rate-fallback-<currency>',
];

/** Pref keys that survive snapshot compaction when storage pressure is extreme. */
const CRITICAL_PREF_KEYS: readonly string[] = [
  'theme', 'time-format', 'calculation-method', 'prayer-method', 'madhab',
  'hijri-date-offset', 'language', 'selected-reciter', 'quran-font-size',
  'quran-font', 'preferred-currency', 'salam-greeting-enabled',
  'show-extra-prayers', 'prayer-reminder-minutes',
];

// ─── Internal key detection ───────────────────────────────────────────────────

function stripWebPrefix(key: string): string {
  return key.startsWith(WEB_PREFERENCES_PREFIX)
    ? key.slice(WEB_PREFERENCES_PREFIX.length)
    : key;
}

function isInternalKey(key: string): boolean {
  const bare = stripWebPrefix(key);
  if (bare === SNAPSHOT_LATEST_KEY || bare === AUTO_BACKUP_KEY || bare === AUTO_BACKUP_META_KEY || bare === SNAPSHOT_META_KEY) return true;
  if (bare === LEGACY_CHECKED_KEY || bare === LEGACY_DATA_KEY || bare === LEGACY_META_KEY || bare === CHECK_DONE_KEY) return true;
  return bare.startsWith(SNAPSHOT_LEGACY_PREFIX);
}

/**
 * One-shot flags / transient state that must reset fresh on a new install.
 * Excluded from export AND skipped on restore (covers old backup files that
 * still contain them).
 */
const TRANSIENT_STORAGE_KEYS: ReadonlySet<string> = new Set([
  'eid-greeting',
  'notification-permission-denied',
  'notification-permission-timestamp',
  'background-sync-task',
  'next-sync-time',
  'eid-checklist-notification-shown',
  'eid-checklist-notification-dismissed',
  'fitrana-calculator-notification-dismissed',
  CHECK_DONE_KEY,
]);

function isTransientKey(key: string): boolean {
  return TRANSIENT_STORAGE_KEYS.has(stripWebPrefix(key));
}

// ─── Capture (dirty-write-safe: all localStorage reads are synchronous and
// ─── happen inside one tick, so a snapshot can never see a half-written value) ──

function captureLocalStorage(): Record<string, string | null> {
  const storage: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || isInternalKey(key) || isTransientKey(key)) continue;
    storage[key] = localStorage.getItem(key);
  }
  return storage;
}

async function capturePreferences(): Promise<Record<string, string>> {
  const prefs: Record<string, string> = {};
  try {
    const { keys } = await Preferences.keys();
    for (const key of keys) {
      if (isInternalKey(key)) continue;
      try {
        const { value } = await Preferences.get({ key });
        if (value !== null) prefs[key] = value;
      } catch {
        // A single unreadable preference must not kill the whole backup.
        console.warn(`BackupService: failed to read preference "${key}"`);
      }
    }
  } catch (error) {
    console.warn('BackupService: failed to enumerate Preferences', error);
  }
  return prefs;
}

// ─── Building backups ─────────────────────────────────────────────────────────

export interface BuildBackupOptions {
  pretty?: boolean;
  includeEbooks?: boolean;
  /** Preferences are collected on native only; on web they are already inside localStorage. */
  includePrefs?: boolean;
  /** Compaction budget in bytes (default: 4MB). */
  budget?: number;
}

export const buildBackup = async (
  options: BuildBackupOptions = {}
): Promise<BackupResult<{ json: string; stats: BackupStats }>> => {
  try {
    const { pretty = false, includeEbooks = true, includePrefs = true } = options;
    const budget = options.budget ?? EXPORT_BUDGET;
    const isNative = Capacitor.isNativePlatform();

    const storage = captureLocalStorage();

    let downloadedBooks: DownloadedBook[] = [];
    if (includeEbooks) {
      try {
        downloadedBooks = await getDownloadedBooks();
      } catch (error) {
        console.warn('BackupService: failed to read downloaded books', error);
      }
    }

    let prefs: Record<string, string> = {};
    if (includePrefs && isNative) {
      prefs = await capturePreferences();
    }

    const payload: BackupData = {
      version: BACKUP_VERSION,
      appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : CURRENT_APP_VERSION,
      exportedAt: new Date().toISOString(),
      storage,
      preferences: prefs,
      downloadedBooks,
    };

    let json = JSON.stringify(payload);

    // Quota-safe compaction: ebooks are regenerable — drop them first.
    if (json.length > budget && downloadedBooks.length > 0) {
      payload.downloadedBooks = [];
      json = JSON.stringify(payload);
    }
    // Then drop non-critical preferences.
    if (json.length > budget) {
      const critical: Record<string, string> = {};
      for (const key of CRITICAL_PREF_KEYS) {
        if (prefs[key] !== undefined) critical[key] = prefs[key];
      }
      payload.preferences = critical;
      json = JSON.stringify(payload);
    }
    if (json.length > budget) {
      return { success: false, error: 'Your data is too large to back up safely.' };
    }

    return {
      success: true,
      data: {
        json: pretty ? JSON.stringify(payload, null, 2) : json,
        stats: {
          storageKeys: Object.keys(storage).length,
          prefKeys: Object.keys(prefs).length,
          ebookCount: downloadedBooks.length,
          sizeBytes: json.length,
        },
      },
    };
  } catch (error) {
    console.error('BackupService: buildBackup failed', error);
    return { success: false, error: 'Could not create a backup right now.' };
  }
};

export const exportBackup = async (options: BuildBackupOptions = {}): Promise<string> => {
  const result = await buildBackup(options);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Backup failed');
  }
  return result.data.json;
};

// ─── Snapshot (single latest, single-flight) ──────────────────────────────────

let snapshotQueue: Promise<BackupResult<SnapshotInfo | null>> | null = null;
let lastSnapshotAt = 0;

async function writeSnapshot(payload: BackupData): Promise<BackupResult<SnapshotInfo>> {
  try {
    const json = JSON.stringify(payload);
    await Preferences.set({ key: SNAPSHOT_LATEST_KEY, value: json });
    return { success: true, data: { timestamp: payload.exportedAt, sizeBytes: json.length } };
  } catch (error) {
    console.error('BackupService: writeSnapshot failed', error);
    return { success: false, error: 'Could not save the automatic backup.' };
  }
}

async function readLatestSnapshot(): Promise<SnapshotInfo | null> {
  try {
    const { value } = await Preferences.get({ key: SNAPSHOT_LATEST_KEY });
    if (!value) return null;
    const parsed = JSON.parse(value) as BackupData;
    return {
      timestamp: parsed.exportedAt ?? new Date().toISOString(),
      sizeBytes: value.length,
    };
  } catch (error) {
    console.warn('BackupService: failed to read latest snapshot', error);
    return null;
  }
}

export const getLatestSnapshot = async (): Promise<SnapshotInfo | null> => {
  await ensureMigrated();
  return readLatestSnapshot();
};

export const hasAutoBackup = async (): Promise<boolean> => {
  return (await getLatestSnapshot()) !== null;
};

export const getLastAutoBackupTime = async (): Promise<string | null> => {
  const latest = await getLatestSnapshot();
  return latest ? latest.timestamp : null;
};

/**
 * Create a snapshot of all user data, always overwriting the previous one.
 * Safe to call from anywhere: concurrent calls are serialized (single-flight)
 * and a 60s minimum interval prevents burst writes (e.g. interval tick + app
 * pause firing together).
 */
export const takeSnapshot = async (): Promise<BackupResult<SnapshotInfo | null>> => {
  if (snapshotQueue) return snapshotQueue;
  // Never snapshot while a restore is writing keys (half-restored state
  // would overwrite the backup being restored).
  if (restoreInProgress) return { success: true, data: await readLatestSnapshot() };
  snapshotQueue = (async () => {
    try {
      const now = Date.now();
      if (now - lastSnapshotAt < SNAPSHOT_MIN_INTERVAL_MS) {
        return { success: true, data: await readLatestSnapshot() };
      }

      const built = await buildBackup({ pretty: false, includeEbooks: true, includePrefs: true, budget: snapshotBudget() });
      if (!built.success || !built.data) {
        return { success: false, error: built.error || 'Could not create an automatic backup.' };
      }

      const payload = JSON.parse(built.data.json) as BackupData;
      const result = await writeSnapshot(payload);
      if (result.success) {
        lastSnapshotAt = now;
      }
      return result;
    } catch (error) {
      console.error('BackupService: takeSnapshot failed', error);
      return { success: false, error: 'Could not create an automatic backup.' };
    }
  })();
  try {
    return await snapshotQueue;
  } finally {
    snapshotQueue = null;
  }
};

/** Backwards-compatible name used by the auto-backup hook. */
export const autoBackup = async (): Promise<string> => {
  const result = await takeSnapshot();
  if (!result.success) throw new Error(result.error || 'Auto-backup failed');
  return 'ok';
};

export const clearAutoBackup = async (): Promise<void> => {
  try {
    const { keys } = await Preferences.keys();
    for (const key of keys) {
      const bare = stripWebPrefix(key);
      if (bare === SNAPSHOT_LATEST_KEY || bare === SNAPSHOT_META_KEY || bare.startsWith(SNAPSHOT_LEGACY_PREFIX)) {
        try {
          await Preferences.remove({ key });
        } catch {
          // best effort
        }
      }
    }
    await Preferences.remove({ key: AUTO_BACKUP_KEY });
    await Preferences.remove({ key: AUTO_BACKUP_META_KEY });
  } catch (error) {
    console.error('BackupService: clearAutoBackup failed', error);
  }
};

// ─── Migration from legacy systems (runs automatically, idempotent) ───────────

let migrationPromise: Promise<void> | null = null;

function ensureMigrated(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = migrateLegacyBackups();
  }
  return migrationPromise;
}

async function migrateLegacyBackups(): Promise<void> {
  try {
    // System B v1.0 — stored in localStorage under backup_data / backup_metadata.
    try {
      const legacyData = localStorage.getItem(LEGACY_DATA_KEY);
      if (legacyData) {
        const parsed = JSON.parse(legacyData) as {
          metadata?: { created?: string };
          localStorage?: Record<string, string>;
          preferences?: Record<string, string>;
        };
        const payload: BackupData = {
          version: BACKUP_VERSION,
          appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : CURRENT_APP_VERSION,
          exportedAt: parsed.metadata?.created ?? new Date().toISOString(),
          storage: parsed.localStorage ?? {},
          preferences: parsed.preferences ?? {},
          downloadedBooks: [],
        };
        const { value } = await Preferences.get({ key: SNAPSHOT_LATEST_KEY });
        if (!value) {
          await writeSnapshot(payload);
        }
        localStorage.removeItem(LEGACY_DATA_KEY);
        localStorage.removeItem(LEGACY_META_KEY);
      }
    } catch (error) {
      console.warn('BackupService: legacy localStorage migration failed', error);
    }

    // System A v2.0 — a single auto-backup blob in Preferences.
    try {
      const { value: oldBlob } = await Preferences.get({ key: AUTO_BACKUP_KEY });
      if (oldBlob) {
        const parsed = JSON.parse(oldBlob) as BackupData;
        if (parsed && parsed.storage) {
          const { value } = await Preferences.get({ key: SNAPSHOT_LATEST_KEY });
          if (!value) {
            await writeSnapshot(parsed);
          }
        }
        await Preferences.remove({ key: AUTO_BACKUP_KEY });
        await Preferences.remove({ key: AUTO_BACKUP_META_KEY });
      }
    } catch (error) {
      console.warn('BackupService: legacy Preferences migration failed', error);
    }

    await Preferences.remove({ key: LEGACY_CHECKED_KEY });

    // Collapse legacy rolling snapshots (backup-snapshot-<ISO>) into the single
    // latest key — newest wins, then all rotation artifacts are swept.
    const { value: latestValue } = await Preferences.get({ key: SNAPSHOT_LATEST_KEY });
    if (!latestValue) {
      const { keys } = await Preferences.keys();
      const legacyKeys = keys.filter(k => stripWebPrefix(k).startsWith(SNAPSHOT_LEGACY_PREFIX)).sort();
      if (legacyKeys.length > 0) {
        const { value } = await Preferences.get({ key: legacyKeys[legacyKeys.length - 1] });
        if (value) {
          await Preferences.set({ key: SNAPSHOT_LATEST_KEY, value });
        }
      }
    }
    const { keys } = await Preferences.keys();
    for (const key of keys) {
      const bare = stripWebPrefix(key);
      if (bare.startsWith(SNAPSHOT_LEGACY_PREFIX) || bare === SNAPSHOT_META_KEY) {
        try {
          await Preferences.remove({ key });
        } catch {
          // best effort
        }
      }
    }

    // The old auto-backup toggle key is gone — remove it if an older version
    // of the app left it behind.
    try {
      localStorage.removeItem(AUTO_BACKUP_ENABLED_KEY);
    } catch {
      // best effort
    }
  } catch (error) {
    console.error('BackupService: migrateLegacyBackups failed', error);
  }
}

// ─── Restore ──────────────────────────────────────────────────────────────────

function applyTheme(themeValue: string | null | undefined): void {
  if (!themeValue) return;
  try {
    document.documentElement.classList.toggle('dark', themeValue === 'dark');
  } catch {
    // cosmetic only
  }
}

// True while a restore is writing keys. The visibilitychange snapshot must
// never capture a half-restored state — it would overwrite the very backup
// being restored with corrupt data.
let restoreInProgress = false;

async function applyBackupPayload(payload: BackupData): Promise<RestoreSummary> {
  restoreInProgress = true;
  try {
    return await applyBackupPayloadInner(payload);
  } finally {
    restoreInProgress = false;
  }
}

async function applyBackupPayloadInner(payload: BackupData): Promise<RestoreSummary> {
  const summary: RestoreSummary = {
    restoredKeys: 0,
    failedKeys: 0,
    failedSamples: [],
    verified: false,
    booksToDownload: payload.downloadedBooks ?? [],
  };

  const entries = Object.entries(payload.storage ?? {});
  for (const [key, value] of entries) {
    if (value === null || value === undefined) continue;
    if (isTransientKey(key)) continue; // one-shot flags reset fresh
    try {
      if (key.startsWith('pref::')) {
        await Preferences.set({ key: key.slice('pref::'.length), value });
      } else {
        localStorage.setItem(key, value);
      }
      summary.restoredKeys++;
    } catch (error) {
      console.warn(`BackupService: failed to restore "${key}"`, error);
      summary.failedKeys++;
      if (summary.failedSamples.length < 5) summary.failedSamples.push(key);
    }
  }

  const prefEntries = Object.entries(payload.preferences ?? {});
  for (const [key, value] of prefEntries) {
    if (value === null || value === undefined) continue;
    if (isTransientKey(key)) continue; // one-shot flags reset fresh
    try {
      await Preferences.set({ key, value });
      summary.restoredKeys++;
    } catch (error) {
      console.warn(`BackupService: failed to restore preference "${key}"`, error);
      summary.failedKeys++;
      if (summary.failedSamples.length < 5) summary.failedSamples.push(`pref::${key}`);
    }
  }

  // Integrity spot-check: the most important keys must exist after restore.
  const critical = ['theme', 'salah-tracker', 'quran-bookmarks', 'qaza-prayers', 'user-onboarded'];
  const present = critical.filter(key => localStorage.getItem(key) !== null).length;
  summary.verified = present >= Math.min(3, critical.length);

  applyTheme(payload.storage?.['theme'] ?? payload.storage?.['pref::theme'] ?? payload.preferences?.['theme']);
  return summary;
}

async function warnIfOlder(exportedAt: string | undefined, summary: RestoreSummary): Promise<BackupResult<RestoreSummary>> {
  if (exportedAt) {
    const latest = await getLatestSnapshot();
    if (latest) {
      const importedTime = new Date(exportedAt).getTime();
      const latestTime = new Date(latest.timestamp).getTime();
      if (!Number.isNaN(importedTime) && importedTime < latestTime - 60_000) {
        summary.warning =
          'This backup is older than your latest automatic backup, so restoring it may lose newer data.';
      }
    }
  }
  return { success: true, data: summary };
}

/** Restore from an imported backup file, with validation + version migration. */
export const importBackup = async (file: File): Promise<BackupResult<RestoreSummary>> => {
  try {
    const text = await file.text();
    return await importBackupJson(text);
  } catch (error) {
    console.error('BackupService: could not read backup file', error);
    return { success: false, error: 'Could not read this file. Please choose the backup file you saved.' };
  }
};

export const importBackupJson = async (text: string): Promise<BackupResult<RestoreSummary>> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { success: false, error: 'This file is not a Noor Connect backup file.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { success: false, error: 'This file is not a Noor Connect backup file.' };
  }

  const candidate = parsed as Partial<BackupData> & {
    data?: Record<string, unknown>;
    metadata?: { created?: string };
  };

  // Legacy v1.0 (System B) — camelCase keys stored under `data`.
  if (candidate.version === '1.0' && candidate.data && typeof candidate.data === 'object') {
    const storage: Record<string, string | null> = {};
    Object.entries(candidate.data).forEach(([key, value]) => {
      if (value !== null && value !== undefined && key !== 'downloadedBooks') {
        const storageKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        storage[storageKey] = String(value);
      }
    });
    const payload: BackupData = {
      version: BACKUP_VERSION,
      exportedAt: candidate.metadata?.created ?? new Date().toISOString(),
      storage,
      preferences: {},
      downloadedBooks: (candidate.data['downloadedBooks'] as DownloadedBook[]) ?? [],
    };
    const summary = await applyBackupPayload(payload);
    return warnIfOlder(payload.exportedAt, summary);
  }

  // v2.x — direct storage mapping.
  if (typeof candidate.version === 'string' && candidate.version.startsWith('2.') && candidate.storage) {
    const minor = Number(candidate.version.split('.')[1] ?? 0);
    if (minor > Number(BACKUP_VERSION.split('.')[1] ?? 0)) {
      return {
        success: false,
        error: 'This backup was made by a newer version of the app. Please update Noor Connect first.',
      };
    }
    const payload: BackupData = {
      version: candidate.version,
      exportedAt: candidate.exportedAt ?? new Date().toISOString(),
      storage: candidate.storage,
      preferences: candidate.preferences ?? {},
      downloadedBooks: candidate.downloadedBooks ?? [],
    };
    const summary = await applyBackupPayload(payload);
    return warnIfOlder(payload.exportedAt, summary);
  }

  return { success: false, error: 'This file is not a Noor Connect backup file.' };
};

/** Restore the latest snapshot (used by the first-launch dialog). */
export const restoreFromAutoBackup = async (): Promise<BackupResult<RestoreSummary>> => {
  try {
    const latest = await getLatestSnapshot();
    if (!latest) {
      return { success: false, error: 'No automatic backup was found.' };
    }
    const { value } = await Preferences.get({ key: SNAPSHOT_LATEST_KEY });
    if (!value) {
      return { success: false, error: 'That backup could not be found.' };
    }
    const parsed = JSON.parse(value) as BackupData;
    if (!parsed || typeof parsed.storage !== 'object') {
      return { success: false, error: 'That backup is damaged and could not be restored.' };
    }
    const summary = await applyBackupPayload(parsed);
    return { success: true, data: summary };
  } catch (error) {
    console.error('BackupService: restoreFromAutoBackup failed', error);
    return { success: false, error: 'That backup could not be restored.' };
  }
};

// ─── Manual export (platform-aware) ───────────────────────────────────────────

export type ExportPlatform = 'native' | 'web';

/**
 * Create a backup file and hand it to the user:
 *  - Android/iOS: write to the app cache and open the system share sheet
 *    (user can save to Downloads, Drive, Files, etc.)
 *  - Web: regular blob download.
 */
export const downloadBackup = async (): Promise<BackupResult<{ platform: ExportPlatform }>> => {
  try {
    const built = await buildBackup({ pretty: true, includeEbooks: true, includePrefs: true });
    if (!built.success || !built.data) {
      return { success: false, error: built.error || 'Could not create a backup.' };
    }
    const json = built.data.json;
    const filename = `noor-connect-backup-${new Date().toISOString().split('T')[0]}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        const written = await Filesystem.writeFile({
          path: filename,
          data: json,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: 'Noor Connect Backup',
          text: 'Save this file somewhere safe — it contains your Noor Connect data.',
          url: written.uri,
          dialogTitle: 'Save your backup',
        });
        return { success: true, data: { platform: 'native' } };
      } catch (error) {
        console.error('BackupService: native export failed', error);
        return { success: false, error: 'Could not open the save menu on this device.' };
      }
    }

    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return { success: true, data: { platform: 'web' } };
    } catch (error) {
      console.error('BackupService: web export failed', error);
      return { success: false, error: 'Could not download the backup file.' };
    }
  } catch (error) {
    console.error('BackupService: downloadBackup failed', error);
    return { success: false, error: 'Could not create a backup right now.' };
  }
};

// ─── First-launch restore detection ───────────────────────────────────────────

/**
 * Called once on app start. Returns a restore opportunity when the device looks
 * like a fresh install (no user data in localStorage) but a snapshot exists
 * (brought back by Android Auto Backup after a reinstall).
 */
export const checkForRestoreOpportunity = async (): Promise<RestoreOpportunity | null> => {
  try {
    await ensureMigrated();
    if (localStorage.getItem(CHECK_DONE_KEY) === 'true') return null;

    const latest = await getLatestSnapshot();
    if (!latest) return null;

    // If localStorage already contains user data, this is not a fresh install.
    let userKeyCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !isInternalKey(key)) userKeyCount++;
    }
    if (userKeyCount > 0) {
      localStorage.setItem(CHECK_DONE_KEY, 'true');
      return null;
    }

    localStorage.setItem(CHECK_DONE_KEY, 'true');
    return { snapshot: latest };
  } catch (error) {
    console.error('BackupService: checkForRestoreOpportunity failed', error);
    return null;
  }
};

// ─── Lifecycle / init ─────────────────────────────────────────────────────────

let initialized = false;

let visibilityChangeHandler: (() => void) | null = null;

/**
 * Call once at app startup. Runs legacy migration and arms the app-pause
 * snapshot: whenever the app goes to the background, a snapshot is taken
 * (debounced by the 60s minimum interval). Auto-backup is always on.
 */
export const initBackupService = (): void => {
  if (initialized) return;
  initialized = true;

  void ensureMigrated();

  if (visibilityChangeHandler) {
    document.removeEventListener('visibilitychange', visibilityChangeHandler);
  }

  visibilityChangeHandler = () => {
    if (document.visibilityState === 'hidden') {
      void takeSnapshot();
    }
  };

  document.addEventListener('visibilitychange', visibilityChangeHandler);
};

// ─── Misc helpers (moved from backup.ts, kept as-is) ──────────────────────────

export const clearCache = async (): Promise<void> => {
  await clearAllBooks();
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
};

export const getQuranFontSize = (): number => {
  return parseInt(localStorage.getItem('quran-font-size') || '24', 10);
};

export const setQuranFontSize = (size: number): void => {
  localStorage.setItem('quran-font-size', size.toString());
};

export { KNOWN_STORAGE_KEYS };
