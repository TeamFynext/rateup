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
  totalSent: number;
  deliveredCount: number;
  failedCount: number;
  successPercentage: number;
  failurePercentage: number;
  avgDeliveryTimeSeconds: number | null;
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

export async function getWaMessageOverviewByTeamAndOrg(
  teamId: string,
  orgId: string,
  dateRange,
  apiType,
): Promise<WaMessageOverview> {
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (dateRange?.length === 2) {
    rangeStart = new Date(dateRange[0]);
    rangeEnd = new Date(dateRange[1]);
  } else {
    // default last 7 days
    rangeEnd = new Date();
    rangeStart = new Date();
    rangeStart.setDate(rangeEnd.getDate() - 6);
  }

  //Calculate previous period
  const diffMs = rangeEnd.getTime() - rangeStart.getTime();
  const prevEnd = new Date(rangeStart.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diffMs);

  const teamFilter =
    !teamId || teamId === "all" || teamId === "null"
      ? Prisma.sql``
      : Prisma.sql`AND motm."teamId" = ${teamId}::uuid`;

  let apiTypeFilter = Prisma.sql``;

  if (apiType === "external") {
    apiTypeFilter = Prisma.sql`AND motm."externalApi" = true`;
  } else if (apiType === "whatsapp") {
    apiTypeFilter = Prisma.sql`AND motm."externalApi" = false`;
  }

  const query = async (start: Date, end: Date) =>
    prisma.$queryRaw<
      {
        total_messages: number;
        delivered_messages: number;
        failed_messages: number;
        avg_delivery_time_seconds: number | null;
      }[]
    >`
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

  const emptyRow = {
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

    avgDeliveryTimeSeconds: avgDeliveryTime,
    avgDeliveryTimeChange: percentChange(avgDeliveryTime, previous.avg_delivery_time_seconds),
  };
}

export async function getDeliveredFailedTrend(
  orgId: string,
  teamId: string,
  granularity: "day" | "hour",
  dateRange,
  apiType,
): Promise<MessageDeliveryTrendPoint[]> {
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (dateRange?.length === 2) {
    rangeStart = new Date(dateRange[0]);
    rangeEnd = new Date(dateRange[1]);
  }

  const timeBucket =
    granularity === "hour"
      ? Prisma.sql`DATE_TRUNC('hour', wm."createdAt")`
      : Prisma.sql`DATE_TRUNC('day', wm."createdAt")`;

  const teamFilter =
    !teamId || teamId === "all" || teamId === "null"
      ? Prisma.sql``
      : Prisma.sql`AND motm."teamId" = ${teamId}::uuid`;

  let apiTypeFilter = Prisma.sql``;

  if (apiType === "external") {
    apiTypeFilter = Prisma.sql`AND motm."externalApi" = true`;
  } else if (apiType === "whatsapp") {
    apiTypeFilter = Prisma.sql`AND motm."externalApi" = false`;
  }

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
      AND wm."createdAt" BETWEEN
        COALESCE(${rangeStart}, '1970-01-01'::timestamptz)
        AND COALESCE(${rangeEnd}, NOW())

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
  dateRange,
  apiType,
): Promise<MessageDeliveryTrendPoint[]> {
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (dateRange?.length === 2) {
    rangeStart = new Date(dateRange[0]);
    rangeEnd = new Date(dateRange[1]);
  } else {
    rangeEnd = new Date();
    rangeStart = new Date();
    rangeStart.setDate(rangeEnd.getDate() - 6); // last 7 days
  }
  const teamFilter =
    !teamId || teamId === "all" || teamId === "null"
      ? Prisma.sql``
      : Prisma.sql`AND motm."teamId" = ${teamId}::uuid`;

  let apiTypeFilter = Prisma.sql``;

  if (apiType === "external") {
    apiTypeFilter = Prisma.sql`AND motm."externalApi" = true`;
  } else if (apiType === "whatsapp") {
    apiTypeFilter = Prisma.sql`AND motm."externalApi" = false`;
  }

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
      AND wm."createdAt" BETWEEN
        COALESCE(${rangeStart}, '1970-01-01'::timestamptz)
        AND COALESCE(${rangeEnd}, NOW())

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
  dateRange,
  apiType,
): Promise<TemplateCategoryOverview> {
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (dateRange?.length === 2) {
    rangeStart = new Date(dateRange[0]);
    rangeEnd = new Date(dateRange[1]);
  }

  const teamFilter =
    !teamId || teamId === "all" || teamId === "null"
      ? Prisma.sql``
      : Prisma.sql`AND motm."teamId" = ${teamId}::uuid`;

  let apiTypeFilter = Prisma.sql``;

  if (apiType === "external") {
    apiTypeFilter = Prisma.sql`AND motm."externalApi" = true`;
  } else if (apiType === "whatsapp") {
    apiTypeFilter = Prisma.sql`AND motm."externalApi" = false`;
  }

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
      AND wm."createdAt" BETWEEN
        COALESCE(${rangeStart}, '1970-01-01'::timestamptz)
        AND COALESCE(${rangeEnd}, NOW())
    GROUP BY category
  `;

  // Convert DB result to map
  const countMap = new Map<string, number>();
  rows.forEach((r) => countMap.set(r.category, r.count));

  // All possible categories (from enum)
  const allCategories = Object.values(WaTemplateCategory);

  // Build full list with 0 defaults
  const byCategory = allCategories.map((category) => ({
    category,
    count: countMap.get(category) ?? 0,
  }));

  const totalTemplates = byCategory.reduce((sum, r) => sum + r.count, 0);

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
  dateRange,
  apiType,
): Promise<TemplatePerformanceStat[]> {
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (dateRange?.length === 2) {
    rangeStart = new Date(dateRange[0]);
    rangeEnd = new Date(dateRange[1]);
  }

  const teamFilter =
    !teamId || teamId === "all" || teamId === "null"
      ? Prisma.sql``
      : Prisma.sql`AND motm."teamId" = ${teamId}::uuid`;

  let apiTypeFilter = Prisma.sql``;

  if (apiType === "external") {
    apiTypeFilter = Prisma.sql`AND motm."externalApi" = true`;
  } else if (apiType === "whatsapp") {
    apiTypeFilter = Prisma.sql`AND motm."externalApi" = false`;
  }

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
      AND wm."createdAt" BETWEEN
        COALESCE(${rangeStart}, '1970-01-01'::timestamptz)
        AND COALESCE(${rangeEnd}, NOW())

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
      avgDeliveryTimeSeconds: r.avg_delivery_time_seconds
        ? Number(r.avg_delivery_time_seconds.toFixed(2))
        : null,
      lastUsed: r.last_used ? r.last_used.toISOString() : null,
    };
  });
}

export async function getTeamPerformanceStats(
  orgId: string,
  dateRange,
  apiType,
): Promise<TeamPerformanceStat[]> {
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (dateRange?.length === 2) {
    rangeStart = new Date(dateRange[0]);
    rangeEnd = new Date(dateRange[1]);
  }

  const apiJoinFilter =
    apiType === "external"
      ? Prisma.sql`AND motm."externalApi" = true`
      : apiType === "whatsapp"
        ? Prisma.sql`AND motm."externalApi" = false`
        : Prisma.sql``;

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

    LEFT JOIN "WaMessage" wm
      ON wm.id = motm."messageId"
      AND wm."createdAt" BETWEEN
        COALESCE(${rangeStart}, '1970-01-01'::timestamptz)
        AND COALESCE(${rangeEnd}, NOW())

    WHERE t."orgId" = ${orgId}::uuid
    ${apiJoinFilter}

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

const percentChange = (curr: number | null, prev: number | null) => {
  if (!prev || prev === 0) return curr ? 100 : 0;
  return Number((((curr! - prev) / prev) * 100).toFixed(2));
};
