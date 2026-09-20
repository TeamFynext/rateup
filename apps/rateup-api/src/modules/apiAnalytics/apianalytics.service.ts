import { Prisma } from "../../../generated/prisma/client.js";
import { WaTemplateCategory } from "../../types/enums.js";
import prisma from "../../utils/prisma.js";

export interface WaMessageOverview {
  totalMessages: number;
  totalMessagesChange: number;
  deliveredMessages: number;
  deliveredPercentage: number;
  failedMessages: number;
  failedPercentage: number;
  avgDeliveryTimeSeconds: number | null;
  avgDeliveryTimeChange: number | null;
}

export interface MessageDeliveryTrendPoint {
  time: string;
  totalMessages: number;
  deliveredMessages: number;
  failedMessages: number;
}

interface TemplateCategoryStat {
  category: string;
  count: number;
  percentage: number;
}

export interface TemplateCategoryOverview {
  totalTemplates: number;
  byCategory: TemplateCategoryStat[];
}

export interface TemplatePerformanceStat {
  templateName: string;
  templateCategory: string;
  totalSent: number;
  deliveredCount: number;
  failedCount: number;
  successPercentage: number;
  failurePercentage: number;
  avgDeliveryTimeSeconds: number | null;
  lastUsed: string | null;
}

export interface TeamPerformanceStat {
  teamId: string;
  teamName: string;
  teamColor: string;
  totalSent: number;
  deliveredCount: number;
  failedCount: number;
  successPercentage: number;
}

const DEFAULT_RANGE_DAYS = 7;

/** A calendar date carrying no time. `new Date` reads these as UTC midnight. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function resolveDateRange(dateRange: string[] | null | undefined): {
  rangeStart: Date;
  rangeEnd: Date;
} {
  if (dateRange?.length === 2) {
    const rangeStart = new Date(dateRange[0]);
    const rangeEnd = endOfDayIfDateOnly(dateRange[1]);
    if (!Number.isNaN(rangeStart.getTime()) && !Number.isNaN(rangeEnd.getTime())) {
      return { rangeStart, rangeEnd };
    }
  }

  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd);
  rangeStart.setDate(rangeEnd.getDate() - (DEFAULT_RANGE_DAYS - 1));
  return { rangeStart, rangeEnd };
}

function endOfDayIfDateOnly(value: string): Date {
  const parsed = new Date(value);
  if (DATE_ONLY.test(value.trim())) parsed.setUTCHours(23, 59, 59, 999);
  return parsed;
}

/** "all", "null", and absent all mean every team. */
export function isEveryTeam(teamId: string | null | undefined): boolean {
  return !teamId || teamId === "all" || teamId === "null";
}

export function teamFilterFor(teamId: string | null | undefined) {
  return isEveryTeam(teamId) ? Prisma.sql`` : Prisma.sql`AND motm."teamId" = ${teamId}::uuid`;
}

/**
 * How long after a message row the `WaMessageOrgTeamMap` row for it may be written.
 *
 * The map row has exactly one writer: `createWaMessageOrgTeamMap`, called straight
 * after `waMessage.create` in `handleWaMessages`, which every send path — the API's
 * and the campaign workers' — goes through. Both `createdAt`s are database `now()`
 * defaults, so in practice the gap is milliseconds and the map row is never the
 * earlier of the two. An hour is slack, not a measurement. If a second writer ever
 * inserts map rows late (a backfill, say), widen this or those rows drop out of the
 * analytics.
 */
const MAP_ROW_WRITE_PAD_MS = 60 * 60 * 1000;

/**
 * The date predicate every message-analytics query uses.
 *
 * `WaMessage` has no org column, so the org's rows are found through
 * `WaMessageOrgTeamMap`. Filtering only on `wm."createdAt"` made Postgres walk every
 * map row the org ever produced and probe `WaMessage` for each one. The first
 * predicate lets the `(orgId[, teamId], createdAt)` index pick the range; the second
 * is the exact one and keeps the numbers what they always were.
 *
 * The exact bounds are spliced last so they stay the final two bound values.
 */
export function dateFilterFor(start: Date, end: Date) {
  const paddedEnd = new Date(end.getTime() + MAP_ROW_WRITE_PAD_MS);
  return Prisma.sql`AND motm."createdAt" BETWEEN ${start} AND ${paddedEnd}
        AND wm."createdAt" BETWEEN ${start} AND ${end}`;
}

export function apiTypeFilterFor(apiType: string | null | undefined) {
  if (apiType === "external") return Prisma.sql`AND motm."externalApi" = true`;
  if (apiType === "whatsapp") return Prisma.sql`AND motm."externalApi" = false`;
  return Prisma.sql``;
}

export function roundSeconds(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value.toFixed(2));
}

export async function getWaMessageOverview(
  orgId: string,
  teamId: string | undefined,
  dateRange: string[] | null | undefined,
  apiType: string | undefined,
): Promise<WaMessageOverview> {
  const { rangeStart, rangeEnd } = resolveDateRange(dateRange);

  //Calculate previous period
  const diffMs = rangeEnd.getTime() - rangeStart.getTime();
  const prevEnd = new Date(rangeStart.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diffMs);

  const teamFilter = teamFilterFor(teamId);
  const apiTypeFilter = apiTypeFilterFor(apiType);

  const query = async (start: Date, end: Date) =>
    prisma.$queryRaw<DeliveryStatsRow[]>`
      SELECT
        COUNT(*)::INT AS total_messages,

        COUNT(*) FILTER (
          WHERE wm.stats ? 'delivered'
            AND wm.stats->>'delivered' <> ''
        )::INT AS delivered_messages,

        COUNT(*) FILTER (
          WHERE wm.stats ? 'failed'
            AND wm.stats->>'failed' <> ''
        )::INT AS failed_messages,

        AVG(
          EXTRACT(
            EPOCH FROM (
              (wm.stats->>'delivered')::timestamptz - (wm.stats->>'sent')::timestamptz
            )
          )
        ) FILTER (
          WHERE wm.stats ? 'delivered'
            AND wm.stats->>'delivered' <> ''
        ) AS avg_delivery_time_seconds

      FROM "WaMessageOrgTeamMap" motm
      JOIN "WaMessage" wm ON wm.id = motm."messageId"
      WHERE motm."orgId" = ${orgId}::uuid
      ${teamFilter}
      ${apiTypeFilter}
      ${dateFilterFor(start, end)}
    `;

  const [currentRes, prevRes] = await Promise.all([
    query(rangeStart, rangeEnd),
    query(prevStart, prevEnd),
  ]);

  const emptyRow: DeliveryStatsRow = {
    total_messages: 0,
    delivered_messages: 0,
    failed_messages: 0,
    avg_delivery_time_seconds: null,
  };

  return shapeWaMessageOverview(currentRes[0] ?? emptyRow, prevRes[0] ?? emptyRow);
}

/** One period's delivery counters, as the overview query returns them. */
export interface DeliveryStatsRow {
  total_messages: number;
  delivered_messages: number;
  failed_messages: number;
  avg_delivery_time_seconds: number | null;
}

/** Turns this period's counters and the previous period's into the overview cards. */
export function shapeWaMessageOverview(
  current: DeliveryStatsRow,
  previous: DeliveryStatsRow,
): WaMessageOverview {
  const totalMessages = current.total_messages ?? 0;
  const deliveredMessages = current.delivered_messages ?? 0;
  const failedMessages = current.failed_messages ?? 0;
  const avgDeliveryTime = current.avg_delivery_time_seconds ?? null;

  const deliveredPercentage =
    totalMessages === 0 ? 0 : Number(((deliveredMessages / totalMessages) * 100).toFixed(2));

  const failedPercentage =
    totalMessages === 0 ? 0 : Number(((failedMessages / totalMessages) * 100).toFixed(2));

  return {
    totalMessages,
    totalMessagesChange: percentChange(totalMessages, previous.total_messages),

    deliveredMessages,
    deliveredPercentage,

    failedMessages,
    failedPercentage,

    avgDeliveryTimeSeconds: roundSeconds(avgDeliveryTime),
    avgDeliveryTimeChange: percentChange(avgDeliveryTime, previous.avg_delivery_time_seconds),
  };
}

export async function getDeliveredFailedTrend(
  orgId: string,
  teamId: string,
  granularity: "day" | "hour",
  dateRange: string[] | null | undefined,
  apiType: string,
): Promise<MessageDeliveryTrendPoint[]> {
  const { rangeStart, rangeEnd } = resolveDateRange(dateRange);

  const timeBucket =
    granularity === "hour"
      ? Prisma.sql`DATE_TRUNC('hour', wm."createdAt")`
      : Prisma.sql`DATE_TRUNC('day', wm."createdAt")`;

  const teamFilter = teamFilterFor(teamId);
  const apiTypeFilter = apiTypeFilterFor(apiType);

  const result = await prisma.$queryRaw<
    {
      time_bucket: Date;
      total_messages: number;
      delivered_messages: number;
      failed_messages: number;
    }[]
  >`
    SELECT
      ${timeBucket} AS time_bucket,

      COUNT(*)::INT AS total_messages,

      COUNT(*) FILTER (
        WHERE wm.stats ? 'delivered'
          AND wm.stats->>'delivered' IS NOT NULL
          AND wm.stats->>'delivered' <> ''
      )::INT AS delivered_messages,

      COUNT(*) FILTER (
        WHERE wm.stats ? 'failed'
          AND wm.stats->>'failed' IS NOT NULL
          AND wm.stats->>'failed' <> ''
      )::INT AS failed_messages

    FROM "WaMessageOrgTeamMap" motm
    JOIN "WaMessage" wm ON wm.id = motm."messageId"

    WHERE motm."orgId" = ${orgId}::uuid
      ${teamFilter}
      ${apiTypeFilter}
      ${dateFilterFor(rangeStart, rangeEnd)}

    GROUP BY time_bucket
    ORDER BY time_bucket ASC
  `;

  return result.map((row) => ({
    time: row.time_bucket.toISOString(),
    totalMessages: row.total_messages,
    deliveredMessages: row.delivered_messages,
    failedMessages: row.failed_messages,
  }));
}

/** Ranges up to this long are charted by the hour; anything longer by the day. */
const HOURLY_TREND_MAX_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * The bucket size for the trend chart. A caller that names one gets it. One that
 * does not gets hours for a short range and days for a long one: thirty days by
 * the hour is 720 points, which no chart can show and which costs a far larger
 * GROUP BY for nothing.
 */
export function resolveTrendGranularity(
  requested: string | null | undefined,
  dateRange: string[] | null | undefined,
): "day" | "hour" {
  if (requested === "hour" || requested === "day") return requested;
  if (requested) return "day";
  const { rangeStart, rangeEnd } = resolveDateRange(dateRange);
  return rangeEnd.getTime() - rangeStart.getTime() <= HOURLY_TREND_MAX_MS ? "hour" : "day";
}

export async function getTemplateCategoryOverview(
  orgId: string,
  teamId: string, // "all" | uuid
  dateRange: string[] | null | undefined,
  apiType: string,
): Promise<TemplateCategoryOverview> {
  const { rangeStart, rangeEnd } = resolveDateRange(dateRange);
  const teamFilter = teamFilterFor(teamId);
  const apiTypeFilter = apiTypeFilterFor(apiType);

  const rows = await prisma.$queryRaw<
    {
      category: string;
      count: number;
    }[]
  >`
    SELECT
      wm."messageBody"->'send'->'template'->>'category' AS category,
      COUNT(*)::INT AS count
    FROM "WaMessageOrgTeamMap" motm
    JOIN "WaMessage" wm ON wm.id = motm."messageId"
    WHERE motm."orgId" = ${orgId}::uuid
      ${teamFilter}
      ${apiTypeFilter}
       AND motm."type" IN ('TEMPLATE', 'CAMPAIGN') 
      AND wm."messageBody"->>'exchangeProcess' = 'send'
      AND wm."messageBody"->'send'->>'type' = 'template'
      AND wm."messageBody"->'send'->'template'->>'category' IS NOT NULL
      ${dateFilterFor(rangeStart, rangeEnd)}
    GROUP BY category
  `;

  return shapeTemplateCategoryOverview(rows);
}

/** Per-category send counts, filled out to every known category, with shares. */
export function shapeTemplateCategoryOverview(
  rows: { category: string; count: number }[],
): TemplateCategoryOverview {
  const countMap = new Map<string, number>();
  let totalTemplates = 0;
  for (const r of rows) {
    countMap.set(r.category, (countMap.get(r.category) ?? 0) + r.count);
    totalTemplates += r.count;
  }

  const known = new Set<string>(Object.values(WaTemplateCategory));
  const categories = [
    ...Object.values(WaTemplateCategory),
    ...[...countMap.keys()].filter((category) => !known.has(category)),
  ];

  const byCategory = categories.map((category) => ({
    category,
    count: countMap.get(category) ?? 0,
  }));

  return {
    totalTemplates,
    byCategory: byCategory.map((r) => ({
      category: r.category,
      count: r.count,
      percentage: totalTemplates === 0 ? 0 : Number(((r.count / totalTemplates) * 100).toFixed(2)),
    })),
  };
}

export async function getTemplatePerformanceStats(
  orgId: string,
  teamId: string, // "all" | uuid
  dateRange: string[] | null | undefined,
  apiType: string,
): Promise<TemplatePerformanceStat[]> {
  const { rangeStart, rangeEnd } = resolveDateRange(dateRange);
  const teamFilter = teamFilterFor(teamId);
  const apiTypeFilter = apiTypeFilterFor(apiType);

  const rows = await prisma.$queryRaw<
    {
      template_name: string;
      template_category: string;
      total_sent: number;
      delivered_count: number;
      failed_count: number;
      avg_delivery_time_seconds: number | null;
      last_used: Date | null;
    }[]
  >`
    SELECT
      wm."messageBody"->'send'->'template'->>'name' AS template_name,
      wm."messageBody"->'send'->'template'->>'category' AS template_category,

      COUNT(*)::INT AS total_sent,

      COUNT(*) FILTER (
        WHERE wm.stats ? 'delivered'
          AND wm.stats->>'delivered' <> ''
      )::INT AS delivered_count,

      COUNT(*) FILTER (
        WHERE wm.stats ? 'failed'
          AND wm.stats->>'failed' <> ''
      )::INT AS failed_count,

      AVG(
        EXTRACT(
          EPOCH FROM (
            (wm.stats->>'delivered')::timestamptz - (wm.stats->>'sent')::timestamptz
          )
        )
      ) FILTER (
        WHERE wm.stats ? 'delivered'
          AND wm.stats->>'delivered' <> ''
      ) AS avg_delivery_time_seconds,

      MAX(wm."createdAt") as last_used 

    FROM "WaMessageOrgTeamMap" motm
    JOIN "WaMessage" wm ON wm.id = motm."messageId"

    WHERE motm."orgId" = ${orgId}::uuid
      ${teamFilter}
      ${apiTypeFilter}
       AND motm."type" IN ('TEMPLATE', 'CAMPAIGN') 
      AND wm."messageBody"->>'exchangeProcess' = 'send'
      AND wm."messageBody"->'send'->>'type' = 'template'
      AND wm."messageBody"->'send'->'template'->>'name' IS NOT NULL
      ${dateFilterFor(rangeStart, rangeEnd)}

    GROUP BY template_name, template_category
    ORDER BY total_sent DESC
  `;

  return rows.map(shapeTemplatePerformance);
}

/** One template's row of the performance table, as the query returns it. */
export interface TemplatePerformanceRow {
  template_name: string;
  template_category: string;
  total_sent: number;
  delivered_count: number;
  failed_count: number;
  avg_delivery_time_seconds: number | null;
  last_used: Date | null;
}

export function shapeTemplatePerformance(r: TemplatePerformanceRow): TemplatePerformanceStat {
  const successPercentage =
    r.total_sent === 0 ? 0 : Number(((r.delivered_count / r.total_sent) * 100).toFixed(2));

  const failurePercentage =
    r.total_sent === 0 ? 0 : Number(((r.failed_count / r.total_sent) * 100).toFixed(2));

  return {
    templateName: r.template_name,
    templateCategory: r.template_category,
    totalSent: r.total_sent,
    deliveredCount: r.delivered_count,
    failedCount: r.failed_count,
    successPercentage,
    failurePercentage,
    avgDeliveryTimeSeconds: roundSeconds(r.avg_delivery_time_seconds),
    lastUsed: r.last_used ? r.last_used.toISOString() : null,
  };
}

export async function getTeamPerformanceStats(
  orgId: string,
  dateRange: string[] | null | undefined,
  apiType: string,
): Promise<TeamPerformanceStat[]> {
  const { rangeStart, rangeEnd } = resolveDateRange(dateRange);
  const apiJoinFilter = apiTypeFilterFor(apiType);
  // See dateFilterFor. Here the range sits in the join conditions rather than the
  // WHERE, because a team with no sends in range must still be listed.
  const paddedEnd = new Date(rangeEnd.getTime() + MAP_ROW_WRITE_PAD_MS);

  const rows = await prisma.$queryRaw<
    {
      team_id: string;
      team_name: string;
      team_color: string;
      total_sent: number;
      delivered_count: number;
      failed_count: number;
    }[]
  >`
    SELECT
      t.id AS team_id,
      t.name AS team_name,
      t.color AS team_color,

      COUNT(wm.id)::INT AS total_sent,

      COUNT(wm.id) FILTER (
        WHERE wm.stats ? 'delivered'
          AND wm.stats->>'delivered' <> ''
      )::INT AS delivered_count,

      COUNT(wm.id) FILTER (
        WHERE wm.stats ? 'failed'
          AND wm.stats->>'failed' <> ''
      )::INT AS failed_count

    FROM "Team" t

    LEFT JOIN "WaMessageOrgTeamMap" motm
      ON motm."teamId" = t.id
      AND motm."orgId" = ${orgId}::uuid
      ${apiJoinFilter}
      AND motm."createdAt" BETWEEN ${rangeStart} AND ${paddedEnd}

    LEFT JOIN "WaMessage" wm
      ON wm.id = motm."messageId"
      AND wm."createdAt" BETWEEN ${rangeStart} AND ${rangeEnd}

    WHERE t."orgId" = ${orgId}::uuid

    GROUP BY t.id, t.name, t.color
    ORDER BY total_sent DESC
  `;

  return rows.map(shapeTeamPerformance);
}

/** One team's row of the team table, as the query returns it. */
export interface TeamPerformanceRow {
  team_id: string;
  team_name: string;
  team_color: string;
  total_sent: number;
  delivered_count: number;
  failed_count: number;
}

export function shapeTeamPerformance(r: TeamPerformanceRow): TeamPerformanceStat {
  const successPercentage =
    r.total_sent === 0 ? 0 : Number(((r.delivered_count / r.total_sent) * 100).toFixed(2));

  return {
    teamId: r.team_id,
    teamName: r.team_name,
    teamColor: r.team_color,
    totalSent: r.total_sent,
    deliveredCount: r.delivered_count,
    failedCount: r.failed_count,
    successPercentage,
  };
}

function percentChange(curr: number, prev: number | null): number;
function percentChange(curr: number | null, prev: number | null): number | null;
function percentChange(curr: number | null, prev: number | null): number | null {
  if (curr === null) return null;
  if (!prev || prev === 0) return curr ? 100 : 0;
  return Number((((curr - prev) / prev) * 100).toFixed(2));
}
