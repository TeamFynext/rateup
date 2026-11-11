#!/usr/bin/env node
// Brings a dotenv file up to date: renames old variable names to the current ones, drops
// variables nothing reads, removes the trailing slash from URL values (the code joins paths
// with its own slash), and writes on/off switches as `true` / `false` (never 1/0, yes/no).
//
//   node scripts/env-rename.mjs                 every .env in the repo, in place (.env.bak kept)
//   node scripts/env-rename.mjs apps/api/.env   only the files given
//   node scripts/env-rename.mjs --dry-run       show what would change, write nothing
//   node scripts/env-rename.mjs --keep-old      add the new names but keep the old ones too
//   node scripts/env-rename.mjs --sort          also reorder into the .env.example's sections
//   node scripts/env-rename.mjs - < in.env > out.env   stdin to stdout (e.g. Railway's Raw Editor)
//   node scripts/env-rename.mjs - --app api --sort < in.env   stdin needs --app to sort
//
// Railway without downtime: paste a service's Raw Editor contents through `--keep-old`, save,
// deploy the new code, then run it again without `--keep-old` to drop the old names.
//
// Without --sort, comments, blank lines and order are kept. --sort keeps only the values, under
// the example's section headings, with anything the example does not list at the end. Keys that the matching .env.example does not list
// are reported (not removed), so a hand-added variable is never deleted silently.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Old name → new name. Two old names may point at one new name (they held the same value). */
export const RENAMES = {
  // Meta / WhatsApp
  wa_access_token_encryption_key: "META_ENCRYPTION_KEY",
  waclient_id: "META_APP_ID",
  wa_app_id: "META_APP_ID",
  waclient_secret: "META_APP_SECRET",
  wa_user_redirect_uri: "META_OAUTH_REDIRECT_PATH",
  wa_webhook_password: "META_WEBHOOK_VERIFY_TOKEN",
  wa_flow_encryption: "WA_FLOW_ENCRYPTION_KEYS",
  // SuperTokens (one spelling: SUPERTOKENS_, like SUPERTOKENS_DASHBOARD)
  SUPERTOKEN_URI: "SUPERTOKENS_CONNECTION_URI",
  SUPERTOKEN_KEY: "SUPERTOKENS_API_KEY",
  SUPERTOKEN_SMS_API_KEY: "SUPERTOKENS_SMS_API_KEY",
  SUPERTOKEN_GOOGLE_CLIENT_ID: "SUPERTOKENS_GOOGLE_CLIENT_ID",
  SUPERTOKEN_GOOGLE_CLIENT_SECRET: "SUPERTOKENS_GOOGLE_CLIENT_SECRET",
  EXPO_PUBLIC_SUPERTOKEN_GOOGLE_CLIENT_ID: "EXPO_PUBLIC_SUPERTOKENS_GOOGLE_CLIENT_ID",
  EXPO_PUBLIC_SUPERTOKEN_GOOGLE_IOS_CLIENT_ID: "EXPO_PUBLIC_SUPERTOKENS_GOOGLE_IOS_CLIENT_ID",
  // AWS: the SES keys get an SES_ prefix like the S3 ones, and the AWS SDK's "SECRET_ACCESS_KEY"
  AWS_REGION: "AWS_SES_REGION",
  AWS_ACCESS_KEY_ID: "AWS_SES_ACCESS_KEY_ID",
  AWS_SECRET_KEY: "AWS_SES_SECRET_ACCESS_KEY",
  AWS_S3_SECRET_KEY: "AWS_S3_SECRET_ACCESS_KEY",
  // CDNs, named for what they serve, with one base name in every app (only the
  // VITE_ / EXPO_PUBLIC_ prefix differs). MEDIA = uploaded files, WEB_IMAGES = dashboard images.
  NEXT_PUBLIC_AWS_CLOUDFRONT_URL: "MEDIA_CDN_URL",
  AWS_CLOUDFRONT_URL: "MEDIA_CDN_URL",
  VITE_AWS_CLOUDFRONT_URL: "VITE_MEDIA_CDN_URL",
  EXPO_PUBLIC_AWS_CLOUDFRONT_URL: "EXPO_PUBLIC_MEDIA_CDN_URL",
  AWS_CLOUDFRONT_DOMAIN: "MEDIA_CDN_DOMAIN",
  NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL: "WEB_IMAGES_CDN_URL",
  CLOUDFRONT_WEB_IMAGES_URL: "WEB_IMAGES_CDN_URL",
  VITE_CLOUDFRONT_WEB_IMAGES_URL: "VITE_WEB_IMAGES_CDN_URL",
  EXPO_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL: "EXPO_PUBLIC_WEB_IMAGES_CDN_URL",
  // Unsplash's image host (the API's UNSPLASH_API_URL is its API, a different address)
  VITE_UNSPLASH_URL: "VITE_UNSPLASH_IMAGES_URL",
  EXPO_PUBLIC_UNSPLASH_URL: "EXPO_PUBLIC_UNSPLASH_IMAGES_URL",
  // Same setting as the API's STAFF_GOOGLE_HD
  VITE_STAFF_DOMAIN: "VITE_STAFF_GOOGLE_HD",
  // Named for what they do
  META_TOKEN_ENCRYPTION_KEY: "META_ENCRYPTION_KEY", // also Flow keys and Meta Agent data
  CHATBOT_API_URL: "AI_API_URL", // the AI service behind response summaries
  GOOGLE_OAUTH_CLIENT_ID: "GOOGLE_SHEETS_CLIENT_ID", // used only by Google Sheets
  GOOGLE_OAUTH_CLIENT_SECRET: "GOOGLE_SHEETS_CLIENT_SECRET",
  ROOT_ORG: "ROOT_ORG_ID",
  KAFKA_URL: "KAFKA_BROKERS", // a broker list, not a URL; KAFKA_BROKERS already won over it
  WA_MESSAGE_CONCURRENCY: "CAMPAIGN_SEND_CONCURRENCY",
  CORS_WHITELIST: "CORS_ALLOWED_ORIGINS",
  VITE_SUPPORT_WHATSAPP: "VITE_SUPPORT_WHATSAPP_NUMBER",
  // On/off switches end in _ENABLED or _DISABLED; each keeps its meaning (true stays true)
  DISABLE_EMAIL: "EMAIL_DISABLED",
  SWAGGER: "API_DOCS_ENABLED",
  SUPERTOKENS_DASHBOARD: "SUPERTOKENS_DASHBOARD_ENABLED",
  STATUS_TALLY: "STATUS_TALLY_ENABLED",
  STAFF_CF_ACCESS_ENFORCE: "STAFF_CF_ACCESS_ENABLED",
  PASSWORDLESS_PHONE_SIGNUP: "PASSWORDLESS_PHONE_SIGNUP_ENABLED",
  NO_LOG: "LOG_DISABLED",
  // Spelling
  HUB_SPOT_PRIVATE_APP_ACCESS_TOKEN: "HUBSPOT_PRIVATE_APP_ACCESS_TOKEN",
  ROOT_ORG_MAIL_ID: "ROOT_ORG_EMAIL",
};

/** Variables no code reads any more. */
export const REMOVED = [
  "VITE_ROOT_ORG",
  "VITE_ZOHO_CLIENT_ID",
  "STRIPE_ENDPOINT_SECRET",
  "VITE_API_IP", // public survey pages now use VITE_API_URL like everything else
];

/** On/off switches. Their values are written `true` or `false`. */
export const FLAGS = new Set([
  "ALLOW_META_MOCK",
  "ANALYTICS_CACHE_DISABLED",
  "API_DOCS_ENABLED",
  "AUTHZ_STRICT",
  "EMAIL_DISABLED",
  "EXPO_APPLE_SIGNIN",
  "FLOW_SIGNATURE_DEBUG",
  "KAFKA_IDEMPOTENT",
  "LOG_DISABLED",
  "LOG_PRETTY",
  "META_MOCK_STATUS_PROGRESSION",
  "META_MOCK_VERBOSE",
  "PASSWORDLESS_PHONE_SIGNUP_ENABLED",
  "RATE_LIMIT_FAIL_CLOSED_DISABLED",
  "STAFF_CF_ACCESS_ENABLED",
  "STATUS_TALLY_ENABLED",
  "SUPERTOKENS_DASHBOARD_ENABLED",
  "VITE_STAFF_MOCK",
]);

const ON = new Set(["1", "true", "yes", "on"]);
const OFF = new Set(["0", "false", "no", "off"]);
const FLAG_VALUE = /^(\s*=\s*)(["']?)([^"'\s#]*)\2(.*)$/;

/** A switch's value without quotes or an inline comment, lower case; `null` if not a switch. */
function flagValue(key, rest) {
  const m = FLAGS.has(key) ? FLAG_VALUE.exec(rest) : null;
  return m ? m[3].toLowerCase() : null;
}

/** `rest` (`=value`) with a switch's value spelled `true` or `false`, when `key` is one. */
function normalizeFlag(key, rest) {
  if (!FLAGS.has(key)) return rest;
  const m = FLAG_VALUE.exec(rest);
  if (!m) return rest;
  const value = m[3].toLowerCase();
  const spelled = ON.has(value) ? "true" : OFF.has(value) ? "false" : null;
  return spelled ? `${m[1]}${spelled}${m[4]}` : rest;
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LINE = /^(\s*(?:#\s*)?(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=[^\n]*)$/;

// A URL (scheme://…) that ends in slashes, at the end of the value or of a comma-list item.
const TRAILING_SLASH = /([a-z][a-z0-9+.-]*:\/\/[^\s,'"]*[^\s,'"/])\/+(?=\s*(?:,|['"]|\s#|$))/gi;

/** `rest` (`=value`) with the trailing slash taken off every URL in it. */
function trimUrlSlashes(rest) {
  return rest.replace(TRAILING_SLASH, "$1");
}

function valueOf(rest) {
  return rest.replace(/^\s*=\s*/, "").trim();
}

/** Rewrites one dotenv text. Returns the new text plus what changed. */
export function migrate(text, { keepOld = false, known } = {}) {
  const lines = text.split("\n");
  const changes = [];
  const warnings = [];
  const active = new Map(); // key → value, uncommented lines only
  for (const line of lines) {
    const m = LINE.exec(line);
    if (m && !m[1].includes("#")) active.set(m[2], valueOf(m[3]));
  }

  const out = [];
  const written = new Set(); // new names already emitted as active lines
  for (const line of lines) {
    const m = LINE.exec(line);
    if (!m) {
      out.push(line);
      continue;
    }
    const [, prefix, key, raw] = m;
    const commented = prefix.includes("#");
    const next = RENAMES[key];
    const trimmed = trimUrlSlashes(raw);
    // A switch that keeps its name is still read by the deployed code under --keep-old, and
    // some of that code wants "1"; it is rewritten on the run without --keep-old.
    const rest = next || !keepOld ? normalizeFlag(next ?? key, trimmed) : trimmed;
    // Reported for keys that keep their name; a rename already says the line changed.
    const notes = [];
    if (!commented && trimmed !== raw) notes.push(`${key}: removed trailing /`);
    const finalKey = next ?? key;
    if (!commented && rest !== trimmed) {
      notes.push(`${key}: ${FLAG_VALUE.exec(trimmed)?.[3]} → ${flagValue(finalKey, rest)}`);
    }
    const flag = commented ? null : flagValue(finalKey, rest);
    if (flag && flag !== "true" && flag !== "false" && !(keepOld && !next)) {
      warnings.push(`${finalKey}=${flag} is not true or false; the code uses its default`);
    }

    if (REMOVED.includes(key)) {
      if (!commented) changes.push(`removed ${key}`);
      continue;
    }

    if (!next) {
      out.push(`${prefix}${key}${rest}`);
      changes.push(...notes);
      continue;
    }
    // The old copy stays exactly as it was: the code still deployed reads it, slash and all.
    if (keepOld) out.push(line);

    if (commented) {
      if (!keepOld) out.push(`${prefix}${next}${rest}`);
      continue;
    }
    // The new name is already set, or an earlier old name already became it.
    if (active.has(next) || written.has(next)) {
      changes.push(keepOld ? `${key}: ${next} already set` : `dropped ${key} (now ${next})`);
      continue;
    }
    written.add(next);
    out.push(`${prefix}${next}${rest}`);
    changes.push(keepOld ? `added ${next} (copy of ${key})` : `${key} → ${next}`);
  }

  // Old names that merge into one new name must agree, or the kept value may be the wrong one.
  const sources = new Map();
  for (const [key, value] of active) {
    const target = RENAMES[key] ?? key;
    if (!value || !(RENAMES[key] || Object.values(RENAMES).includes(key))) continue;
    sources.set(target, [...(sources.get(target) ?? []), [key, value]]);
  }
  for (const [target, list] of sources) {
    if (new Set(list.map(([, v]) => v)).size > 1) {
      const names = list.map(([k]) => k).join(", ");
      warnings.push(`${names} hold different values; ${target} got the first one, check it`);
    }
  }

  if (known) {
    for (const key of active.keys()) {
      if (!REMOVED.includes(key) && !known.has(RENAMES[key] ?? key)) {
        warnings.push(`${key} is not in .env.example; check whether it is still used`);
      }
    }
  }
  return { text: out.join("\n"), changes, warnings: [...new Set(warnings)] };
}

const SECTION = /^#\s*(?:──|--)\s*(.+?)\s*(?:─|-)+\s*$/;

/** The example's sections in order, each with its keys in order. */
function exampleSections(examplePath) {
  const sections = [{ title: null, keys: [] }];
  // A key belongs to the first section that lists it; later mentions are prose in comments
  // ("# … when NODE_ENV=development").
  const seen = new Set();
  for (const line of readFileSync(examplePath, "utf8").split("\n")) {
    const heading = SECTION.exec(line);
    if (heading) {
      sections.push({ title: heading[1], keys: [] });
      continue;
    }
    const m = LINE.exec(line);
    const current = sections[sections.length - 1];
    if (m && !seen.has(m[2])) {
      seen.add(m[2]);
      current.keys.push(m[2]);
    }
  }
  return sections.filter((section) => section.keys.length);
}

function heading(title) {
  const text = `# ── ${title} `;
  return text + "─".repeat(Math.max(3, 80 - text.length));
}

/**
 * Reorders a dotenv text into the example's sections. Only set values are kept (comments
 * and commented-out lines are dropped); keys the example does not list go last.
 */
export function sortLikeExample(text, examplePath) {
  const set = new Map();
  for (const line of text.split("\n")) {
    const m = LINE.exec(line);
    if (m && !m[1].includes("#")) set.set(m[2], line);
  }
  const out = [];
  const placed = new Set();
  for (const { title, keys } of exampleSections(examplePath)) {
    const lines = keys.filter((key) => set.has(key)).map((key) => set.get(key));
    if (!lines.length) continue;
    if (out.length) out.push("");
    if (title) out.push(heading(title));
    out.push(...lines);
    for (const key of keys) placed.add(key);
  }
  const rest = [...set.keys()].filter((key) => !placed.has(key));
  if (rest.length) {
    if (out.length) out.push("");
    out.push(heading("Not in .env.example"), ...rest.map((key) => set.get(key)));
  }
  return `${out.join("\n")}\n`;
}

function knownKeys(examplePath) {
  if (!existsSync(examplePath)) return undefined;
  const keys = new Set();
  for (const line of readFileSync(examplePath, "utf8").split("\n")) {
    const m = LINE.exec(line);
    if (m) keys.add(m[2]);
  }
  return keys;
}

function findEnvFiles() {
  const files = [];
  for (const group of ["apps", "packages", "tools"]) {
    const dir = join(ROOT, group);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const file = join(dir, name, ".env");
      if (existsSync(file)) files.push(file);
    }
  }
  return files;
}

function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const keepOld = flags.has("--keep-old");
  const dryRun = flags.has("--dry-run");
  const sort = flags.has("--sort");
  const appIdx = argv.indexOf("--app");
  const args = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--app");

  if (args[0] === "-") {
    const app = appIdx >= 0 ? argv[appIdx + 1] : undefined;
    const example = app ? join(ROOT, "apps", app, ".env.example") : undefined;
    if (sort && !example) throw new Error("--sort on stdin needs --app <folder under apps/>");
    const known = example ? knownKeys(example) : undefined;
    const { text, changes, warnings } = migrate(readFileSync(0, "utf8"), { keepOld, known });
    process.stdout.write(sort ? sortLikeExample(text, example) : text);
    for (const c of changes) process.stderr.write(`  ${c}\n`);
    for (const w of warnings) process.stderr.write(`  ! ${w}\n`);
    return;
  }

  const files = args.length ? args.map((f) => resolve(f)) : findEnvFiles();
  if (!files.length) console.log("No .env files found.");
  for (const file of files) {
    const before = readFileSync(file, "utf8");
    const example = join(dirname(file), ".env.example");
    const known = knownKeys(example);
    const migrated = migrate(before, { keepOld, known });
    const { changes, warnings } = migrated;
    const text = sort && known ? sortLikeExample(migrated.text, example) : migrated.text;
    if (sort && known && text !== migrated.text) changes.push("reordered like .env.example");
    const name = relative(process.cwd(), file) || file;
    if (!changes.length && !warnings.length) {
      console.log(`${name}: up to date`);
      continue;
    }
    console.log(`${name}:`);
    for (const c of changes) console.log(`  ${c}`);
    for (const w of warnings) console.log(`  ! ${w}`);
    if (!dryRun && text !== before) {
      writeFileSync(`${file}.bak`, before);
      writeFileSync(file, text);
    }
  }
  if (dryRun) console.log("\nDry run: nothing written.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
