import { cacheKeyFor, withCache } from "./cache.js";

/**
 * Caching for the `/dashboard/analytics` endpoints.
 *
 * Every tab switch and date-picker click used to re-run the same aggregates for
 * every user looking at the page. The numbers are a view of history; being a
 * minute behind is invisible, and the Refresh button bypasses the cache outright.
 */

/** Bump when a query changes what it returns, so old entries are never served. */
const NAMESPACE = "analytics:v1";

/** A calendar date carrying no time. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** How live an endpoint's numbers need to feel while the range still includes now. */
export const LIVE_TTL_SECONDS = {
  /** Counters people glance at to see what is happening right now. */
  quick: 30,
  /** Overview cards, trends, distributions. */
  standard: 60,
  /** The heavy per-staff and per-team breakdowns. */
  heavy: 120,
} as const;

export type AnalyticsLiveness = keyof typeof LIVE_TTL_SECONDS;

/**
 * How long a result may be served for, given where its range ends.
 *
 * A range that is still open changes by the second. One that closed a while ago
 * barely moves, but it does move — delivery and read receipts keep arriving for a
 * day or two, and a conversation opened yesterday can get its first reply today —
 * so only a range that closed more than two days ago is held for hours.
 */
export function analyticsTtlSeconds(
  rangeEnd: Date | null | undefined,
  liveness: AnalyticsLiveness,
  now: Date = new Date(),
): number {
  const live = LIVE_TTL_SECONDS[liveness];
  if (!rangeEnd || Number.isNaN(rangeEnd.getTime())) return live;
  const closedForMs = now.getTime() - rangeEnd.getTime();
  if (closedForMs > 48 * HOUR_MS) return 6 * 60 * 60;
  if (closedForMs > 2 * HOUR_MS) return 10 * 60;
  return live;
}

/** Both ends of a `"<start>,<end>"` query value, or nothing if it is not one. */
export function parseDateRangeParam(dateRange: string | undefined): [string, string] | undefined {
  const parts = dateRange?.split(",") ?? [];
  return parts.length === 2 ? [parts[0], parts[1]] : undefined;
}

/**
 * A range as it should appear in a cache key: start rounded down and end rounded
 * up to the minute, so two requests a few seconds apart for "the last 7 days"
 * share an entry. Only the key is rounded — the query still gets the exact range.
 */
export function normalizeRangeForKey(
  dateRange: readonly string[] | undefined,
): [string, string] | null {
  if (dateRange?.length !== 2) return null;
  const start = new Date(dateRange[0]).getTime();
  const end = new Date(dateRange[1]).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return [
    new Date(Math.floor(start / MINUTE_MS) * MINUTE_MS).toISOString(),
    new Date(Math.ceil(end / MINUTE_MS) * MINUTE_MS).toISOString(),
  ];
}

/** Where a range ends, for picking a TTL. No range means "up to now". */
function rangeEndOf(dateRange: readonly string[] | undefined): Date | null {
  if (dateRange?.length !== 2) return null;
  const end = new Date(dateRange[1]);
  if (Number.isNaN(end.getTime())) return null;
  // A bare date means the whole of that day, so it has not closed until the day has.
  if (DATE_ONLY.test(dateRange[1].trim())) end.setUTCHours(23, 59, 59, 999);
  return end;
}

/**
 * The team an analytics request is scoped to, or null for every team. "all", "null"
 * and an empty value all mean every team, matching `isEveryTeam` in apiAnalytics.
 */
export function analyticsTeamId(teamId: string | null | undefined): string | null {
  return !teamId || teamId === "all" || teamId === "null" ? null : teamId;
}

/** True when the caller asked for numbers straight from the database. */
export function wantsFresh(query: unknown): boolean {
  const fresh = (query as { fresh?: unknown } | null | undefined)?.fresh;
  return fresh === "1" || fresh === "true" || fresh === true;
}

export interface CachedAnalyticsOptions {
  orgId: string;
  /** Names the endpoint within the org's keys, e.g. `"conversation:overview"`. */
  endpoint: string;
  /** Everything besides the range that changes the answer. */
  params?: Record<string, unknown>;
  /** The exact range the query will run with, if it takes one. */
  dateRange?: readonly string[];
  liveness: AnalyticsLiveness;
  /** The request's query, read for the `fresh` flag. */
  query?: unknown;
}

/**
 * Serves one analytics endpoint through the cache.
 *
 * A request without a usable range falls back to "the last N days up to now" inside
 * the service, so it is keyed on the minute it was asked in: requests in the same
 * minute share an entry and the next minute starts a new one.
 */
export function cachedAnalytics<T>(options: CachedAnalyticsOptions, load: () => Promise<T>) {
  const { orgId, endpoint, params = {}, dateRange, liveness, query } = options;
  // A range that is there but unusable (one end, or not a date) is kept in the key
  // as written: whatever the service makes of it, it must not share an entry with
  // a request that sent no range at all.
  const unusable = dateRange?.length ? `${dateRange.join(",")}|` : "";
  const range =
    normalizeRangeForKey(dateRange) ??
    `${unusable}open@${new Date(Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS).toISOString()}`;
  const key = cacheKeyFor(NAMESPACE, orgId, endpoint, { ...params, range });
  const ttl = analyticsTtlSeconds(rangeEndOf(dateRange), liveness);
  return withCache(key, ttl, load, { bypass: wantsFresh(query) });
}
