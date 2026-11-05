/**
 * sw-settings.ts — settings bridge from the app to the service worker.
 *
 * The service worker has no localStorage, but it can read IndexedDB. The app
 * writes the handful of settings the SW's Islamic-event engine needs into a
 * tiny IDB store; sw.js reads them fresh on every check so a killed SW picks
 * up the current values when it next wakes.
 *
 * Currently synced:
 *  - hijriOffset: the user's moon-sighting adjustment (−2..+2)
 *  - islamicEventsViaNative: true on Android, where event notifications are
 *    scheduled through Capacitor LocalNotifications instead (the SW path
 *    would duplicate them)
 */

const DB_NAME = 'noor-connect-sw-settings';
const STORE = 'settings';

export type SwSettingKey = 'hijriOffset' | 'islamicEventsViaNative';

export async function writeSwSetting(key: SwSettingKey, value: unknown): Promise<void> {
  try {
    if (typeof indexedDB === 'undefined') return;
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Settings sync is best-effort — the SW falls back to defaults.
  }
}

export async function readSwSetting<T>(key: SwSettingKey): Promise<T | undefined> {
  try {
    if (typeof indexedDB === 'undefined') return undefined;
    const db = await openDb();
    const value = await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
  } catch {
    return undefined;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
