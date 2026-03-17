const fs = require("fs");
const path = require("path");

const DICT_DIR = path.join(process.cwd(), "dictionaries");
const EN_PATH = path.join(DICT_DIR, "en.json");

const TARGETS = [
  { file: "de.json", lang: "de" },
  { file: "fr.json", lang: "fr" },
  { file: "hi.json", lang: "hi" },
  { file: "ar.json", lang: "ar" },
];

const PLACEHOLDER_REGEX =
  /(\{\{[^{}]+\}\}|\{[^{}]+\}|%\d*\$?[sd]|:[a-zA-Z_][a-zA-Z0-9_]*)/g;
const SPLIT_TOKEN = "\n__SPLIT__\n";
const MAX_BATCH_CHARS = 1200;

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function getLeafPaths(obj, base = "", out = []) {
  for (const [key, value] of Object.entries(obj)) {
    const next = base ? `${base}.${key}` : key;
    if (isObject(value)) {
      getLeafPaths(value, next, out);
    } else {
      out.push(next);
    }
  }
  return out;
}

function getByPath(obj, pathStr) {
  return pathStr.split(".").reduce((acc, part) => acc?.[part], obj);
}

function setByPath(obj, pathStr, value) {
  const parts = pathStr.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!isObject(cur[key])) cur[key] = {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

function protectPlaceholders(text) {
  const placeholders = [];
  const protectedText = String(text).replace(PLACEHOLDER_REGEX, (match) => {
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
  const translatedJoined = (json?.[0] || [])
    .map((part) => part?.[0] || "")
    .join("");
  const split = translatedJoined.split(SPLIT_TOKEN);

  if (split.length !== lines.length) {
    const fallback = [];
    for (const line of lines) {
      const single = await translateChunk([line], lang);
      fallback.push(single[0]);
    }
    return fallback;
  }

  return split.map((text, idx) =>
    restorePlaceholders(text, lines[idx].placeholders),
  );
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
      const nextSize =
        item.protectedText.length + (chunk.length > 0 ? SPLIT_TOKEN.length : 0);
      if (chunk.length > 0 && charCount + nextSize > MAX_BATCH_CHARS) break;
      chunk.push(item);
      charCount += nextSize;
      i += 1;
    }

    const results = await translateChunk(chunk, lang);
    results.forEach((value, idx) => {
      translated.set(chunk[idx].source, value);
    });

    process.stdout.write(
      `\r${lang}: translated ${translated.size}/${uniqueStrings.length}`,
    );
  }

  process.stdout.write("\n");
  return translated;
}

async function main() {
  const en = JSON.parse(fs.readFileSync(EN_PATH, "utf8"));
  const paths = getLeafPaths(en);
  const allEnglishStrings = paths
    .map((p) => getByPath(en, p))
    .filter((v) => typeof v === "string" && v.trim().length > 0);
  const uniqueStrings = [...new Set(allEnglishStrings)];

  console.log(
    `Source strings: ${allEnglishStrings.length}, unique: ${uniqueStrings.length}`,
  );

  for (const target of TARGETS) {
    const outPath = path.join(DICT_DIR, target.file);
    const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));

    console.log(`\nTranslating ${target.file} (${target.lang})...`);
    const translatedMap = await translateUniqueStrings(
      uniqueStrings,
      target.lang,
    );

    for (const p of paths) {
      const enValue = getByPath(en, p);
      if (typeof enValue !== "string") continue;
      if (enValue.trim().length === 0) {
        setByPath(existing, p, enValue);
        continue;
      }
      const translated = translatedMap.get(enValue) || enValue;
      setByPath(existing, p, translated);
    }

    fs.writeFileSync(outPath, `${JSON.stringify(existing, null, 2)}\n`);
    console.log(`Wrote ${target.file}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
