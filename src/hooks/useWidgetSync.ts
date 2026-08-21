/**
 * useWidgetSync — React hook that pushes Quran-progress and tasbeeh state
 * to native Android widgets.
 *
 * Prayer data is already pushed by `WidgetService.startAutoUpdate` from
 * App.tsx (preserved from the legacy wiring). This hook handles the other
 * two payloads that need to fire on specific UI events:
 *
 *  - QuranProgressPayload: pushed when the user finishes a reading session
 *    (we listen for changes to `localStorage['quran-reading-progress']`)
 *  - Tasbeeh increments: pushed when the user taps count in-app (we listen
 *    for changes to `localStorage['tasbeeh-total']`)
 *
 * The hook is a no-op on web (WidgetBridge internally no-ops).
 *
 * This file replaces the deleted `useWidgetSync.ts` which only handled
 * the legacy `notifyWidgetDataChanged` API.
 */

import { useEffect, useRef } from 'react';
import { syncQuranProgress, pushTasbeehIncrement } from '@/lib/widgetBridge';
import type { QuranProgressPayload } from '@/lib/widget-types';

const QURAN_PROGRESS_KEY = 'quran-reading-progress';
const TASBEEH_TOTAL_KEY = 'tasbeeh-total';
const STORAGE_EVENT = 'storage';
// Dispatched by setTasbeehTotal() in lib/storage.ts whenever the total changes
const TASBEEH_UPDATED_EVENT = 'tasbeeh-updated';

function parseQuranProgress(raw: string | null): QuranProgressPayload | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    
    // lastReadTimestamp: prefer explicit timestamp field, fall back to numeric lastRead
    let lastReadTimestamp: number;
    if (typeof p.lastReadTimestamp === 'number') {
      lastReadTimestamp = p.lastReadTimestamp;
    } else if (typeof p.lastRead === 'number') {
      lastReadTimestamp = p.lastRead;
    } else {
      lastReadTimestamp = Date.now();
    }

    // lastReadLabel: prefer explicit label field, fall back to string lastRead
    let lastReadLabel: string;
    if (typeof p.lastReadLabel === 'string') {
      lastReadLabel = p.lastReadLabel;
    } else if (typeof p.lastRead === 'string') {
      lastReadLabel = p.lastRead;
    } else {
      lastReadLabel = '';
    }

    return {
      currentSurah: Number(p.currentSurah ?? p.surahNumber ?? 1),
      currentAyah: Number(p.currentAyah ?? p.ayahNumber ?? 1),
      currentJuz: Number(p.currentJuz ?? p.juzNumber ?? 1),
      totalPagesRead: Number(p.totalPagesRead ?? p.pagesRead ?? 0),
      totalPercent: Number(p.totalPercent ?? p.percent ?? 0),
      dailyStreak: Number(p.dailyStreak ?? p.streak ?? 0),
      lastReadTimestamp,
      lastReadLabel,
      goalPercent: Number(p.goalPercent ?? p.goal ?? 0),
      lastUpdated: Date.now(),
    };
  } catch {
    return null;
  }
}

export function useWidgetSync() {
  // Keep the previous tasbeeh total so we can compute deltas
  const prevTasbeehRef = useRef<number | null>(null);

  useEffect(() => {
    // Initial read
    try {
      const initial = Number(localStorage.getItem(TASBEEH_TOTAL_KEY) ?? '0');
      prevTasbeehRef.current = isNaN(initial) ? 0 : initial;
    } catch {
      prevTasbeehRef.current = 0;
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === QURAN_PROGRESS_KEY) {
        const payload = parseQuranProgress(e.newValue);
        if (payload) syncQuranProgress(payload).catch(() => {});
      } else if (e.key === TASBEEH_TOTAL_KEY) {
        const next = Number(e.newValue ?? '0');
        if (!isNaN(next) && prevTasbeehRef.current !== null) {
          const delta = next - prevTasbeehRef.current;
          if (delta > 0) {
            pushTasbeehIncrement(delta).catch(() => {});
          }
        }
        prevTasbeehRef.current = isNaN(next) ? prevTasbeehRef.current : next;
      }
    };

    // Same-tab change events (storage event only fires cross-tab)
    const onQuranProgressCustom = () => {
      try {
        const payload = parseQuranProgress(localStorage.getItem(QURAN_PROGRESS_KEY));
        if (payload) syncQuranProgress(payload).catch(() => {});
      } catch {
        // Error is non-critical, silently ignored
      }
    };

    const onTasbeehCustom = () => {
      try {
        const next = Number(localStorage.getItem(TASBEEH_TOTAL_KEY) ?? '0');
        if (prevTasbeehRef.current !== null && !isNaN(next)) {
          const delta = next - prevTasbeehRef.current;
          if (delta > 0) pushTasbeehIncrement(delta).catch(() => {});
          prevTasbeehRef.current = next;
        }
      } catch {
        // Error is non-critical, silently ignored
      }
    };

    window.addEventListener(STORAGE_EVENT, onStorage);
    window.addEventListener('noorconnect:quran-progress-changed', onQuranProgressCustom);
    window.addEventListener(TASBEEH_UPDATED_EVENT, onTasbeehCustom);

    return () => {
      window.removeEventListener(STORAGE_EVENT, onStorage);
      window.removeEventListener('noorconnect:quran-progress-changed', onQuranProgressCustom);
      window.removeEventListener(TASBEEH_UPDATED_EVENT, onTasbeehCustom);
    };
  }, []);
}
