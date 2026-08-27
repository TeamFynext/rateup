import prisma from "../../../utils/prisma.js";
import { DEFAULT_LOST_REASONS } from "../../pipeline/pipeline.service.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/** The board this seeder creates. One per org; `@@unique([orgId, name])` guards it. */
export const SEEDED_PIPELINE_NAME = "Default Pipeline";

/**
 * Column colours, used when a lifecycle has none worth keeping. The org's own lifecycle
 * colours are preferred, but they default to white, and a white dot on a white board is
 * not a colour — so those fall through to here.
 *
 * Mirrors `STAGE_COLOR_CHOICES` in the UI so a seeded board can be recoloured from the
 * settings swatches without introducing a value the picker cannot show.
 */
const SEED_STAGE_COLORS = [
  "#16A34A",
  "#3FA46A",
  "#0E7490",
  "#4C7FBC",
  "#7A2FA8",
  "#D97A0F",
  "#F8951D",
  "#FFB638",
] as const;

const WON_COLOR = "#1C518E";
const LOST_COLOR = "#666864";

/** Board order follows the design's bands: open work, then won, then lost. */
const CATEGORY_RANK = { active: 0, won: 1, lost: 2 } as const;
const CATEGORY_STATUS = { active: "OPEN", won: "WON", lost: "LOST" } as const;

/** White and near-white read as "never picked a colour", not as a choice. */
function usableColor(color: string | null) {
  if (!color) return null;
  const hex = color.trim().toLowerCase();
  return hex === "#fff" || hex === "#ffffff" ? null : color;
}

interface SeedLifecycle {
  name: string;
  ordering: number;
  color: string | null;
  category: keyof typeof CATEGORY_RANK;
}

interface SeedStage {
  name: string;
  order: number;
  color: string;
  probability: number;
  rottingDays: number;
  status: (typeof CATEGORY_STATUS)[keyof typeof CATEGORY_STATUS];
}

/**
 * Turns an org's lifecycle stages into board columns of the same names.
 *
 * Three things it has to fix rather than copy:
 *
 * - **Order.** `Lifecycle.ordering` is only meaningful within a category — real data has
 *   two stages both at `ordering: 0` — so ordering it directly would interleave Lost
 *   among the open columns and leave ties resolved at random. Columns are sorted by
 *   category first and re-indexed from zero.
 * - **Colour.** Lifecycle colours default to `#ffffff`, which is invisible as a column
 *   marker, so those fall back to the palette above.
 * - **Closing columns.** A board with no Won or Lost column cannot close a lead at all —
 *   `closeLead` looks for the first column of that status and finds none. An org whose
 *   lifecycles produce neither gets one appended.
 */
export function stagesFromLifecycles(lifecycles: SeedLifecycle[]) {
  const sorted = [...lifecycles].sort(
    (a, b) =>
      CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category] ||
      a.ordering - b.ordering ||
      a.name.localeCompare(b.name),
  );

  const openCount = sorted.filter((life) => life.category === "active").length;
  let openSeen = 0;

  const stages: SeedStage[] = sorted.map((life, index) => {
    const status = CATEGORY_STATUS[life.category];
    // Open columns get an even ramp across the funnel — one open column sits at 50%,
    // three at 25/50/75 — rather than every column claiming the same odds.
    const probability =
      status === "WON"
        ? 100
        : status === "LOST"
          ? 0
          : Math.round((++openSeen / (openCount + 1)) * 100);

    return {
      name: life.name,
      order: index,
      color:
        usableColor(life.color) ??
        (status === "WON"
          ? WON_COLOR
          : status === "LOST"
            ? LOST_COLOR
            : SEED_STAGE_COLORS[index % SEED_STAGE_COLORS.length]),
      probability,
      // Only open work can rot; a closed lead is not waiting on anyone.
      rottingDays: status === "OPEN" ? 5 : 0,
      status,
    };
  });

  const added = { won: false, lost: false };
  if (!stages.some((stage) => stage.status === "WON")) {
    stages.push({
      name: "Won",
      order: stages.length,
      color: WON_COLOR,
      probability: 100,
      rottingDays: 0,
      status: "WON",
    });
    added.won = true;
  }
  if (!stages.some((stage) => stage.status === "LOST")) {
    stages.push({
      name: "Lost",
      order: stages.length,
      color: LOST_COLOR,
      probability: 0,
      rottingDays: 0,
      status: "LOST",
    });
    added.lost = true;
  }

  return { stages, added };
}

/**
 * Gives every org that has none a "Default Pipeline", with one column per lifecycle stage
 * that org owns — same names, so contacts can later be placed on the column matching the
 * lifecycle they already sit in.
 *
 * Deliberately per-org rather than one shared board: `Lifecycle.orgId` scopes the lookup,
 * so each org's columns come from its own vocabulary. An org with no lifecycles is skipped
 * rather than given a columnless board. An org with no teams is skipped too, because
 * pipeline access *is* team membership — a board with no team attached is one nobody can
 * open.
 *
 * It does **not** point teams at the board with auto-add on. That feature was removed with
 * the lifecycle coupling; setting `defaultPipelineId`/`autoCreateLeads` here would only
 * write columns nothing reads.
 *
 * Idempotent, and it runs for every org: an org that already has a board is skipped, so
 * there is nothing to gain from targeting one.
 */
export async function seedPipelines({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const orgs = await prisma.org.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const details = {
    orgsScanned: orgs.length,
    pipelinesCreated: 0,
    stagesCreated: 0,
    wonColumnsAdded: 0,
    lostColumnsAdded: 0,
    skippedHasPipeline: 0,
    skippedNoLifecycles: 0,
    skippedNoTeams: 0,
  };

  for (const org of orgs) {
    if (await prisma.pipeline.count({ where: { orgId: org.id } })) {
      details.skippedHasPipeline++;
      continue;
    }

    const lifecycles = await prisma.lifecycle.findMany({
      where: { orgId: org.id },
      orderBy: { ordering: "asc" },
      select: { name: true, ordering: true, color: true, category: true },
    });
    if (!lifecycles.length) {
      details.skippedNoLifecycles++;
      log(`skipped ${org.name}: no lifecycle stages to copy`);
      continue;
    }

    const teams = await prisma.team.findMany({ where: { orgId: org.id }, select: { id: true } });
    if (!teams.length) {
      details.skippedNoTeams++;
      log(`skipped ${org.name}: no teams, so nobody could open the board`);
      continue;
    }

    const { stages, added } = stagesFromLifecycles(lifecycles);

    details.pipelinesCreated++;
    details.stagesCreated += stages.length;
    if (added.won) details.wonColumnsAdded++;
    if (added.lost) details.lostColumnsAdded++;

    const appended = [added.won && "Won", added.lost && "Lost"].filter(Boolean).join(" and ");
    const note = appended ? `, appending ${appended}` : "";

    if (!apply) {
      log(
        `would seed ${org.name}: ${stages.length} column(s) from ${lifecycles.length} lifecycle(s)${note}`,
      );
      continue;
    }

    await prisma.pipeline.create({
      data: {
        name: SEEDED_PIPELINE_NAME,
        orgId: org.id,
        order: 0,
        // Every team in the org, so whoever is already working gets the board.
        teams: {
          createMany: { skipDuplicates: true, data: teams.map(({ id }) => ({ teamId: id })) },
        },
        stages: { create: stages },
        lostReasons: { create: DEFAULT_LOST_REASONS.map((label, order) => ({ label, order })) },
      },
      select: { id: true },
    });

    log(`seeded ${org.name}: ${stages.length} column(s) for ${teams.length} team(s)${note}`);
  }

  const verb = apply ? "Seeded" : "Would seed";
  return {
    summary: `${verb} ${details.pipelinesCreated} pipeline(s) with ${details.stagesCreated} column(s) across ${orgs.length} org(s).`,
    details,
  };
}
