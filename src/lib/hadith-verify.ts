/**
 * hadith-verify.ts — runtime matcher for the Hadith Verifier.
 *
 * Loads the prebuilt MinHash index (public/data/hadith-index.bin, built by
 * scripts/build-hadith-index.mjs over all 52k hadiths) lazily — only when the
 * Verify screen is opened — and matches pasted text entirely on-device.
 * Normalization/hashing MUST stay identical to scripts/hadith-verify-core.mjs
 * (the shipped index was built with it), so the runtime imports that exact
 * module through Vite.
 *
 * Cost profile: 4.8 MB index download (once) + ~5 MB RAM + ~15-30 ms per
 * full-corpus scan. No network calls at match time.
 */

import { SIGNATURE_LENGTH, normalizeArabic, shingles, minhashSignature, signatureSimilarity } from "../../scripts/hadith-verify-core.mjs";
import { loadGzippedJson } from "./gzip-loader";

export interface HadithVerifyMatch {
  collection: string;
  bookNumber: string;
  hadithNumber: string;
  grade?: string;
  similarity: number; // 0..1
}

export interface HadithVerifyResult {
  matches: HadithVerifyMatch[];
  /** True when the index was loaded fresh for this verification. */
  indexLoadMs: number;
  matchMs: number;
}

interface ManifestEntry {
  c: string;
  b: string;
  n: string;
  /** Shingle count of the indexed hadith — needed for the containment score. */
  s?: number;
  g?: string;
}

/** Normalize + signature in one call. Null for empty/no-Arabic text. */
const signatureForText = (text: string): Uint32Array | null => {
  const set = shingles(normalizeArabic(text));
  return set.size ? minhashSignature(set) : null;
};

let indexState: {
  bin: Uint32Array;
  manifest: ManifestEntry[];
  collectionNames: string[];
} | null = null;
let indexPromise: Promise<void> | null = null;

export function isVerifierIndexLoaded(): boolean {
  return indexState !== null;
}

/** Load + parse the index once. Subsequent calls resolve immediately.
 *  onProgress reports 0..100 while the 4.8 MB signature file streams in. */
export function loadVerifierIndex(onProgress?: (pct: number) => void): Promise<void> {
  if (indexState) return Promise.resolve();
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    const [binBuf, manifest] = await Promise.all([
      (async () => {
        const resp = await fetch("/data/hadith-index.bin");
        if (!resp.ok) throw new Error(`index fetch failed: ${resp.status}`);
        const total = Number(resp.headers.get("content-length")) || 0;
        if (!resp.body || !total) return new Uint32Array((await resp.arrayBuffer()).buffer).buffer;
        const reader = resp.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          onProgress?.(Math.min(99, Math.round((received / total) * 100)));
        }
        onProgress?.(100);
        const buf = new Uint8Array(received);
        let off = 0;
        for (const c of chunks) { buf.set(c, off); off += c.length; }
        return buf.buffer;
      })(),
      loadGzippedJson<ManifestEntry[]>("/data/hadith-index-manifest.json.gz"),
    ]);
    const bin = new Uint32Array(binBuf);
    const expected = manifest.length * SIGNATURE_LENGTH;
    if (bin.length !== expected) {
      throw new Error(`index size mismatch: got ${bin.length}, expected ${expected}`);
    }
    indexState = { bin, manifest, collectionNames: [] };
  })();

  return indexPromise;
}

/**
 * Match pasted text against the whole corpus. Returns up to 5 matches with
 * estimated similarity ≥ 0.15, strongest first. Empty array = no close match.
 */
export async function verifyHadithText(text: string): Promise<HadithVerifyResult> {
  const t0 = performance.now();
  await loadVerifierIndex();
  const indexLoadMs = Math.round(performance.now() - t0);

  const t1 = performance.now();
  const sig = signatureForText(text);
  if (!sig || !indexState) {
    return { matches: [], indexLoadMs, matchMs: Math.round(performance.now() - t1) };
  }

  const { bin, manifest } = indexState;
  const n = manifest.length;
  const top: HadithVerifyMatch[] = [];
  const MIN_SIMILARITY = 0.15;
  const MAX_RESULTS = 5;

  // Query shingle count — needed to derive containment from the Jaccard
  // estimate. MinHash Jaccard under-scores SHORT queries: a perfect 8-word
  // phrase inside a 70-word hadith has J ≈ 0.1 (asymmetric denominator) but
  // containment ≈ 1.0. containment = |A∩B| / min(|A|,|B|), where
  // |A∩B| ≈ J·(|A|+|B|)/(1+J).
  const querySize = shingles(normalizeArabic(text)).size;

  for (let i = 0; i < n; i++) {
    const jaccard = signatureSimilarity(bin, i * SIGNATURE_LENGTH, sig, 0);
    if (jaccard < 0.04) continue;
    const targetSize = manifest[i].s || 1;
    const intersection = (jaccard * (querySize + targetSize)) / (1 + jaccard);
    // Containment alone over-credits generic short phrases: random text can
    // share 1-2 common-word bigrams with a hadith. Require a meaningful
    // absolute overlap too — 4+ shared bigrams is a real textual echo.
    if (intersection < 4) continue;
    const containment = intersection / Math.min(querySize, targetSize);
    const score = Math.min(1, containment);
    if (score < MIN_SIMILARITY) continue;
    const m: HadithVerifyMatch = {
      collection: manifest[i].c,
      bookNumber: manifest[i].b,
      hadithNumber: manifest[i].n,
      grade: manifest[i].g,
      similarity: score,
    };
    // Insertion into the (tiny, ≤5) top list — avoids sorting 52k hits.
    if (top.length < MAX_RESULTS) {
      top.push(m);
      top.sort((a, b) => b.similarity - a.similarity);
    } else if (score > top[MAX_RESULTS - 1].similarity) {
      top[MAX_RESULTS - 1] = m;
      top.sort((a, b) => b.similarity - a.similarity);
    }
  }

  return { matches: top, indexLoadMs, matchMs: Math.round(performance.now() - t1) };
}
/**
 * Lazily fetch the full hadith record for a match (for result-card
 * excerpts). Uses the standard book loader (cached after first call).
 */
export async function getHadithExcerpt(collection: string, bookNumber: string, hadithNumber: string): Promise<{ arabic: string; englishTranslation: string; narrator: string; grade: string } | null> {
  try {
    const { getHadithBookData } = await import('./hadith');
    const data = await getHadithBookData(collection, bookNumber);
    if (!data) return null;
    const h = data.find(x => String(x.hadithNumber) === String(hadithNumber));
    if (!h) return null;
    return {
      arabic: h.arabic || '',
      englishTranslation: h.englishTranslation || '',
      narrator: h.narrator || '',
      grade: h.grade || '',
    };
  } catch {
    return null;
  }
}
