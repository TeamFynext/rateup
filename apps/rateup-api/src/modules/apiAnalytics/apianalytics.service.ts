import { Prisma } from "../../../generated/prisma/client.js";
import { WaTemplateCategory } from "../../types/enums.js";
import prisma from "../../utils/prisma.js";

interface WaMessageOverview {
  totalMessages: number;
  totalMessagesChange: number;
  deliveredMessages: number;
  deliveredPercentage: number;
  failedMessages: number;
  failedPercentage: number;
  avgDeliveryTimeSeconds: number | null;
  avgDeliveryTimeChange: number | null;
}

interface MessageDeliveryTrendPoint {
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

interface TemplateCategoryOverview {
  totalTemplates: number;
  byCategory: TemplateCategoryStat[];
}

interface TemplatePerformanceStat {
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

interface TeamPerformanceStat {
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

/**
 * The window every panel on the analytics screen looks at.
 *
 * This block used to be copied into all six functions in this file, and the copies
 * had drifted: two defaulted to the last seven days while four left the range null
 * for the SQL to coalesce to 1970 — so a summary card counting a week sat beside a
 * trend chart plotting all history, on one screen, from one request. Resolving it
 * once is what makes those numbers reconcilable. See issues.txt 15.1 and 15.8.
 *
 * A range that does not parse is treated as absent. The querystring schema refuses
 * those with a 400 before they reach here; this is the backstop that keeps a bad
 * range from reaching Postgres as an Invalid Date.
 */
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

/**
 * A user who picks "the 1st to the 7th" means the whole of the 7th. Parsed as UTC
 * midnight and used verbatim in `BETWEEN start AND end`, the range ended the
 * instant its last day began, so everything sent that day was missing from every
 * panel — and a single-day selection returned nothing at all. See issues.txt 15.3.
 */
function endOfDayIfDateOnly(value: string): Date {
  const parsed = new Date(value);
  if (DATE_ONLY.test(value.trim())) parsed.setUTCHours(23, 59, 59, 999);
  return parsed;
}

/** "all", "null", and absent all mean every team. */
function teamFilterFor(teamId: string | null | undefined) {
  return !teamId || teamId === "all" || teamId === "null"
    ? Prisma.sql``
    : Prisma.sql`AND motm."teamId" = ${teamId}::uuid`;
}

function apiTypeFilterFor(apiType: string | null | undefined) {
  if (apiType === "external") return Prisma.sql`AND motm."externalApi" = true`;
  if (apiType === "whatsapp") return Prisma.sql`AND motm."externalApi" = false`;
  return Prisma.sql``;
}

/**
 * Rounded in one place, so the overview card and the per-template table report the
 * same figure the same way. Tests for null rather than falsiness: an average of
 * exactly zero — everything delivered within the second it was sent — is a real
 * measurement, not "no data". See issues.txt 15.6.
 */
function roundSeconds(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value.toFixed(2));
}

/**
 * Renamed from `getWaMessageOverviewByTeamAndOrg`, which took `(teamId, orgId, …)`
 * while every other function in this file takes `(orgId, teamId, …)`. Both are
 * strings, so a transposition would have compiled; renaming alongside the reorder
 * is what turns a missed call site into a compile error. See issues.txt 15.9.
 */
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

  interface DeliveryStatsRow {
    total_messages: number;
    delivered_messages: number;
    failed_messages: number;
    avg_delivery_time_seconds: number | null;
  }

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
        AND wm."createdAt" BETWEEN ${start} AND ${end}
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

  const current = currentRes[0] ?? emptyRow;
  const previous = prevRes[0] ?? emptyRow;

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
      AND wm."createdAt" BETWEEN ${rangeStart} AND ${rangeEnd}

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

export async function getDeliveredFailedWeekTrend(
  orgId: string,
  teamId: string,
  dateRange: string[] | null | undefined,
  apiType: string,
): Promise<MessageDeliveryTrendPoint[]> {
  const { rangeStart, rangeEnd } = resolveDateRange(dateRange);
  const teamFilter = teamFilterFor(teamId);
  const apiTypeFilter = apiTypeFilterFor(apiType);

  const result = await prisma.$queryRaw<
    {
      day: Date;
      total_messages: number;
      delivered_messages: number;
      failed_messages: number;
    }[]
  >`
    SELECT
      DATE_TRUNC('day', wm."createdAt") AS day,

      COUNT(*)::INT AS total_messages,

      COUNT(*) FILTER (
        WHERE wm.stats ? 'delivered'
          AND wm.stats->>'delivered' <> ''
      )::INT AS delivered_messages,

      COUNT(*) FILTER (
        WHERE wm.stats ? 'failed'
          AND wm.stats->>'failed' <> ''
      )::INT AS failed_messages

    FROM "WaMessageOrgTeamMap" motm
    JOIN "WaMessage" wm
      ON wm.id = motm."messageId"

    WHERE motm."orgId" = ${orgId}::uuid
      ${teamFilter}
      ${apiTypeFilter}
      AND wm."createdAt" BETWEEN ${rangeStart} AND ${rangeEnd}

    GROUP BY day
    ORDER BY day ASC
  `;

  return result.map((row) => ({
    time: row.day.toISOString(),
    totalMessages: row.total_messages,
    deliveredMessages: row.delivered_messages,
    failedMessages: row.failed_messages,
  }));
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
      AND wm."createdAt" BETWEEN ${rangeStart} AND ${rangeEnd}
    GROUP BY category
  `;

  const countMap = new Map<string, number>();
  let totalTemplates = 0;
  for (const r of rows) {
    countMap.set(r.category, (countMap.get(r.category) ?? 0) + r.count);
    totalTemplates += r.count;
  }

  // Our enum first, so the breakdown keeps a stable shape and a category nobody
  // used still shows a zero — then anything Meta returned that the enum does not
  // carry. Those used to be dropped from the breakdown AND from the total, which
  // was recomputed from the filtered list rather than taken from the query: a pie
  // chart adding to 100% while under-reporting what was actually sent. Meta has
  // added template categories before. See issues.txt 15.4(a).
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
      AND wm."createdAt" BETWEEN ${rangeStart} AND ${rangeEnd}

    GROUP BY template_name, template_category
    ORDER BY total_sent DESC
  `;

  return rows.map((r) => {
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
  });
}

/**
 * Every team in the org with what it sent, including the teams that sent nothing.
 *
 * This counts every mapped message, not just template and campaign sends — which
 * is deliberate, and matches the overview card it sits beside. The two template
 * panels filter to `motm."type" IN ('TEMPLATE', 'CAMPAIGN')` because they break
 * their numbers down BY template, so a non-template send has nothing to appear
 * under. Their totals cannot agree with this one and should not be read as though
 * they measure the same population. See issues.txt 15.4(b).
 */
export async function getTeamPerformanceStats(
  orgId: string,
  dateRange: string[] | null | undefined,
  apiType: string,
): Promise<TeamPerformanceStat[]> {
  const { rangeStart, rangeEnd } = resolveDateRange(dateRange);
  // Into the JOIN's ON condition, not the WHERE clause. A WHERE predicate on the
  // right-hand table of a LEFT JOIN discards exactly the unmatched rows the LEFT
  // JOIN exists to keep — motm."externalApi" is NULL for a team that sent nothing,
  // and `NULL = true` is not true — so filtering by API type used to make every
  // idle team vanish from the table rather than show a zero. See issues.txt 15.2.
  const apiJoinFilter = apiTypeFilterFor(apiType);

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

    LEFT JOIN "WaMessage" wm
      ON wm.id = motm."messageId"
      AND wm."createdAt" BETWEEN ${rangeStart} AND ${rangeEnd}

    WHERE t."orgId" = ${orgId}::uuid

    GROUP BY t.id, t.name, t.color
    ORDER BY total_sent DESC
  `;

  return rows.map((r) => {
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
  });
}

function percentChange(curr: number, prev: number | null): number;
function percentChange(curr: number | null, prev: number | null): number | null;
function percentChange(curr: number | null, prev: number | null): number | null {
  if (curr === null) return null;
  if (!prev || prev === 0) return curr ? 100 : 0;
  return Number((((curr - prev) / prev) * 100).toFixed(2));
}
