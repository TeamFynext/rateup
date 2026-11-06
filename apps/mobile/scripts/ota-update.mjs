// Publishes a production OTA update for one platform, with every EXPO_PUBLIC_ value taken
// from .env.prod.
//
// `eas update` bundles the JavaScript on this machine, so EXPO_PUBLIC_* values come from
// here, not from the store build. EAS does not hand "secret" variables to a local update,
// and Expo then falls back to the local .env: that once shipped a dev tunnel URL to every
// user. This script loads .env.prod into the environment first (Expo never overwrites a
// variable that is already set), so the local .env can stay pointed at development.
//
// Usage: pnpm run ota:android "message"   /   pnpm run ota:ios "message"
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ENV_FILE = ".env.prod";
const PLATFORMS = ["android", "ios"];

// Every EXPO_PUBLIC_ variable the app reads (see .env.example). All must be set.
const REQUIRED_KEYS = [
  "EXPO_PUBLIC_API_URL",
  "EXPO_PUBLIC_AWS_CLOUDFRONT_URL",
  "EXPO_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL",
  "EXPO_PUBLIC_SUPERTOKEN_GOOGLE_CLIENT_ID",
  "EXPO_PUBLIC_SUPERTOKEN_GOOGLE_IOS_CLIENT_ID",
  "EXPO_PUBLIC_UNSPLASH_URL",
];

function fail(message) {
  console.error(`\n✖ ${message}\nNothing was published.`);
  process.exit(1);
}

// Minimal dotenv parser: KEY=value per line, `#` comments, optional quotes.
function parseEnvFile(path) {
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

const [platform, ...messageParts] = process.argv.slice(2);
const message = messageParts.join(" ").trim();

if (!PLATFORMS.includes(platform)) {
  fail(`Platform must be one of: ${PLATFORMS.join(", ")}. Got: ${platform ?? "(none)"}`);
}
if (!message) fail(`Add a message: pnpm run ota:${platform} "What changed"`);
if (!existsSync(ENV_FILE)) fail(`${ENV_FILE} not found in ${process.cwd()}.`);

const prod = parseEnvFile(ENV_FILE);

const missing = REQUIRED_KEYS.filter((key) => !prod[key]);
if (missing.length) fail(`${ENV_FILE} is missing: ${missing.join(", ")}`);

const apiUrl = prod.EXPO_PUBLIC_API_URL.replace(/\/+$/, "");
if (!apiUrl.startsWith("https://")) fail(`EXPO_PUBLIC_API_URL must be https:// (got ${apiUrl}).`);
if (/devtunnels|ngrok|localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(apiUrl)) {
  fail(`EXPO_PUBLIC_API_URL looks like a development URL: ${apiUrl}`);
}

console.log(`Publishing ${platform} OTA to channel "production" using ${ENV_FILE}:`);
for (const key of REQUIRED_KEYS) console.log(`  ${key} = ${prod[key]}`);

const args = [
  "update",
  "--channel",
  "production",
  "--platform",
  platform,
  "--environment",
  "production",
  "--message",
  JSON.stringify(message),
];

const result = spawnSync("eas", args, {
  stdio: "inherit",
  // `eas` is a .cmd shim on Windows, which needs a shell to run.
  shell: true,
  env: { ...process.env, ...prod },
});

process.exit(result.status ?? 1);
