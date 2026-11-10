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
import { SIGNATURE_LENGTH, normalizeArabic, shingles, minhashSignature } from "./hadith-verify-core.mjs";

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
let skipped = 0;

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
    const normalized = normalizeArabic(h.arabic || "");
    const set = shingles(normalized);
    if (set.size === 0) {
      skipped++;
      continue;
    }
    const sig = minhashSignature(set);
    signatures.push(sig);
    manifest.push({
      c: col,
      b: String(h.bookNumber ?? ""),
      n: String(h.hadithNumber ?? ""),
      s: set.size,
      ...(h.grade ? { g: h.grade } : {}),
    });
    counted++;
  }
  console.log(`${col}: ${counted} hadiths indexed`);
}

// Flatten into a single Uint32Array (row-major: hadith i → [i*LEN, i*LEN+LEN))
const flat = new Uint32Array(signatures.length * SIGNATURE_LENGTH);
signatures.forEach((sig, i) => flat.set(sig, i * SIGNATURE_LENGTH));

fs.writeFileSync(outBin, Buffer.from(flat.buffer));
fs.writeFileSync(outManifest, zlib.gzipSync(Buffer.from(JSON.stringify(manifest)), { level: 9 }));

const binMB = (fs.statSync(outBin).size / 1048576).toFixed(2);
const manKB = (fs.statSync(outManifest).size / 1024).toFixed(0);
console.log(`\nIndexed ${signatures.length} hadiths across ${collections.length} collections (${skipped} skipped — no Arabic text).`);
console.log(`Wrote ${outBin} (${binMB} MB) and ${outManifest} (${manKB} KB).`);
