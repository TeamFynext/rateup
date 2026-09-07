import prisma from "../../utils/prisma.js";
import { leadListInclude, serialiseLead } from "./pipelineLead/lead.service.js";

/**
 * How many cards a forecast column carries.
 *
 * The forecast is a reading of the months ahead, not a browsable list — the
 * count and the weighted expectation are the answer, and the cards under them
 * are the evidence. A bucket that holds more says so rather than paging.
 */
export const FORECAST_LEADS_PER_BUCKET = 20;

export interface ForecastBucket {
  /** "YYYY-MM", or "unscheduled" for leads with no expected close date. */
  key: string;
  unscheduled: boolean;
  count: number;
  /** Leads weighted by their stage's probability — the expected conversions. */
  expected: number;
  leads: ReturnType<typeof serialiseLead>[];
}

interface BucketRow {
  key: string;
  count: number;
  expected: number;
}

/** `[first of the month, first of the next)`, in UTC. */
function monthRange(key: string): { gte: Date; lt: Date } {
  const [year, month] = key.split("-").map(Number);
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  };
}

/**
 * Open leads bucketed by the month they are expected to close.
 *
 * Leads with no expected close date collect in a trailing "unscheduled" bucket
 * rather than being dropped: an unscheduled lead is exactly what a forecast
 * should surface.
 */
export async function getPipelineForecast(pipelineId: string): Promise<ForecastBucket[]> {
  const rows = await prisma.$queryRaw<BucketRow[]>`
    SELECT
      COALESCE(to_char(l."expectedCloseAt", 'YYYY-MM'), 'unscheduled') AS key,
      COUNT(*)::int AS count,
      ROUND(SUM(s.probability)::numeric / 100, 1)::float8 AS expected
    FROM "Lead" l
    JOIN "PipelineStage" s ON s.id = l."stageId"
    WHERE l."pipelineId" = ${pipelineId}::uuid
      AND l.status = 'OPEN'::"LeadStatus"
    GROUP BY 1
  `;

  const sorted = [...rows].sort((a, b) => {
    if (a.key === "unscheduled") return 1;
    if (b.key === "unscheduled") return -1;
    return a.key.localeCompare(b.key);
  });

  // A board has at most a couple of years of buckets, so these run together
  // rather than one after another.
  return Promise.all(
    sorted.map(async (row) => {
      const unscheduled = row.key === "unscheduled";
      const leads = await prisma.lead.findMany({
        where: {
          pipelineId,
          status: "OPEN",
          expectedCloseAt: unscheduled ? null : monthRange(row.key),
        },
        orderBy: [{ stageEnteredAt: "desc" }, { id: "desc" }],
        take: FORECAST_LEADS_PER_BUCKET,
        include: leadListInclude,
      });

      return {
        key: row.key,
        unscheduled,
        count: row.count,
        expected: row.expected,
        leads: leads.map(serialiseLead),
      };
    }),
  );
}
