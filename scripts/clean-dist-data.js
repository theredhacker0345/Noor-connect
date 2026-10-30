/**
 * clean-dist-data.js
 * -------------------
 * Prepares dist/ before `cap sync android`.
 *
 * WHAT IT DOES:
 *  - dist/mushaf/         → KEPT. cap sync replaces assets/public with the contents
 *                           of dist, so dist/mushaf IS what ships in the APK
 *                           (the Mushaf viewer fetches /mushaf/<page>.webp). Deleting
 *                           it here used to strip all mushaf pages from the APK.
 *
 *  - dist/data/tafsir/    → GONE since v2.3.0: tafsir is CDN-first (jsdelivr) with
 *                           optional per-edition offline downloads via /settings/storage.
 *                           The bundled copy was removed from public/, so dist never
 *                           contains it and nothing needs deleting here.
 *
 *  - dist/data/hadith-collections/ → Hadith JSON (~110 MB). NOT deleted: the app loads
 *                           these at runtime with fetch(), so they must ship in the APK.
 *                           Instead each *.json is gzipped to *.json.gz (zlib level 9,
 *                           ~65-70% smaller) and the raw JSON removed. The runtime
 *                           loader (src/lib/gzip-loader.ts) transparently decompresses
 *                           them with DecompressionStream, keeping hadiths fully offline.
 *
 *  - *.gz/*.br siblings   → Vite's compression plugins emit precompressed copies of
 *                           every asset. Capacitor's WebView serves files straight from
 *                           disk with no HTTP compression, so they are dead weight in
 *                           the APK. Removed (except the intentional hadith .json.gz).
 *
 * RUN VIA:  npm run android:build  (already wired in package.json)
 */

import { rmSync, existsSync, statSync, readdirSync, writeFileSync, unlinkSync, readFileSync } from 'fs';
import { gzipSync } from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');

function getSizeMB(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const f of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (f.isFile?.() ?? !f.isDirectory()) {
      try {
        const fullPath = path.join(f.path ?? dir, f.name);
        total += statSync(fullPath).size;
      } catch {}
    }
  }
  return (total / 1024 / 1024).toFixed(1);
}

/** Collect all *.json file paths under dir (recursively). */
function collectJsonFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...collectJsonFiles(p));
    } else if (e.name.endsWith('.json') && existsSync(p)) {
      out.push(p);
    }
  }
  return out;
}

/** Gzip every *.json under dir (recursively) to *.json.gz, then delete the original. */
function compressJsonDir(dir) {
  if (!existsSync(dir)) return { beforeMB: 0, afterMB: 0, count: 0, failed: [] };
  const files = collectJsonFiles(dir);
  const failed = [];
  let before = 0;
  let after = 0;
  for (const file of files) {
    const raw = statSync(file).size;
    before += raw;
    try {
      const compressed = gzipSync(readFileSync(file), { level: 9 });
      writeFileSync(file + '.gz', compressed);
      unlinkSync(file);
      after += compressed.length;
    } catch (err) {
      failed.push(`${path.basename(file)}: ${err.message}`);
      after += raw;
    }
  }
  return {
    beforeMB: (before / 1024 / 1024).toFixed(1),
    afterMB: (after / 1024 / 1024).toFixed(1),
    count: files.length,
    failed,
  };
}

const deleteTargets = [];

const compressTargets = [
  {
    path: path.join(distDir, 'data', 'hadith-collections'),
    label: 'dist/data/hadith-collections (runtime fetch — gzipped, stays offline)',
  },
  {
    path: path.join(distDir, 'data', 'seerah'),
    label: 'dist/data/seerah (gzipped, stays offline)',
  },
  {
    path: path.join(distDir, 'data', 'qisas'),
    label: 'dist/data/qisas (gzipped, stays offline)',
  },
];

console.log('\n📦 Pre-cap-sync APK size cleanup\n');

let totalSaved = 0;

for (const target of deleteTargets) {
  if (existsSync(target.path)) {
    const mb = getSizeMB(target.path);
    rmSync(target.path, { recursive: true, force: true });
    totalSaved += parseFloat(mb);
    console.log(`  ✓ Removed ${target.label}  (${mb} MB)`);
  } else {
    console.log(`  – Skipped ${target.label}  (not found)`);
  }
}

for (const compressTarget of compressTargets) {
  if (existsSync(compressTarget.path)) {
    const r = compressJsonDir(compressTarget.path);
    const saved = parseFloat(r.beforeMB) - parseFloat(r.afterMB);
    totalSaved += saved;
    console.log(`  ✓ Compressed ${compressTarget.label}`);
    console.log(`      ${r.count} files: ${r.beforeMB} MB → ${r.afterMB} MB  (−${saved.toFixed(1)} MB)`);
    if (r.failed.length) {
      console.log(`      ⚠ ${r.failed.length} file(s) failed (left as plain JSON):`);
      for (const e of r.failed) console.log(`        – ${e}`);
    }
  } else {
    console.log(`  – Skipped ${compressTarget.label}  (not found)`);
  }
}

// Vite's compression plugins emit *.gz/*.br siblings for every asset. Capacitor's
// WebView serves files straight from disk with no HTTP compression, so those copies
// are dead weight in the APK. Remove every *.br and every *.gz EXCEPT the
// intentional *.json.gz files produced above.
{
  const keptGzPrefixes = compressTargets.map(t => t.path + path.sep);
  const toRemove = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.name.endsWith('.br') || (e.name.endsWith('.gz') && !keptGzPrefixes.some(p => full.startsWith(p)))) {
        toRemove.push(full);
      }
    }
  };
  walk(distDir);
  let removedMB = 0;
  for (const full of toRemove) {
    try {
      removedMB += statSync(full).size;
      rmSync(full, { force: true });
    } catch {}
  }
  if (removedMB > 0) {
    totalSaved += removedMB / 1024 / 1024;
    console.log(`  ✓ Removed redundant .gz/.br copies (unused by Capacitor local serving)  (${(removedMB / 1024 / 1024).toFixed(1)} MB)`);
  }
}

console.log(`\n  💾 Total removed: ~${totalSaved.toFixed(0)} MB from APK assets\n`);
