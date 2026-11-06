import { Prisma } from "../../../generated/prisma/client.js";
import { cacheKeyFor, withCache } from "../../../utils/cache.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { getInstagramChannel } from "../metaChannel/metaChannel.service.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { getInstagramMediaPosts, type InstagramMediaItem } from "./instagram_messaging.service.js";

/**
 * Instagram analytics: account and per-post insights read from the Graph API, joined with
 * what the post did inside RateUp (comments, DMs, leads, orders).
 *
 * Metric set (2025–2026, Instagram Platform insights reference):
 * - account `GET /{ig-user-id}/insights`: `views`, `total_interactions`, `accounts_engaged`
 *   are `metric_type=total_value` only; `reach` takes `total_value` and `time_series`;
 *   `follows_and_unfollows` (total_value, `breakdown=follow_type`, not returned under 100
 *   followers) gives follows/unfollows; the follower total is the `followers_count` field.
 *   `follower_count` left the metrics table and is not used. `impressions`
 *   and `plays` are deprecated and never requested.
 * - media `GET /{media-id}/insights`: FEED and REELS take `views, reach, saved, shares,
 *   reposts, total_interactions`; STORY takes `views, reach, shares, replies,
 *   total_interactions, link_clicks` (Facebook Login only in practice). Graph rejects the
 *   whole call when one metric does not fit the media type, so a refused call is retried
 *   metric by metric and the refused ones are reported as unavailable.
 *
 * Needs `instagram_manage_insights` (app review). Without it Graph answers code 10 / 2xx,
 * which {@link isPermissionError} recognises; the controller answers it with a reconnect hint.
 *
 * Every Graph call goes through {@link graphGet}, so routing it to graph.instagram.com
 * for Instagram-Login channels is a one-function change.
 */

export const INSIGHTS_RANGES = ["7d", "30d", "90d"] as const;
export type InsightsRange = (typeof INSIGHTS_RANGES)[number];

const RANGE_DAYS: Record<InsightsRange, number> = { "7d": 7, "30d": 30, "90d": 90 };
const DAY_MS = 24 * 60 * 60 * 1000;
/** Graph refuses an insights window longer than 30 days. */
const MAX_WINDOW_DAYS = 30;
const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_NAMESPACE = "instagram-insights:v1";
/** Media insight calls in flight at once; 50 posts is ~100 calls on a cold cache. */
const MEDIA_CONCURRENCY = 5;
/** An order counts for a post when placed within this long after the DM it started. */
export const ORDER_ATTRIBUTION_DAYS = 30;

const ACCOUNT_TOTAL_METRICS = ["views", "reach", "total_interactions", "accounts_engaged"] as const;
type AccountTotalMetric = (typeof ACCOUNT_TOTAL_METRICS)[number];

const FEED_METRICS = ["views", "reach", "saved", "shares", "reposts", "total_interactions"];
const STORY_METRICS = ["views", "reach", "shares", "replies", "total_interactions", "link_clicks"];

export class InstagramChannelNotFoundError extends Error {
  constructor() {
    super("Instagram account is not connected");
    this.name = "InstagramChannelNotFoundError";
  }
}

// ── Graph access ────────────────────────────────────────────────────────────

interface InsightsChannel {
  ibaId: string;
  token: string;
}

async function resolveChannel(ibaId: string, orgId: string): Promise<InsightsChannel> {
  const channel = await getInstagramChannel(ibaId, orgId);
  if (!channel || channel.orgId !== orgId || !channel.pageAccessToken) {
    throw new InstagramChannelNotFoundError();
  }
  return { ibaId, token: channel.pageAccessToken };
}

/** The one place insights talk to Graph. */
async function graphGet<T>(channel: InsightsChannel, path: string): Promise<T> {
  const response = await callMetaApi(path, "GET", channel.token);
  return response.data as T;
}

/** Code 10 / 200–299 are permission refusals; 190 is a dead token. Both need a reconnect. */
export function isPermissionError(error: unknown): boolean {
  if (!(error instanceof GraphApiError)) return false;
  const code = error.error?.code;
  return code === 10 || code === 190 || (code >= 200 && code < 300);
}

// ── Pure helpers ────────────────────────────────────────────────────────────

export interface TimeWindow {
  since: Date;
  until: Date;
}

export function rangeWindow(range: InsightsRange, now: Date = new Date()): TimeWindow {
  return { since: new Date(now.getTime() - RANGE_DAYS[range] * DAY_MS), until: now };
}

/** Splits a window into consecutive pieces of at most `maxDays`, oldest first. */
export function chunkWindow(window: TimeWindow, maxDays = MAX_WINDOW_DAYS): TimeWindow[] {
  const chunks: TimeWindow[] = [];
  const step = maxDays * DAY_MS;
  for (let start = window.since.getTime(); start < window.until.getTime(); start += step) {
    chunks.push({
      since: new Date(start),
      until: new Date(Math.min(start + step, window.until.getTime())),
    });
  }
  return chunks;
}

const unix = (date: Date) => Math.floor(date.getTime() / 1000);

interface GraphInsightValue {
  value?: number | Record<string, number>;
  end_time?: string;
}

interface GraphInsight {
  name: string;
  total_value?: {
    value?: number;
    breakdowns?: { results?: { dimension_values?: string[]; value?: number }[] }[];
  };
  values?: GraphInsightValue[];
}

interface GraphInsightsResponse {
  data?: GraphInsight[];
}

/** A metric's single number: `total_value` on the new shape, the first value on the old. */
export function insightNumber(insight: GraphInsight | undefined): number | null {
  if (!insight) return null;
  const total = insight.total_value?.value;
  if (typeof total === "number") return total;
  const first = insight.values?.[0]?.value;
  return typeof first === "number" ? first : null;
}

/**
 * `follows_and_unfollows` by `follow_type`: FOLLOWER are follows, NON_FOLLOWER unfollows.
 * Breakdown results sit under `total_value.breakdowns[0].results`.
 */
export function followSplit(insight: GraphInsight | undefined): {
  follows: number | null;
  unfollows: number | null;
} {
  const results = insight?.total_value?.breakdowns?.[0]?.results ?? [];
  const valueOf = (type: string) => {
    const hit = results.find((result) => result.dimension_values?.[0] === type);
    return typeof hit?.value === "number" ? hit.value : null;
  };
  return { follows: valueOf("FOLLOWER"), unfollows: valueOf("NON_FOLLOWER") };
}

export function metricsForProductType(productType: string | undefined): string[] {
  return productType === "STORY" ? STORY_METRICS : FEED_METRICS;
}

/** Day key (YYYY-MM-DD) of a time-series point. Graph's end_time is the end of the day, PT. */
function dayKey(endTime: string): string {
  return new Date(new Date(endTime).getTime() - DAY_MS / 2).toISOString().slice(0, 10);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = Array.from({ length: items.length });
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Asks for several metrics in one call; when Graph refuses the set, asks for each alone so
 * one metric that does not apply cannot hide the rest. Permission refusals are rethrown.
 */
async function fetchMetrics(
  channel: InsightsChannel,
  basePath: string,
  metrics: readonly string[],
  query: string,
): Promise<{ insights: GraphInsight[]; unavailable: string[] }> {
  const path = (list: readonly string[]) => `${basePath}?metric=${list.join(",")}${query}`;
  try {
    const response = await graphGet<GraphInsightsResponse>(channel, path(metrics));
    return { insights: response.data ?? [], unavailable: [] };
  } catch (error) {
    if (isPermissionError(error) || metrics.length === 1) throw error;
  }
  const insights: GraphInsight[] = [];
  const unavailable: string[] = [];
  for (const metric of metrics) {
    try {
      const response = await graphGet<GraphInsightsResponse>(channel, path([metric]));
      insights.push(...(response.data ?? []));
    } catch (error) {
      if (isPermissionError(error)) throw error;
      unavailable.push(metric);
    }
  }
  return { insights, unavailable };
}

// ── Account insights ────────────────────────────────────────────────────────

export interface InstagramAccountInsights {
  range: InsightsRange;
  since: string;
  until: string;
  /**
   * Sums over the range. Over 90 days `reach` is the sum of three 30-day reaches, so a person
   * reached in two of them counts twice — Graph has no unique reach past 30 days.
   */
  totals: Record<"views" | "reach" | "totalInteractions" | "accountsEngaged", number | null>;
  followers: {
    /** Followers now. */
    count: number | null;
    /** Follows and unfollows over the range (`follows_and_unfollows`). */
    gained: number | null;
    lost: number | null;
  };
  daily: { date: string; reach: number | null }[];
  /** Metrics Graph refused for this account. */
  unavailable: string[];
}

const TOTAL_KEYS: Record<AccountTotalMetric, keyof InstagramAccountInsights["totals"]> = {
  views: "views",
  reach: "reach",
  total_interactions: "totalInteractions",
  accounts_engaged: "accountsEngaged",
};

async function loadAccountInsights(
  channel: InsightsChannel,
  range: InsightsRange,
): Promise<InstagramAccountInsights> {
  const window = rangeWindow(range);
  const chunks = chunkWindow(window);
  const base = `/${channel.ibaId}/insights`;
  const totals: InstagramAccountInsights["totals"] = {
    views: null,
    reach: null,
    totalInteractions: null,
    accountsEngaged: null,
  };
  const unavailable = new Set<string>();
  const daily = new Map<string, number>();
  let gained: number | null = null;
  let lost: number | null = null;

  for (const chunk of chunks) {
    const span = `&period=day&since=${unix(chunk.since)}&until=${unix(chunk.until)}`;
    const [sums, series] = await Promise.all([
      fetchMetrics(channel, base, ACCOUNT_TOTAL_METRICS, `${span}&metric_type=total_value`),
      fetchMetrics(channel, base, ["reach"], `${span}&metric_type=time_series`).catch((error) => {
        if (isPermissionError(error)) throw error;
        return { insights: [], unavailable: ["reach_daily"] };
      }),
    ]);
    sums.unavailable.forEach((metric) => unavailable.add(metric));
    series.unavailable.forEach((metric) => unavailable.add(metric));
    for (const insight of sums.insights) {
      const key = TOTAL_KEYS[insight.name as AccountTotalMetric];
      const value = insightNumber(insight);
      if (key && value !== null) totals[key] = (totals[key] ?? 0) + value;
    }
    for (const point of series.insights.find((i) => i.name === "reach")?.values ?? []) {
      if (point.end_time && typeof point.value === "number") {
        daily.set(dayKey(point.end_time), point.value);
      }
    }
    try {
      const follows = await graphGet<GraphInsightsResponse>(
        channel,
        `${base}?metric=follows_and_unfollows${span}&metric_type=total_value&breakdown=follow_type`,
      );
      const split = followSplit(follows.data?.[0]);
      if (split.follows !== null) gained = (gained ?? 0) + split.follows;
      if (split.unfollows !== null) lost = (lost ?? 0) + split.unfollows;
    } catch (error) {
      if (isPermissionError(error)) throw error;
      unavailable.add("follows_and_unfollows");
    }
  }

  let count: number | null = null;
  try {
    const profile = await graphGet<{ followers_count?: number }>(
      channel,
      `/${channel.ibaId}?fields=followers_count`,
    );
    count = typeof profile.followers_count === "number" ? profile.followers_count : null;
  } catch (error) {
    if (isPermissionError(error)) throw error;
    unavailable.add("followers_count");
  }

  return {
    range,
    since: window.since.toISOString(),
    until: window.until.toISOString(),
    totals,
    followers: { count, gained, lost },
    daily: [...daily.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, reach]) => ({ date, reach })),
    unavailable: [...unavailable],
  };
}

export async function getAccountInsights(
  ibaId: string,
  orgId: string,
  range: InsightsRange,
  options: { fresh?: boolean } = {},
): Promise<InstagramAccountInsights> {
  const channel = await resolveChannel(ibaId, orgId);
  const key = cacheKeyFor(CACHE_NAMESPACE, orgId, "account", { ibaId, range });
  return withCache(key, CACHE_TTL_SECONDS, () => loadAccountInsights(channel, range), {
    bypass: options.fresh,
  });
}

// ── Media insights ──────────────────────────────────────────────────────────

export interface InstagramMediaInsights {
  mediaId: string;
  productType: string | null;
  likes: number | null;
  comments: number | null;
  views: number | null;
  reach: number | null;
  saved: number | null;
  shares: number | null;
  reposts: number | null;
  totalInteractions: number | null;
  /** Stories only. */
  replies: number | null;
  linkClicks: number | null;
  unavailable: string[];
  /** Set when Graph refused the media outright (deleted, too old, not ours). */
  error?: "permission" | "unavailable";
}

type MediaMetricKey =
  | "views"
  | "reach"
  | "saved"
  | "shares"
  | "reposts"
  | "totalInteractions"
  | "replies"
  | "linkClicks";

const MEDIA_METRIC_KEYS: Record<string, MediaMetricKey> = {
  views: "views",
  reach: "reach",
  saved: "saved",
  shares: "shares",
  reposts: "reposts",
  total_interactions: "totalInteractions",
  replies: "replies",
  link_clicks: "linkClicks",
};

function emptyMedia(mediaId: string): InstagramMediaInsights {
  return {
    mediaId,
    productType: null,
    likes: null,
    comments: null,
    views: null,
    reach: null,
    saved: null,
    shares: null,
    reposts: null,
    totalInteractions: null,
    replies: null,
    linkClicks: null,
    unavailable: [],
  };
}

async function loadMediaInsights(
  channel: InsightsChannel,
  mediaId: string,
): Promise<InstagramMediaInsights> {
  const result = emptyMedia(mediaId);
  try {
    const fields = await graphGet<{
      media_product_type?: string;
      like_count?: number;
      comments_count?: number;
    }>(channel, `/${mediaId}?fields=media_product_type,like_count,comments_count`);
    result.productType = fields.media_product_type ?? null;
    result.likes = fields.like_count ?? null;
    result.comments = fields.comments_count ?? null;

    const { insights, unavailable } = await fetchMetrics(
      channel,
      `/${mediaId}/insights`,
      metricsForProductType(fields.media_product_type),
      "",
    );
    result.unavailable = unavailable;
    for (const insight of insights) {
      const key = MEDIA_METRIC_KEYS[insight.name];
      if (key) result[key] = insightNumber(insight);
    }
  } catch (error) {
    // A story with values under 5 answers code 10 too, which is not a missing permission.
    result.error =
      isPermissionError(error) && result.productType !== "STORY" ? "permission" : "unavailable";
    log.warn({ err: error, mediaId }, "[Instagram Insights] Media insights unavailable");
  }
  return result;
}

class MediaInsightsRefused extends Error {
  constructor(readonly insights: InstagramMediaInsights) {
    super("Media insights refused");
  }
}

/** Lifetime insights for each media id, one Redis entry per media for an hour. */
export async function getMediaInsights(
  ibaId: string,
  orgId: string,
  mediaIds: string[],
  options: { fresh?: boolean } = {},
): Promise<InstagramMediaInsights[]> {
  const channel = await resolveChannel(ibaId, orgId);
  return mapLimit(mediaIds, MEDIA_CONCURRENCY, async (mediaId) => {
    const key = cacheKeyFor(CACHE_NAMESPACE, orgId, "media", { ibaId, mediaId });
    const insights = await withCache(
      key,
      CACHE_TTL_SECONDS,
      async () => {
        const loaded = await loadMediaInsights(channel, mediaId);
        // A refusal is not worth an hour in the cache: reconnecting should show numbers at once.
        if (loaded.error) throw new MediaInsightsRefused(loaded);
        return loaded;
      },
      { bypass: options.fresh },
    ).catch((error: unknown) => {
      if (error instanceof MediaInsightsRefused) return error.insights;
      throw error;
    });
    return insights;
  });
}

// ── Attribution ─────────────────────────────────────────────────────────────

export interface InstagramPostAttribution {
  mediaId: string;
  /** Comments received on the post in the range (stored as `ig_comment_<id>` messages). */
  comments: number;
  /** Of those, comments a private reply was sent to (automation or agent). */
  commentsAnswered: number;
  /** Conversations opened from the post's comment automation (`Conversation.sourceMediaId`). */
  dmsStarted: number;
  /** Leads created for those conversations' contacts after the conversation started. */
  leads: number;
  orders: number;
  revenue: { currency: string; amount: number }[];
}

interface AttributionRow {
  mediaId: string;
  comments: number;
  commentsAnswered: number;
  dmsStarted: number;
  leads: number;
}

interface OrderRow {
  mediaId: string;
  orders: number;
  currency: string;
  /** Postgres numeric: Prisma hands back a Decimal. */
  amount: unknown;
}

/**
 * What each post did inside RateUp over the window. Scoped by `Conversation.orgId` and
 * `Contact.orgId` (WaMessage has no org of its own).
 *
 * Orders are attributed to a post when either
 *  - the order's own `attribution.mediaId` names it (set by the checkout for `ig_comment`
 *    starts), or
 *  - the order belongs to the contact of a conversation the post started, was created at or
 *    after that conversation's start and within {@link ORDER_ATTRIBUTION_DAYS} days of it.
 * An order matching both ways counts once. Drafts and cancelled orders are left out; the
 * order date window is the range for direct attribution, and the conversation's for the
 * contact match.
 *
 * "Answered" counts only private replies, which are stored as outbound messages addressed
 * to `recipient.comment_id`; public replies under the post are not stored.
 */
export async function getPostAttribution(
  ibaId: string,
  orgId: string,
  mediaIds: string[],
  window: TimeWindow,
): Promise<InstagramPostAttribution[]> {
  if (mediaIds.length === 0) return [];
  const ids = Prisma.sql`${mediaIds}::text[]`;
  const { since, until } = window;

  const [rows, orderRows] = await Promise.all([
    prisma.$queryRaw<AttributionRow[]>(Prisma.sql`
      WITH ids AS (SELECT unnest(${ids}) AS "mediaId"),
      comments AS (
        SELECT m."messageBody" #>> '{receive,message,media_id}' AS "mediaId",
               COUNT(*)::INTEGER AS "comments",
               COUNT(*) FILTER (WHERE EXISTS (
                 SELECT 1 FROM "WaMessage" r
                 WHERE r."contactId" = m."contactId"
                   AND r."sourceIdentifier" = ${ibaId}
                   AND r."messageBody" #>> '{send,recipient,comment_id}'
                       = m."messageBody" #>> '{receive,message,comment_id}'
               ))::INTEGER AS "commentsAnswered"
        FROM "WaMessage" m
        JOIN "Contact" c ON c.id = m."contactId" AND c."orgId" = ${orgId}::uuid
        WHERE m."sourceIdentifier" = ${ibaId}
          AND m."sourcePlatform" = 'INSTAGRAM'
          AND m."messageId" LIKE 'ig\\_comment\\_%'
          AND m."createdAt" >= ${since} AND m."createdAt" < ${until}
          AND m."messageBody" #>> '{receive,message,media_id}' = ANY(${ids})
        GROUP BY 1
      ),
      convs AS (
        SELECT cv."sourceMediaId" AS "mediaId", cv.id, cv."contactId", cv."createdAt"
        FROM "Conversation" cv
        WHERE cv."orgId" = ${orgId}::uuid
          AND cv."sourceMediaId" = ANY(${ids})
          AND cv."createdAt" >= ${since} AND cv."createdAt" < ${until}
      ),
      dms AS (
        SELECT "mediaId", COUNT(*)::INTEGER AS "dmsStarted" FROM convs GROUP BY 1
      ),
      leads AS (
        SELECT cv."mediaId", COUNT(DISTINCT l.id)::INTEGER AS "leads"
        FROM convs cv
        JOIN "Lead" l ON l."contactId" = cv."contactId" AND l."createdAt" >= cv."createdAt"
        GROUP BY 1
      )
      SELECT ids."mediaId",
             COALESCE(comments."comments", 0) AS "comments",
             COALESCE(comments."commentsAnswered", 0) AS "commentsAnswered",
             COALESCE(dms."dmsStarted", 0) AS "dmsStarted",
             COALESCE(leads."leads", 0) AS "leads"
      FROM ids
      LEFT JOIN comments USING ("mediaId")
      LEFT JOIN dms USING ("mediaId")
      LEFT JOIN leads USING ("mediaId")
    `),
    prisma.$queryRaw<OrderRow[]>(Prisma.sql`
      WITH matched AS (
        SELECT cv."sourceMediaId" AS "mediaId", o.id, o.currency, o.total
        FROM "Conversation" cv
        JOIN "ShopOrder" o
          ON o."contactId" = cv."contactId"
         AND o."orgId" = ${orgId}::uuid
         AND o."createdAt" >= cv."createdAt"
         AND o."createdAt" < cv."createdAt" + ${Prisma.raw(`INTERVAL '${ORDER_ATTRIBUTION_DAYS} days'`)}
        WHERE cv."orgId" = ${orgId}::uuid
          AND cv."sourceMediaId" = ANY(${ids})
          AND cv."createdAt" >= ${since} AND cv."createdAt" < ${until}
          AND o.status IN ('OPEN', 'COMPLETED')
        UNION
        SELECT o.attribution ->> 'mediaId', o.id, o.currency, o.total
        FROM "ShopOrder" o
        WHERE o."orgId" = ${orgId}::uuid
          AND o.attribution ->> 'mediaId' = ANY(${ids})
          AND o."createdAt" >= ${since} AND o."createdAt" < ${until}
          AND o.status IN ('OPEN', 'COMPLETED')
      )
      SELECT "mediaId", currency, COUNT(*)::INTEGER AS "orders", SUM(total) AS "amount"
      FROM matched
      GROUP BY 1, 2
    `),
  ]);

  const orders = new Map<
    string,
    { orders: number; revenue: { currency: string; amount: number }[] }
  >();
  for (const row of orderRows) {
    const entry = orders.get(row.mediaId) ?? { orders: 0, revenue: [] };
    entry.orders += row.orders;
    entry.revenue.push({ currency: row.currency, amount: Number(String(row.amount)) });
    orders.set(row.mediaId, entry);
  }

  return rows.map((row) => ({
    ...row,
    orders: orders.get(row.mediaId)?.orders ?? 0,
    revenue: orders.get(row.mediaId)?.revenue ?? [],
  }));
}

// ── Posts report ────────────────────────────────────────────────────────────

export interface InstagramPostReport {
  id: string;
  caption: string | null;
  mediaType: InstagramMediaItem["media_type"];
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string;
  insights: InstagramMediaInsights;
  attribution: InstagramPostAttribution;
}

export interface InstagramPostsReport {
  range: InsightsRange;
  posts: InstagramPostReport[];
  /** True when Graph refused every post for lack of permission: the account needs a reconnect. */
  needsReconnect: boolean;
}

/**
 * The account's latest posts (up to 50) with lifetime insights and in-range attribution,
 * ranked by DMs started, then orders, then views.
 */
export async function getPostsReport(
  ibaId: string,
  orgId: string,
  range: InsightsRange,
  options: { fresh?: boolean } = {},
): Promise<InstagramPostsReport> {
  await resolveChannel(ibaId, orgId);
  const listKey = cacheKeyFor(CACHE_NAMESPACE, orgId, "media-list", { ibaId });
  const media = await withCache(listKey, CACHE_TTL_SECONDS, () => getInstagramMediaPosts(ibaId), {
    bypass: options.fresh,
  });
  const mediaIds = media.map((item) => item.id);
  const [insights, attribution] = await Promise.all([
    getMediaInsights(ibaId, orgId, mediaIds, options),
    getPostAttribution(ibaId, orgId, mediaIds, rangeWindow(range)),
  ]);
  const insightsById = new Map(insights.map((item) => [item.mediaId, item]));
  const attributionById = new Map(attribution.map((item) => [item.mediaId, item]));

  const posts = media.map((item): InstagramPostReport => ({
    id: item.id,
    caption: item.caption ?? null,
    mediaType: item.media_type,
    thumbnailUrl: item.thumbnail_url ?? item.media_url ?? null,
    permalink: item.permalink ?? null,
    timestamp: item.timestamp,
    insights: insightsById.get(item.id) ?? emptyMedia(item.id),
    attribution: attributionById.get(item.id) ?? {
      mediaId: item.id,
      comments: 0,
      commentsAnswered: 0,
      dmsStarted: 0,
      leads: 0,
      orders: 0,
      revenue: [],
    },
  }));
  posts.sort(
    (a, b) =>
      b.attribution.dmsStarted - a.attribution.dmsStarted ||
      b.attribution.orders - a.attribution.orders ||
      (b.insights.views ?? 0) - (a.insights.views ?? 0),
  );

  return {
    range,
    posts,
    needsReconnect: insights.length > 0 && insights.every((item) => item.error === "permission"),
  };
}
