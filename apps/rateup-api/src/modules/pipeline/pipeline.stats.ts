import { Prisma } from "../../../generated/prisma/client.js";
import type { LeadSource } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { rottingSql } from "./pipelineLead/lead.filters.js";

/**
 * Every number the board shows, counted over the whole pipeline.
 *
 * Deliberately unfiltered: the board's columns are paginated and filtered, so
 * the counts cannot be derived from what happens to be loaded. A sidebar row
 * saying "412" while the column shows fifty cards is the point — the figure
 * describes the pipeline, the cards describe the page.
 *
 * That also means these do not take the active facets. Insights answers "how is
 * this board doing", not "how is this board doing under the filter I left on",
 * which is the same choice Zoho and Jira make by keeping reporting separate from
 * the board's view.
 */
export interface PipelineStats {
  totals: {
    /** Every lead on the board, closed ones included. */
    leads: number;
    open: number;
    won: number;
    lost: number;
    /** Open leads assigned to the caller. */
    mine: number;
    rotting: number;
    /** Open leads with no incomplete task. */
    noactivity: number;
    avgDaysInStage: number;
    avgAgeDays: number;
    /** Days from creation to close, over won leads. Null when nothing is won. */
    avgCycleDays: number | null;
  };
  stages: Array<{
    stageId: string;
    total: number;
    open: number;
    avgDaysInStage: number;
    rotting: number;
  }>;
  sources: Array<{ source: LeadSource; open: number; total: number }>;
  assignees: Array<{
    /** Null on the unassigned bucket. */
    assigneeId: string | null;
    name: string | null;
    profilePhoto: string | null;
    open: number;
    won: number;
    /** Won plus lost — what `won` is a share of. */
    closed: number;
    stalled: number;
  }>;
}

type TotalsRow = PipelineStats["totals"];
type StageRow = PipelineStats["stages"][number];
type SourceRow = PipelineStats["sources"][number];
type AssigneeRow = PipelineStats["assignees"][number];

export async function getPipelineStats(pipelineId: string, userId: string): Promise<PipelineStats> {
  const { rottingEnabled } = await prisma.pipeline.findUniqueOrThrow({
    where: { id: pipelineId },
    select: { rottingEnabled: true },
  });

  const rotting = rottingSql(rottingEnabled);
  const id = Prisma.sql`${pipelineId}::uuid`;

  // Every count is cast to `::int`: Postgres returns COUNT as bigint, which
  // Prisma hands back as a JS BigInt, which JSON.stringify refuses to serialise.
  const [totalsRows, stages, sources, assignees] = await Promise.all([
    prisma.$queryRaw<TotalsRow[]>`
      SELECT
        COUNT(*)::int AS leads,
        COUNT(*) FILTER (WHERE l.status = 'OPEN'::"LeadStatus")::int AS open,
        COUNT(*) FILTER (WHERE l.status = 'WON'::"LeadStatus")::int AS won,
        COUNT(*) FILTER (WHERE l.status = 'LOST'::"LeadStatus")::int AS lost,
        COUNT(*) FILTER (
          WHERE l.status = 'OPEN'::"LeadStatus"
            AND EXISTS (
              SELECT 1 FROM "LeadAssignee" a
              WHERE a."leadId" = l.id AND a."assigneeId" = ${userId}::uuid
            )
        )::int AS mine,
        COUNT(*) FILTER (WHERE ${rotting})::int AS rotting,
        COUNT(*) FILTER (
          WHERE l.status = 'OPEN'::"LeadStatus"
            AND NOT EXISTS (
              SELECT 1 FROM "LeadTask" t WHERE t."leadId" = l.id AND t."completedAt" IS NULL
            )
        )::int AS noactivity,
        COALESCE(ROUND(AVG(CURRENT_DATE - l."stageEnteredAt"::date)), 0)::int AS "avgDaysInStage",
        COALESCE(ROUND(AVG(CURRENT_DATE - l."createdAt"::date)), 0)::int AS "avgAgeDays",
        -- End to end, not time in stage: how long a sale takes is the figure
        -- worth watching, and it stops climbing once the lead is won.
        ROUND(
          AVG(l."closedAt"::date - l."createdAt"::date)
            FILTER (WHERE l.status = 'WON'::"LeadStatus" AND l."closedAt" IS NOT NULL)
        )::int AS "avgCycleDays"
      FROM "Lead" l
      JOIN "PipelineStage" s ON s.id = l."stageId"
      WHERE l."pipelineId" = ${id}
    `,

    // LEFT JOIN so a column nobody has used still reports itself as zero rather
    // than vanishing from the board's headers.
    prisma.$queryRaw<StageRow[]>`
      SELECT
        s.id AS "stageId",
        COUNT(l.id)::int AS total,
        COUNT(l.id) FILTER (WHERE l.status = 'OPEN'::"LeadStatus")::int AS open,
        COALESCE(ROUND(AVG(CURRENT_DATE - l."stageEnteredAt"::date)), 0)::int AS "avgDaysInStage",
        COUNT(l.id) FILTER (WHERE ${rotting})::int AS rotting
      FROM "PipelineStage" s
      LEFT JOIN "Lead" l ON l."stageId" = s.id
      WHERE s."pipelineId" = ${id}
      GROUP BY s.id
    `,

    prisma.$queryRaw<SourceRow[]>`
      SELECT
        l.source,
        COUNT(*) FILTER (WHERE l.status = 'OPEN'::"LeadStatus")::int AS open,
        COUNT(*)::int AS total
      FROM "Lead" l
      WHERE l."pipelineId" = ${id}
      GROUP BY l.source
      ORDER BY total DESC
    `,

    // A lead worked by two people counts for both, so these columns sum to more
    // than the lead count — the table reads per person, not per lead.
    prisma.$queryRaw<AssigneeRow[]>`
      SELECT
        a."assigneeId" AS "assigneeId",
        u.name AS name,
        u."profilePhoto" AS "profilePhoto",
        COUNT(*) FILTER (WHERE l.status = 'OPEN'::"LeadStatus")::int AS open,
        COUNT(*) FILTER (WHERE l.status = 'WON'::"LeadStatus")::int AS won,
        COUNT(*) FILTER (WHERE l.status <> 'OPEN'::"LeadStatus")::int AS closed,
        COUNT(*) FILTER (WHERE ${rotting})::int AS stalled
      FROM "Lead" l
      JOIN "LeadAssignee" a ON a."leadId" = l.id
      JOIN "User" u ON u.id = a."assigneeId"
      JOIN "PipelineStage" s ON s.id = l."stageId"
      WHERE l."pipelineId" = ${id}
      GROUP BY a."assigneeId", u.name, u."profilePhoto"
      UNION ALL
      SELECT
        NULL, NULL, NULL,
        COUNT(*) FILTER (WHERE l.status = 'OPEN'::"LeadStatus")::int,
        COUNT(*) FILTER (WHERE l.status = 'WON'::"LeadStatus")::int,
        COUNT(*) FILTER (WHERE l.status <> 'OPEN'::"LeadStatus")::int,
        COUNT(*) FILTER (WHERE ${rotting})::int
      FROM "Lead" l
      JOIN "PipelineStage" s ON s.id = l."stageId"
      WHERE l."pipelineId" = ${id}
        AND NOT EXISTS (SELECT 1 FROM "LeadAssignee" a WHERE a."leadId" = l.id)
      ORDER BY open DESC
    `,
  ]);

  const totals: TotalsRow = totalsRows[0] ?? {
    leads: 0,
    open: 0,
    won: 0,
    lost: 0,
    mine: 0,
    rotting: 0,
    noactivity: 0,
    avgDaysInStage: 0,
    avgAgeDays: 0,
    avgCycleDays: null,
  };

  return {
    totals,
    stages,
    sources,
    // The unassigned bucket is always selected, so a board where everything is
    // assigned would otherwise grow a permanent row of zeroes.
    assignees: assignees.filter(
      (row) => row.assigneeId !== null || row.open + row.won + row.closed + row.stalled > 0,
    ),
  };
}
