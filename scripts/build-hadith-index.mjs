/**
 * build-hadith-index.mjs — builds the shipped matching index for the Hadith
 * Verifier. Run: `node scripts/build-hadith-index.mjs`
 *
 * Reads every collection folder under public/data/hadith-collections, computes a
 * MinHash signature per hadith (scripts/hadith-verify-core.mjs), and writes:
 *   public/data/hadith-index.bin              — signatures, uint32 matrix
 *   public/data/hadith-index-manifest.json.gz — per-index metadata (c/b/n/grade)
 *
 * The runtime loads both lazily, only when the Verify screen is opened.
 */

import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";
import { SIGNATURE_LENGTH, normalizeArabic, normalizeEnglish, shingles, minhashSignature } from "./hadith-verify-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const collectionsDir = path.join(root, "public", "data", "hadith-collections");
const outBin = path.join(root, "public", "data", "hadith-index.bin");
const outManifest = path.join(root, "public", "data", "hadith-index-manifest.json.gz");

const collections = fs.readdirSync(collectionsDir).filter((d) =>
  fs.statSync(path.join(collectionsDir, d)).isDirectory()
);
collections.sort();

const signatures = [];
const manifest = [];
const enSignatures = [];
const enManifest = [];
let skipped = 0;
let enCount = 0;

for (const col of collections) {
  const hadithsPath = path.join(collectionsDir, col, "hadiths.json");
  const gzPath = hadithsPath + ".gz";
  let raw;
  if (fs.existsSync(gzPath)) raw = zlib.gunzipSync(fs.readFileSync(gzPath)).toString();
  else if (fs.existsSync(hadithsPath)) raw = fs.readFileSync(hadithsPath, "utf8");
  else continue;

  const parsed = JSON.parse(raw);
  const hadiths = Array.isArray(parsed) ? parsed : parsed.hadiths || [];
  let counted = 0;

  for (const h of hadiths) {
    const base = {
      c: col,
      b: String(h.bookNumber ?? ""),
      n: String(h.hadithNumber ?? ""),
      ...(h.grade ? { g: h.grade } : {}),
    };

    // Arabic index (primary — the authentic matn)
    const set = shingles(normalizeArabic(h.arabic || ""));
    if (set.size === 0) {
      skipped++;
      continue;
    }
    signatures.push(minhashSignature(set));
    manifest.push({ ...base, s: set.size });
    counted++;

    // English index — ~90% of hadiths ship an English translation; lets
    // users verify pastes in English too.
    const enSet = shingles(normalizeEnglish(h.englishTranslation || ""));
    if (enSet.size >= 3) {
      enSignatures.push(minhashSignature(enSet));
      enManifest.push({ ...base, s: enSet.size });
      enCount++;
    }
  }
  console.log(`${col}: ${counted} hadiths indexed (${enManifest.length} english so far)`);
}

const writeIndex = (sigs, man, binPath, manPath) => {
  const flat = new Uint32Array(sigs.length * SIGNATURE_LENGTH);
  sigs.forEach((sig, i) => flat.set(sig, i * SIGNATURE_LENGTH));
  fs.writeFileSync(binPath, Buffer.from(flat.buffer));
  fs.writeFileSync(manPath, zlib.gzipSync(Buffer.from(JSON.stringify(man)), { level: 9 }));
  return { n: sigs.length, binMB: (fs.statSync(binPath).size / 1048576).toFixed(2), manKB: (fs.statSync(manPath).size / 1024).toFixed(0) };
};

const ar = writeIndex(signatures, manifest, outBin, outManifest);
const enBin = path.join(root, "public", "data", "hadith-index-en.bin");
const enMan = path.join(root, "public", "data", "hadith-index-en-manifest.json.gz");
const en = writeIndex(enSignatures, enManifest, enBin, enMan);

console.log(`\nArabic index: ${ar.n} hadiths (${ar.binMB} MB bin + ${ar.manKB} KB manifest), ${skipped} skipped — no Arabic text.`);
console.log(`English index: ${en.n} hadiths (${en.binMB} MB bin + ${en.manKB} KB manifest).`);
