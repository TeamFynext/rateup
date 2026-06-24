import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DICT_DIR = join(process.cwd(), "src/locales");

const TARGETS = [
  { file: "de.json", lang: "de" },
  { file: "fr.json", lang: "fr" },
  { file: "hi.json", lang: "hi" },
  { file: "ar.json", lang: "ar" },
];

const PLACEHOLDER_REGEX = /(\{\{[^{}]+\}\}|\{[^{}]+\}|%\d*\$?[sd]|:[a-zA-Z_]\w*)/g;
const SPLIT_TOKEN = "\n__SPLIT__\n";
const MAX_BATCH_CHARS = 1200;

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function collectEmptyStringLeaves(obj, out = [], path = []) {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = [...path, key];
    if (isObject(value)) {
      collectEmptyStringLeaves(value, out, currentPath);
      continue;
    }
    if (typeof value === "string" && value === "") {
      out.push({ path: currentPath });
    }
  }
  return out;
}

function protectPlaceholders(text) {
  const placeholders = [];
  const protectedText = String(text).replaceAll(PLACEHOLDER_REGEX, (match) => {
    const token = `__PH${placeholders.length}__`;
    placeholders.push(match);
    return token;
  });
  return { protectedText, placeholders };
}

function restorePlaceholders(text, placeholders) {
  let out = String(text);
  placeholders.forEach((placeholder, idx) => {
    out = out.replaceAll(`__PH${idx}__`, placeholder);
  });
  return out;
}

async function translateChunk(lines, lang) {
  const joined = lines.map((x) => x.protectedText).join(SPLIT_TOKEN);
  const params = new URLSearchParams({
    client: "gtx",
    sl: "en",
    tl: lang,
    dt: "t",
    q: joined,
  });

  const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Translate request failed ${res.status}`);
  }

  const json = await res.json();
  const translatedJoined = (json?.[0] || []).map((part) => part?.[0] || "").join("");
  const split = translatedJoined.split(SPLIT_TOKEN);

  if (split.length !== lines.length) {
    const fallback = [];
    for (const line of lines) {
      const single = await translateChunk([line], lang);
      fallback.push(single[0]);
    }
    return fallback;
  }

  return split.map((text, idx) => restorePlaceholders(text, lines[idx].placeholders));
}

async function translateUniqueStrings(uniqueStrings, lang) {
  const translated = new Map();
  const protectedItems = uniqueStrings.map((text) => ({
    source: text,
    ...protectPlaceholders(text),
  }));

  let i = 0;
  while (i < protectedItems.length) {
    const chunk = [];
    let charCount = 0;

    while (i < protectedItems.length) {
      const item = protectedItems[i];
      const nextSize = item.protectedText.length + (chunk.length > 0 ? SPLIT_TOKEN.length : 0);
      if (chunk.length > 0 && charCount + nextSize > MAX_BATCH_CHARS) break;
      chunk.push(item);
      charCount += nextSize;
      i += 1;
    }

    const results = await translateChunk(chunk, lang);
    results.forEach((value, idx) => {
      translated.set(chunk[idx].source, value);
    });

    process.stdout.write(`\r${lang}: translated ${translated.size}/${uniqueStrings.length}`);
  }

  process.stdout.write("\n");
  return translated;
}

async function main() {
  for (const target of TARGETS) {
    const outPath = join(DICT_DIR, target.file);
    const existing = JSON.parse(readFileSync(outPath, "utf8"));

    // Search for empty keys in the entire file, not just under translation
    const leavesToTranslate = collectEmptyStringLeaves(existing);
    if (leavesToTranslate.length === 0) {
      console.log(`No empty keys to translate for ${target.file}`);
      continue;
    }

    // Use the last segment of the path as the key for translation
    const sourceKeys = leavesToTranslate
      .map((leaf) => leaf.path[leaf.path.length - 1])
      .filter((key) => key.trim().length > 0);
    const uniqueKeys = [...new Set(sourceKeys)];

    console.log(`\nTranslating ${target.file} (${target.lang})...`);
    const translatedMap = await translateUniqueStrings(uniqueKeys, target.lang);

    // Helper to set value at a path in an object
    function setValueAtPath(obj, path, value) {
      let node = obj;
      for (let i = 0; i < path.length - 1; i++) {
        node = node[path[i]];
      }
      node[path[path.length - 1]] = value;
    }

    // Update value field from translated key text.
    leavesToTranslate.forEach(({ path }) => {
      const key = path[path.length - 1];
      const value = translatedMap.get(key) || key;
      setValueAtPath(existing, path, value);
    });

    writeFileSync(outPath, `${JSON.stringify(existing, null, 2)}\n`);
    console.log(`Wrote ${target.file}`);
  }

  console.log("\nDone.");
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
