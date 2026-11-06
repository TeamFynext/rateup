import { log } from "./logger.js";
import { parseArrayString } from "./array.js";

/**
 * Parses CORS_WHITELIST into a list of exact origins.
 *
 * Accepts either a JSON array (`["http://localhost:4000"]`, the shape currently
 * deployed) or a bare comma-separated list. Each entry is normalised through the URL
 * parser, so `http:localhost:4000` — missing its slashes — still resolves to the origin
 * a browser actually sends, and a trailing slash is dropped.
 *
 * Entries are returned as STRINGS, which @fastify/cors compares with `===`. They used
 * to be compiled with `new RegExp(entry)`, which was unsafe twice over:
 *   - the pattern was never anchored or escaped, so `app.rateup.app` also matched
 *     `https://app.rateup.app.evil.com`;
 *   - a JSON-shaped value was not split at all, so `["http:localhost:4000"]` became the
 *     character class /["http:localhost:4000"]/ — one character out of that set, matching
 *     essentially every origin. Combined with `credentials: true`, that let any site make
 *     authenticated cross-origin requests.
 *
 * An entry that is not a usable origin is dropped with an error rather than silently
 * widening the whitelist.
 */
export function parseCorsWhitelist(raw: string | undefined): string[] {
  const entries = splitEntries(raw);
  const origins: string[] = [];

  for (const entry of entries) {
    const origin = toOrigin(entry);
    if (!origin) {
      log.error(
        { entry },
        "CORS_WHITELIST entry is not a valid origin and has been ignored. " +
          "Expected something like http://localhost:4000 or https://app.example.com.",
      );
      continue;
    }
    if (!origins.includes(origin)) {
      origins.push(origin);
    }
  }

  return origins;
}

/** JSON array first, comma-separated list otherwise. */
function splitEntries(raw: string | undefined): string[] {
  if (!raw) return [];

  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((e): e is string => typeof e === "string").map((e) => e.trim());
      }
    } catch {
      // Not valid JSON after all — fall through and treat it as a plain list, which is
      // what the old code did with every value.
    }
  }

  return parseArrayString(trimmed);
}

/** The canonical origin for an entry, or null when it is not one. */
function toOrigin(entry: string): string | null {
  if (!entry) return null;
  try {
    const { origin } = new URL(entry);
    // Non-http(s) schemes (file:, data:) parse fine but serialise origin as "null",
    // which would then match a sandboxed iframe's Origin header.
    return origin && origin !== "null" ? origin : null;
  } catch {
    return null;
  }
}
