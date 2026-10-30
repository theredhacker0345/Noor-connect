#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const COLLECTION_PROFILES = {
  bukhari: {
    patterns: ["bukhari", "bukhaari"],
    title: "Sahih al-Bukhari",
    author: "Imam Muhammad ibn Ismail al-Bukhari",
    death: "256 AH / 870 CE",
    authenticity: "Sahih (Authentic)",
  },
  muslim: {
    patterns: ["muslim"],
    title: "Sahih Muslim",
    author: "Imam Muslim ibn al-Hajjaj",
    death: "261 AH / 875 CE",
    authenticity: "Sahih (Authentic)",
  },
  tirmidhi: {
    patterns: ["tirmidhi", "tirmizi", "thermithi"],
    title: "Sunan al-Tirmidhi",
    author: "Imam Abu Isa al-Tirmidhi",
    death: "279 AH / 892 CE",
    authenticity: "Hasan (Good)",
  },
  "abu-dawud": {
    patterns: ["abu dawud", "abudawud", "abi dawud", "abudawood"],
    title: "Sunan Abu Dawud",
    author: "Imam Abu Dawud al-Sijistani",
    death: "275 AH / 889 CE",
    authenticity: "Hasan (Good)",
  },
  nasai: {
    patterns: ["nasai", "nasa'i", "nasaii", "nisai"],
    title: "Sunan al-Nasa'i",
    author: "Imam al-Nasa'i",
    death: "303 AH / 915 CE",
    authenticity: "Hasan (Good)",
  },
  "ibn-majah": {
    patterns: ["ibn majah", "ibnmajah", "majah"],
    title: "Sunan Ibn Majah",
    author: "Imam Ibn Majah",
    death: "273 AH / 887 CE",
    authenticity: "Hasan (Good)",
  },
  muwatta: {
    patterns: ["muwatta", "muwatta malik", "malik"],
    title: "Muwatta Malik",
    author: "Imam Malik ibn Anas",
    death: "179 AH / 795 CE",
    authenticity: "Sahih (Authentic)",
  },
  "musnad-ahmad": {
    patterns: ["musnad ahmad", "ahmad ibn hanbal", "ahmad"],
    title: "Musnad Ahmad ibn Hanbal",
    author: "Imam Ahmad ibn Hanbal",
    death: "241 AH / 855 CE",
    authenticity: "Varied",
  },
  "riyad-us-salihin": {
    patterns: ["riyad", "riyadh", "salihin", "nawawi"],
    title: "Riyad us-Salihin",
    author: "Imam al-Nawawi",
    death: "676 AH / 1277 CE",
    authenticity: "Sahih (Authentic)",
  },
};

const FIELD_ALIASES = {
  collection: [
    "collection",
    "collection_name",
    "source",
    "book",
    "book_collection",
    "hadith_collection",
    "book_source",
  ],
  bookNumber: [
    "book_no",
    "book_number",
    "bookid",
    "book",
    "kitab_no",
    "kitab_number",
  ],
  bookName: [
    "book_name",
    "book_title",
    "kitab_name",
    "kitab",
    "chapter_book",
  ],
  chapterNumber: [
    "chapter_no",
    "chapter_number",
    "bab_no",
    "bab_number",
  ],
  chapterName: [
    "chapter_name",
    "chapter_title",
    "bab_name",
    "bab",
  ],
  hadithNumber: [
    "hadith_no",
    "hadith_number",
    "hadithid",
    "number",
    "id",
  ],
  arabic: [
    "hadith",
    "text",
    "arabic",
    "matn",
    "content",
  ],
  englishTranslation: [
    "translation",
    "english",
    "english_translation",
    "en",
    "englishtext",
  ],
  narrator: [
    "narrator",
    "rawi",
    "narrated_by",
  ],
  grade: [
    "grade",
    "hukm",
    "status",
    "authenticity",
  ],
  category: [
    "category",
    "topic",
    "section",
  ],
  tags: [
    "tags",
    "keywords",
    "labels",
  ],
  references: [
    "reference",
    "references",
    "ref",
  ],
};

function parseArgs(argv) {
  // Runtime fetches from public/ — importing anywhere else silently drifts (v2.3.0 shipped stale data that way)
  const args = { input: "", output: "public/data/hadith-collections", cleanOutput: false };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--input" && argv[i + 1]) {
      args.input = argv[i + 1];
      i += 1;
      continue;
    }
    if (current === "--output" && argv[i + 1]) {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (current === "--clean-output") {
      args.cleanOutput = true;
      continue;
    }
  }

  if (!args.input) {
    throw new Error("Missing required --input <path> argument.");
  }

  return args;
}

function normalizeKey(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "hadith";
}

function pickValue(record, aliases) {
  const keys = Object.keys(record);
  for (const alias of aliases) {
    const normalizedAlias = normalizeKey(alias);
    const matchedKey = keys.find((key) => normalizeKey(key) === normalizedAlias);
    if (matchedKey && record[matchedKey] !== undefined && record[matchedKey] !== null && record[matchedKey] !== "") {
      return record[matchedKey];
    }
  }
  return undefined;
}

function cleanString(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function repairMojibakeIfNeeded(value) {
  const text = cleanString(value);
  if (!text) {
    return text;
  }

  // Common UTF-8 interpreted as Windows-1252/Latin-1 artifacts for Arabic text.
  const looksMojibake = /[ØÙÃÂÐ]/.test(text);
  if (!looksMojibake) {
    return text;
  }

  try {
    const repaired = Buffer.from(text, "latin1").toString("utf8").trim();
    return repaired || text;
  } catch {
    return text;
  }
}

function numericString(value, fallback) {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return fallback;
  }
  const match = cleaned.match(/\d+/);
  if (!match) {
    return fallback;
  }
  return String(Number.parseInt(match[0], 10));
}

function inferCollection(record, filenameBase) {
  const collectionHint = cleanString(pickValue(record, FIELD_ALIASES.collection));
  const bookNameHint = cleanString(pickValue(record, FIELD_ALIASES.bookName));
  const candidate = `${collectionHint} ${bookNameHint} ${filenameBase}`.toLowerCase();

  if (/\bqur'?an\b/.test(candidate)) {
    return "various-sources";
  }

  for (const [slug, profile] of Object.entries(COLLECTION_PROFILES)) {
    if (profile.patterns.some((pattern) => candidate.includes(pattern))) {
      return slug;
    }
  }

  const fallback = collectionHint || filenameBase || "hadith";
  const fallbackSlug = slugify(fallback);

  if (/\d/.test(fallbackSlug) || fallbackSlug === "hadith") {
    return "various-sources";
  }

  return fallbackSlug;
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cleanString(entry)).filter(Boolean);
  }

  const cleaned = cleanString(value);
  if (!cleaned) {
    return [];
  }

  return cleaned
    .split(/[;,|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function mapRecordToHadith(record, filenameBase, index) {
  const collection = inferCollection(record, filenameBase);
  const bookNumber = numericString(pickValue(record, FIELD_ALIASES.bookNumber), "1");
  const chapterNumber = numericString(pickValue(record, FIELD_ALIASES.chapterNumber), "");
  const hadithNumber = numericString(pickValue(record, FIELD_ALIASES.hadithNumber), String(index + 1));
  const arabic = cleanString(pickValue(record, FIELD_ALIASES.arabic));

  if (!arabic) {
    return null;
  }

  const bookName = cleanString(pickValue(record, FIELD_ALIASES.bookName)) || `Book ${bookNumber}`;
  const chapterName = cleanString(pickValue(record, FIELD_ALIASES.chapterName));

  return {
    id: `${collection}-${bookNumber}-${chapterNumber || "0"}-${hadithNumber}-${index + 1}`,
    collection,
    bookNumber,
    bookName,
    chapterNumber: chapterNumber || undefined,
    chapterName: chapterName || undefined,
    hadithNumber,
    arabic: repairMojibakeIfNeeded(arabic),
    arabicPlain: repairMojibakeIfNeeded(record.arabicPlain) || undefined,
    englishTranslation: cleanString(pickValue(record, FIELD_ALIASES.englishTranslation)) || undefined,
    narrator: cleanString(pickValue(record, FIELD_ALIASES.narrator)) || undefined,
    grade: cleanString(pickValue(record, FIELD_ALIASES.grade)) || undefined,
    category: cleanString(pickValue(record, FIELD_ALIASES.category)) || "General",
    tags: parseTags(pickValue(record, FIELD_ALIASES.tags)),
    references: cleanString(pickValue(record, FIELD_ALIASES.references)) || undefined,
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }

      row.push(current);
      current = "";

      if (row.some((value) => cleanString(value) !== "")) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    current += char;
  }

  if (current !== "" || row.length > 0) {
    row.push(current);
    if (row.some((value) => cleanString(value) !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

async function readRecordsFromFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const content = await fs.readFile(filePath, "utf8");

  if (extension === ".json") {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === "object") {
      for (const key of ["data", "hadiths", "items", "results", "rows"]) {
        if (Array.isArray(parsed[key])) {
          return parsed[key];
        }
      }
    }

    return [];
  }

  if (extension === ".csv") {
    const rows = parseCsv(content);
    if (rows.length < 2) {
      return [];
    }

    const [headers, ...records] = rows;
    return records.map((record) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = record[index] ?? "";
      });
      return obj;
    });
  }

  return [];
}

async function listSourceFiles(inputDir) {
  const stats = await fs.stat(inputDir);
  if (stats.isFile()) {
    const extension = path.extname(inputDir).toLowerCase();
    if (extension === ".json" || extension === ".csv") {
      return [inputDir];
    }
    return [];
  }

  const collected = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (extension === ".json" || extension === ".csv") {
        collected.push(fullPath);
      }
    }
  }

  await walk(inputDir);
  return collected;
}

function formatCollectionTitle(slug) {
  const profile = COLLECTION_PROFILES[slug];
  if (profile?.title) {
    return profile.title;
  }

  return slug
    .split("-")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function createMetadata(collection, booksByNumber) {
  const profile = COLLECTION_PROFILES[collection] || {};
  const books = Array.from(booksByNumber.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([bookNumber, hadithList]) => ({
      number: bookNumber,
      name: hadithList[0]?.bookName || `Book ${bookNumber}`,
      arabicName: "",
      hadithCount: hadithList.length,
      description: "",
    }));

  const totalHadith = books.reduce((sum, book) => sum + book.hadithCount, 0);

  return {
    name: collection,
    title: formatCollectionTitle(collection),
    arabicTitle: "",
    author: profile.author || "Unknown",
    death: profile.death || "",
    description: "Imported from external hadith dataset.",
    totalHadith,
    totalBooks: books.length,
    authenticity: profile.authenticity || "",
    compilerPeriod: "",
    books,
  };
}

async function ensureCleanDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeCollection(outputDir, collection, booksByNumber) {
  const collectionDir = path.join(outputDir, collection);
  await ensureCleanDir(collectionDir);

  for (const [bookNumber, hadithList] of booksByNumber.entries()) {
    const sortedHadith = [...hadithList].sort((a, b) => {
      const aNum = Number.parseInt(a.hadithNumber, 10);
      const bNum = Number.parseInt(b.hadithNumber, 10);
      if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
        return a.hadithNumber.localeCompare(b.hadithNumber);
      }
      return aNum - bNum;
    });

    const filePath = path.join(collectionDir, `book-${bookNumber}.json`);
    await fs.writeFile(filePath, JSON.stringify(sortedHadith, null, 2), "utf8");
  }

  const metadata = createMetadata(collection, booksByNumber);
  await fs.writeFile(
    path.join(collectionDir, "metadata.json"),
    JSON.stringify(metadata, null, 2),
    "utf8"
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = path.resolve(args.input);
  const outputDir = path.resolve(args.output);

  const sourceFiles = await listSourceFiles(inputDir);
  if (sourceFiles.length === 0) {
    throw new Error(`No JSON or CSV files found under: ${inputDir}`);
  }

  const grouped = new Map();
  let importedRows = 0;

  for (const filePath of sourceFiles) {
    const filenameBase = path.basename(filePath, path.extname(filePath));
    const records = await readRecordsFromFile(filePath);

    records.forEach((record, index) => {
      if (!record || typeof record !== "object") {
        return;
      }

      const hadith = mapRecordToHadith(record, filenameBase, index);
      if (!hadith) {
        return;
      }

      if (!grouped.has(hadith.collection)) {
        grouped.set(hadith.collection, new Map());
      }
      const books = grouped.get(hadith.collection);
      if (!books.has(hadith.bookNumber)) {
        books.set(hadith.bookNumber, []);
      }

      books.get(hadith.bookNumber).push(hadith);
      importedRows += 1;
    });
  }

  if (importedRows === 0) {
    throw new Error("No usable hadith records were found in the provided files.");
  }

  await fs.mkdir(outputDir, { recursive: true });

  if (args.cleanOutput) {
    const outputEntries = await fs.readdir(outputDir, { withFileTypes: true });
    for (const entry of outputEntries) {
      if (!entry.isDirectory()) {
        continue;
      }
      await fs.rm(path.join(outputDir, entry.name), { recursive: true, force: true });
    }
  }

  for (const [collection, books] of grouped.entries()) {
    await writeCollection(outputDir, collection, books);
  }

  const collectionCount = grouped.size;
  console.log(`Imported ${importedRows} hadith records into ${collectionCount} collection(s).`);
  console.log(`Output directory: ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
