// tafsir-download.ts — whole-Quran tafsir download manager (per edition).
//
// Downloads all 114 surahs of one tafsir edition via the existing
// fetchSurahTafsir() helper, stores them in localforage under a dedicated
// namespace, and reports REAL byte sizes (no estimates). Downloads are
// resumable (already-stored surahs are skipped), cancellable, and survive
// app restarts. UI surfaces: Settings → Storage card (and future picker).

import localforage from "localforage";
import { fetchSurahTafsir, TAFSIR_EDITIONS, type TafsirEdition } from "./tafsir";

export const TOTAL_SURAHS = 114;

const STORE = localforage.createInstance({ name: "tafsir-downloads" });
const META_KEY = "tafsir-download-meta"; // Record<editionId, TafsirDownloadMeta>

export interface StoredSurahTafsir {
  surah: number;
  /** Serialized ayah texts, joined with \n\n, preserved order 1..n. */
  text: string;
  /** UTF-8 byte length of `text` (real, not estimated). */
  bytes: number;
  /** Per-ayah texts in order 1..n — preferred for faithful offline reading
   * (an ayah's own text may itself contain blank lines, which would break a
   * naive \n\n split of `text`). Older records may lack this field. */
  ayahs?: string[];
}

interface TafsirDownloadMeta {
  editionId: string;
  name: string;
  author: string;
  language: string;
  surahsStored: number;
  sizeBytes: number;
  updatedAt: number;
}

export interface TafsirDownloadSummary extends TafsirDownloadMeta {}

export interface TafsirDownloadProgress {
  editionId: string;
  done: number;
  total: number;
  bytesSoFar: number;
  finished: boolean;
  cancelled?: boolean;
}

type ProgressListener = (p: TafsirDownloadProgress) => void;
const listeners = new Set<ProgressListener>();
const active = new Map<string, AbortController>();

function emit(p: TafsirDownloadProgress) {
  for (const l of listeners) {
    try { l(p); } catch { /* listener errors must not break downloads */ }
  }
}

export function subscribeTafsirDownloadEvents(l: ProgressListener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

function utf8ByteLength(s: string): number {
  // Blob-free exact UTF-8 length (works in web workers and old JSC too).
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.codePointAt(i)!;
    if (c > 0xffff) i++; // surrogate pair — count once
    n += c <= 0x7f ? 1 : c <= 0x7ff ? 2 : c <= 0xffff ? 3 : 4;
  }
  return n;
}

function surahKey(editionId: string, surah: number) {
  return `${editionId}::s${surah}`;
}

function editionOf(editionId: string): TafsirEdition | undefined {
  return TAFSIR_EDITIONS.find(e => e.id === editionId);
}

async function readMeta(): Promise<Record<string, TafsirDownloadMeta>> {
  return (await STORE.getItem<Record<string, TafsirDownloadMeta>>(META_KEY)) || {};
}

async function writeMeta(meta: Record<string, TafsirDownloadMeta>) {
  await STORE.setItem(META_KEY, meta);
}

function countBytes(surahs: StoredSurahTafsir[]): number {
  return surahs.reduce((acc, s) => acc + s.bytes, 0);
}

/**
 * Download the whole tafsir for an edition. Resumable: surahs already stored
 * are skipped (and counted). onProgress fires after every surah with REAL
 * numbers. Returns the final meta, or null if cancelled.
 */
export async function downloadWholeTafsir(
  editionId: string,
  onProgress?: (p: TafsirDownloadProgress) => void,
  externalSignal?: AbortSignal,
): Promise<TafsirDownloadMeta | null> {
  const edition = editionOf(editionId);
  if (!edition) throw new Error(`Unknown tafsir edition: ${editionId}`);
  if (active.has(editionId)) return null; // already running — no double-tap

  const ac = new AbortController();
  active.set(editionId, ac);
  const abort = () => ac.abort();
  externalSignal?.addEventListener("abort", abort);

  const meta = await readMeta();
  const existing: Record<number, StoredSurahTafsir> = {};
  let prev = meta[editionId];
  try {
    // Recover stored surahs to compute resume state + honest byte total.
    const keys = await STORE.keys();
    const prefix = `${editionId}::s`;
    for (const k of keys) {
      if (!k.startsWith(prefix)) continue;
      const s = Number(k.slice(prefix.length));
      const v = await STORE.getItem<StoredSurahTafsir>(k);
      if (v && typeof v.text === "string") existing[s] = v;
    }
    if (!prev || prev.surahsStored !== Object.keys(existing).length) {
      prev = {
        editionId,
        name: edition.name,
        author: edition.author || edition.name,
        language: edition.language,
        surahsStored: Object.keys(existing).length,
        sizeBytes: countBytes(Object.values(existing)),
        updatedAt: Date.now(),
      };
    }

    let done = prev.surahsStored;
    let bytesSoFar = prev.sizeBytes;
    const report = (finished = false, cancelled = false) => {
      const p: TafsirDownloadProgress = { editionId, done, total: TOTAL_SURAHS, bytesSoFar, finished, cancelled };
      onProgress?.(p);
      if (finished || cancelled) emit(p);
    };
    report();

    for (let surah = 1; surah <= TOTAL_SURAHS; surah++) {
      if (ac.signal.aborted) { report(false, true); return null; }
      if (existing[surah]) continue; // resume: skip stored surahs
      try {
        const ayahs = await fetchSurahTafsir(surah, editionId);
        const text = (ayahs || [])
          .map(a => (typeof (a as { text?: unknown })?.text === "string" ? (a as { text: string }).text : ""))
          .filter(Boolean)
          .join("\n\n");
        if (!text) throw new Error("empty tafsir payload");
        // Keep the exact per-ayah array (including ayahs with empty text) so
        // offline reading preserves ayah numbering — `text` alone can't, since
        // an ayah's own commentary may itself contain blank lines.
        const ayahTexts = (ayahs || []).map(
          a => (typeof (a as { text?: unknown })?.text === "string" ? (a as { text: string }).text : "")
        );
        const record: StoredSurahTafsir = {
          surah,
          text,
          bytes: utf8ByteLength(text),
          ayahs: ayahTexts.length > 0 ? ayahTexts : undefined,
        };
        await STORE.setItem(surahKey(editionId, surah), record);
        existing[surah] = record;
        done += 1;
        bytesSoFar += record.bytes;
        meta[editionId] = {
          editionId, name: edition.name, author: edition.author || edition.name,
          language: edition.language, surahsStored: done, sizeBytes: bytesSoFar, updatedAt: Date.now(),
        };
        await writeMeta(meta);
        report();
      } catch (err) {
        // Single-surah failures don't kill the whole download; retry later.
        if (import.meta.env?.DEV) console.warn(`[tafsir-download] surah ${surah} failed`, err);
      }
    }

    const finalMeta = meta[editionId];
    if (finalMeta) {
      finalMeta.updatedAt = Date.now();
      await writeMeta(meta);
    }
    report(true);
    return finalMeta || null;
  } finally {
    externalSignal?.removeEventListener("abort", abort);
    active.delete(editionId);
  }
}

export function isTafsirDownloading(editionId: string): boolean {
  return active.has(editionId);
}

export function cancelTafsirDownload(editionId: string): void {
  active.get(editionId)?.abort();
}

export async function isTafsirDownloaded(editionId: string): Promise<boolean> {
  const meta = await readMeta();
  return Boolean(meta[editionId] && meta[editionId].surahsStored > 0);
}

export async function listTafsirDownloads(): Promise<TafsirDownloadSummary[]> {
  const meta = await readMeta();
  return Object.values(meta)
    .filter(m => m.surahsStored > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteTafsirDownload(editionId: string): Promise<void> {
  // Stop an in-flight download first; its finally-block won't resurrect meta
  // because every meta write goes through the same key we remove last.
  cancelTafsirDownload(editionId);
  const keys = await STORE.keys();
  const prefix = `${editionId}::s`;
  await Promise.all(keys.filter(k => k.startsWith(prefix)).map(k => STORE.removeItem(k)));
  const meta = await readMeta();
  delete meta[editionId];
  await writeMeta(meta);
}

/** Stored tafsir text for a surah (offline reads). Null if not downloaded. */
export async function getStoredTafsir(editionId: string, surah: number): Promise<string | null> {
  const v = await STORE.getItem<StoredSurahTafsir>(surahKey(editionId, surah));
  return v?.text || null;
}

/**
 * Stored per-ayah tafsir texts for a surah (offline reads), or null if the
 * edition is not downloaded. Prefers the faithful per-ayah array; older
 * records (text-only) fall back to splitting on blank lines.
 */
export async function getStoredTafsirAyahs(editionId: string, surah: number): Promise<string[] | null> {
  const v = await STORE.getItem<StoredSurahTafsir>(surahKey(editionId, surah));
  if (!v) return null;
  if (Array.isArray(v.ayahs) && v.ayahs.length > 0 && v.ayahs.every(a => typeof a === "string")) {
    return v.ayahs;
  }
  if (typeof v.text === "string" && v.text.trim()) {
    return v.text.split("\n\n");
  }
  return null;
}
