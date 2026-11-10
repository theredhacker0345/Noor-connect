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

/** Load + parse the index once. Subsequent calls resolve immediately. */
export function loadVerifierIndex(): Promise<void> {
  if (indexState) return Promise.resolve();
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    const [binBuf, manifest] = await Promise.all([
      fetch("/data/hadith-index.bin").then(r => {
        if (!r.ok) throw new Error(`index fetch failed: ${r.status}`);
        return r.arrayBuffer();
      }),
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

  for (let i = 0; i < n; i++) {
    const s = signatureSimilarity(bin, i * SIGNATURE_LENGTH, sig, 0);
    if (s < MIN_SIMILARITY) continue;
    const m: HadithVerifyMatch = {
      collection: manifest[i].c,
      bookNumber: manifest[i].b,
      hadithNumber: manifest[i].n,
      grade: manifest[i].g,
      similarity: s,
    };
    // Insertion into the (tiny, ≤5) top list — avoids sorting 52k hits.
    if (top.length < MAX_RESULTS) {
      top.push(m);
      top.sort((a, b) => b.similarity - a.similarity);
    } else if (s > top[MAX_RESULTS - 1].similarity) {
      top[MAX_RESULTS - 1] = m;
      top.sort((a, b) => b.similarity - a.similarity);
    }
  }

  return { matches: top, indexLoadMs, matchMs: Math.round(performance.now() - t1) };
}
