import type { QueryFilter } from "@/types/api.ts";

/**
 * One normalised shape for every analytics request, used both as the axios `params`
 * and as the react-query key.
 *
 * The filters used to be flattened by hand with `${key}=${value}`, unencoded. A
 * `Date` went out as "Fri Sep 18 2026 00:00:00 GMT+0530 (India Standard Time)", the
 * `+` reached the server as a space, and the server read an IST range as if it were
 * UTC — every range was five and a half hours out. ISO strings through axios'
 * encoder fix that, and because the same value is the query key, two renders asking
 * for the same range now share a cache entry instead of missing on `Date` identity.
 */

/** A query-string value once normalised: only what axios serialises unambiguously. */
export type AnalyticsParam = string | number | boolean;
export type AnalyticsParams = Record<string, AnalyticsParam>;

/** How long after a manual refresh requests ask the server to skip its cache. */
const FRESH_WINDOW_MS = 10_000;

let freshUntil = 0;

/**
 * Call right before invalidating analytics queries from the Refresh button. For the
 * next few seconds every analytics request carries `fresh=1`, which the API reads as
 * "skip the analytics cache" — so a manual refresh shows the database's numbers, not
 * a cached minute-old copy. It is a query parameter rather than `Cache-Control`
 * because the API's CORS policy only admits a fixed list of request headers.
 */
export function requestFreshAnalytics() {
  freshUntil = Date.now() + FRESH_WINDOW_MS;
}

function isTeamUnset(value: unknown): boolean {
  return value === null || value === undefined || value === "" || value === "null";
}

/**
 * Normalises a filter:
 *  - a two-ended `Date[]` becomes `"<iso>,<iso>"`; a half-picked range is dropped, so
 *    the server falls back to its default window instead of parsing one lone date;
 *  - `null`, `undefined` and empty arrays are dropped rather than sent as the strings
 *    "null" / "undefined";
 *  - an unset `teamId` becomes `"all"`, the one spelling the server's cache keys on;
 *  - numbers, booleans and strings pass through untouched, so keys built elsewhere
 *    from the same primitives (`{ days: 7 }`) still match for invalidation.
 * Keys are emitted in sorted order so equal filters serialise equally.
 */
export function toAnalyticsParams(filter: QueryFilter | null | undefined): AnalyticsParams {
  const params: AnalyticsParams = {};
  if (!filter) return params;

  for (const key of Object.keys(filter).sort()) {
    const value = filter[key];

    if (key === "teamId") {
      params.teamId = isTeamUnset(value) ? "all" : String(value);
      continue;
    }
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      if (value.every((item) => item instanceof Date)) {
        const dates = value as Date[];
        if (dates.length !== 2 || dates.some((date) => Number.isNaN(date.getTime()))) continue;
        params[key] = dates.map((date) => date.toISOString()).join(",");
      } else {
        params[key] = value.join(",");
      }
      continue;
    }

    params[key] = value instanceof Date ? value.toISOString() : value;
  }
  return params;
}

/** The params to put on the wire: the normalised filter, plus `fresh` after a refresh. */
export function analyticsRequestParams(filter: QueryFilter | null | undefined): AnalyticsParams {
  const params = toAnalyticsParams(filter);
  return Date.now() < freshUntil ? { ...params, fresh: 1 } : params;
}

/**
 * A slow aggregate should fail once and say so. The client's default is 8 s with two
 * retries, which on a large org meant 24 s of spinner before the same timeout.
 */
export const ANALYTICS_TIMEOUT_MS = 30_000;

/** Shared react-query options for analytics reads. */
export const analyticsQueryOptions = {
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: false,
} as const;
