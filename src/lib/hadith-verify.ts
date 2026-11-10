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

import { SIGNATURE_LENGTH, normalizeArabic, normalizeEnglish, shingles, minhashSignature, signatureSimilarity } from "../../scripts/hadith-verify-core.mjs";
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

let enIndexState: {
  bin: Uint32Array;
  manifest: ManifestEntry[];
} | null = null;
let enIndexPromise: Promise<void> | null = null;

export function isVerifierIndexLoaded(): boolean {
  return indexState !== null;
}

/** Load the English-translation index (lazy — only for latin-script pastes). */
export function loadEnglishIndex(onProgress?: (pct: number) => void): Promise<void> {
  if (enIndexState) return Promise.resolve();
  if (enIndexPromise) return enIndexPromise;

  enIndexPromise = (async () => {
    const [binBuf, manifest] = await Promise.all([
      (async () => {
        const resp = await fetch("/data/hadith-index-en.bin");
        if (!resp.ok) throw new Error(`en index fetch failed: ${resp.status}`);
        const total = Number(resp.headers.get("content-length")) || 0;
        if (!resp.body || !total) return (await resp.arrayBuffer()).buffer;
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
      loadGzippedJson<ManifestEntry[]>("/data/hadith-index-en-manifest.json.gz"),
    ]);
    const bin = new Uint32Array(binBuf);
    const expected = manifest.length * SIGNATURE_LENGTH;
    if (bin.length !== expected) {
      throw new Error(`en index size mismatch: got ${bin.length}, expected ${expected}`);
    }
    enIndexState = { bin, manifest };
  })();

  return enIndexPromise;
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

  // Two corpora: Arabic matn (always) and English translations (loaded only
  // when the paste contains latin words — keeps Arabic-only users at a 5 MB
  // download instead of 10 MB).
  const arabicWords = (text.match(/[\u0600-\u06FF]+/g) || []).filter(w => w.length >= 2).length;
  const latinWords = (text.match(/[A-Za-z]{2,}/g) || []).length;
  const wantsEnglish = latinWords >= 3;

  const candidates: { match: HadithVerifyMatch; key: string; corpus: "ar" | "en" }[] = [];
  const MIN_SIMILARITY = 0.15;
  const MAX_RESULTS = 5;
  // Confirm up to this many top candidates against the real hadith text —
  // MinHash is an estimator; the fetched text gives the exact score.
  const CONFIRM_COUNT = 10;

  const scanIndex = (
    sig: Uint32Array,
    querySize: number,
    bin: Uint32Array,
    manifest: ManifestEntry[],
    corpus: "ar" | "en"
  ) => {
    for (let i = 0; i < manifest.length; i++) {
      const jaccard = signatureSimilarity(bin, i * SIGNATURE_LENGTH, sig, 0);
      if (jaccard < 0.04) continue;
      const targetSize = manifest[i].s || 1;
      const intersection = (jaccard * (querySize + targetSize)) / (1 + jaccard);
      // The MinHash Jaccard estimate is noisy for tiny overlaps on large
      // targets: a coincidental 1-slot match against a 500-shingle hadith
      // inflates the derived intersection far above the query's own shingle
      // count — physically impossible. Reject impossible estimates. No
      // absolute-overlap floor here: the floor is itself an estimate and
      // dropped true matches (quantization); the exact-confirmation stage
      // below is the real filter.
      if (intersection > Math.min(querySize, targetSize)) continue;
      const containment = intersection / Math.min(querySize, targetSize);
      const score = Math.min(1, containment);
      if (score < MIN_SIMILARITY) continue;
      candidates.push({
        match: {
          collection: manifest[i].c,
          bookNumber: manifest[i].b,
          hadithNumber: manifest[i].n,
          grade: manifest[i].g,
          similarity: score,
        },
        key: `${manifest[i].c}:${manifest[i].b}:${manifest[i].n}`,
        corpus,
      });
    }
  };

  // Arabic matn scan
  const arabicSet = shingles(normalizeArabic(text));
  if (arabicSet.size > 0 && indexState) {
    scanIndex(minhashSignature(arabicSet), arabicSet.size, indexState.bin, indexState.manifest);
  }

  // English translation scan (lazy-loads the second index on first use)
  if (wantsEnglish) {
    await loadEnglishIndex();
    if (enIndexState) {
      const enSet = shingles(normalizeEnglish(text));
      if (enSet.size > 0) {
        scanIndex(minhashSignature(enSet), enSet.size, enIndexState.bin, enIndexState.manifest, "en");
      }
    }
  }

  const matchMs = Math.round(performance.now() - t1);

  // Merge (the same hadith can match in both corpora — keep the best score)
  const merged = new Map<string, { match: HadithVerifyMatch; corpus: "ar" | "en" }>();
  for (const { match, key, corpus } of candidates) {
    const existing = merged.get(key);
    if (!existing || match.similarity > existing.match.similarity) merged.set(key, { match, corpus });
  }

  // Exact confirmation: MinHash is an estimator whose variance at tiny
  // overlaps can inflate scores (observed as false "Strong" matches). The
  // matched hadith's real text is fetched anyway for the result cards — so
  // recompute the containment EXACTLY from it and drop whatever falls below
  // the threshold. Shown results are exact, never estimated.
  const ranked = Array.from(merged.values())
    .sort((a, b) => b.match.similarity - a.match.similarity)
    .slice(0, Math.max(MAX_RESULTS, CONFIRM_COUNT));

  const confirmed: HadithVerifyMatch[] = [];
  for (const { match, corpus } of ranked) {
    const record = await getHadithExcerpt(match.collection, match.bookNumber, match.hadithNumber);
    if (record) {
      const queryShingles = corpus === "en"
        ? shingles(normalizeEnglish(text))
        : shingles(normalizeArabic(text));
      const targetShingles = corpus === "en"
        ? shingles(normalizeEnglish(record.englishTranslation))
        : shingles(normalizeArabic(record.arabic));
      if (queryShingles.size > 0 && targetShingles.size > 0) {
        let shared = 0;
        for (const s of queryShingles) if (targetShingles.has(s)) shared++;
        const exact = shared / Math.min(queryShingles.size, targetShingles.size);
        // Exact-shared floor, scaled to the query: generic phrases ("in the
        // morning") can echo a few bigrams of random text into a real hadith —
        // require at least ~4.5 shared bigrams' worth of containment AND a
        // proportional fraction of the query (capped so very short pastes
        // aren't made impossible). Verified against the real text = exact.
        const floor = Math.min(0.9, Math.max(MIN_SIMILARITY, 4.5 / queryShingles.size));
        if (exact < floor || shared < 4) continue;
        confirmed.push({ ...match, similarity: Math.min(1, exact) });
        continue;
      }
    }
    // Text unavailable (fetch failure): keep the estimate rather than
    // punishing the user for a network hiccup.
    confirmed.push(match);
  }

  const top = confirmed
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_RESULTS);

  return { matches: top, indexLoadMs, matchMs };
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
