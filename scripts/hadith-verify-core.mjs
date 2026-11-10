/**
 * hadith-verify-core.mjs — shared matching math for the Hadith Verifier.
 *
 * Imported by BOTH the index build script (scripts/build-hadith-index.mjs,
 * plain node) and the runtime matcher (src/lib/hadith-verify.ts, bundled by
 * Vite). Single source of truth so the shipped index and the runtime can
 * never disagree on normalization or hashing.
 *
 * Algorithm: MinHash over word 3-gram shingles of normalized Arabic text.
 * - 24 hash signatures per hadith (uint32) → 52k hadiths ≈ 5 MB binary index
 * - Runtime match = 52k × 24 integer compares ≈ a few ms on a phone
 * - Estimated Jaccard similarity = matching signature slots / 24
 * A plain bloom filter was rejected: it answers only "have I seen this exact
 * text?" and cannot rank near-matches, which is the whole feature.
 */

export const SIGNATURE_LENGTH = 24;

/** Normalize Arabic hadith text for matching. */
export function normalizeArabic(text) {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // diacritics & Quranic marks
    .replace(/\u0640/g, "") // tatweel
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627") // أ إ آ ٱ → ا
    .replace(/\u0649/g, "\u064A") // ى → ي
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/[\u0624]/g, "\u0648") // ؤ → و
    .replace(/[\u0626]/g, "\u064A") // ئ → ي
    .replace(/[^\u0600-\u06FF\s]/g, " ") // drop non-Arabic (punct, latin, digits)
    .replace(/\s+/g, " ")
    .trim();
}

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Word bigram shingles (falls back to unigrams for single-word texts).
 *  Bigrams over 3-grams: shingles survive word omissions far better —
 *  pasted hadith texts are routinely incomplete. */
export function shingles(normalizedText) {
  const words = normalizedText.split(" ").filter(Boolean);
  const set = new Set();
  if (words.length < 2) {
    for (const w of words) set.add(w);
    return set;
  }
  for (let i = 0; i + 1 < words.length; i++) {
    set.add(words[i] + " " + words[i + 1]);
  }
  return set;
}

// 24 affine permutations (odd a, arbitrary b) over the 32-bit hash space.
const PERM_A = [
  0x9e3779b1, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0x9e3779cd,
  0x85ebca77, 0xc2b2ae3d, 0x27d4eb4f, 0x165667c5, 0x9e3779b9, 0x85ebca6f,
  0xc2b2ae29, 0x27d4eb39, 0x165667bd, 0x9e3779c5, 0x85ebca81, 0xc2b2ae41,
  0x27d4eb53, 0x165667c9, 0x9e3779d1, 0x85ebca8b, 0xc2b2ae49, 0x27d4eb5d,
];
const PERM_B = [
  0x68bc21eb, 0x02e6a2a9, 0xb5c1a6e3, 0x7f4a7c15, 0xd6e8feb8, 0x3d9d5a1f,
  0x91e4f7c3, 0x5a3b9d27, 0xe8631a4d, 0x2c9f7b61, 0x4f1d8ae5, 0xb37c60a9,
  0x71e9d3c7, 0x9a4f2b1d, 0x63d5e87f, 0x0cb41a93, 0xd92f6e57, 0x38a7c1db,
  0xe5b0946f, 0x14c83d21, 0x7b6fae95, 0xa0d2f439, 0x5ce71b83, 0xf6a90d4b,
];

/**
 * MinHash signature for a shingle set. Empty set → all-zero signature
 * (callers must skip empty texts before hashing).
 */
export function minhashSignature(shingleSet, out = new Uint32Array(SIGNATURE_LENGTH)) {
  out.fill(0xffffffff);
  for (const shingle of shingleSet) {
    const h = fnv1a(shingle);
    for (let i = 0; i < SIGNATURE_LENGTH; i++) {
      const v = Math.imul(PERM_A[i], h) + PERM_B[i];
      if (v >>> 0 < out[i]) out[i] = v >>> 0;
    }
  }
  return out;
}

/** Estimated Jaccard similarity between two signatures (0..1). */
export function signatureSimilarity(a, aOff, b, bOff, len = SIGNATURE_LENGTH) {
  let matches = 0;
  for (let i = 0; i < len; i++) {
    if (a[aOff + i] === b[bOff + i]) matches++;
  }
  return matches / len;
}

/** Convenience: normalize + signature in one call. Returns null for empty text. */
export function signatureForText(text) {
  const normalized = normalizeArabic(text);
  const set = shingles(normalized);
  if (set.size === 0) return null;
  return minhashSignature(set);
}
