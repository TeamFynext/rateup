// View-level derivations over the pipeline contracts: everything the board,
// list, forecast and insights read but the API does not store — how long a lead
// has sat, whether it is rotting, how the funnel narrows.

import dayjs from "dayjs";

import type { Lead, PipelineStage, StageStatus } from "@/backend/pipeline/pipeline.types.ts";

/** Whole days between `iso` and now, floored at 0. */
export function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, dayjs().startOf("day").diff(dayjs(iso).startOf("day"), "day"));
}

export function daysInStage(lead: Lead): number {
  return daysSince(lead.stageEnteredAt);
}

export function daysIdle(lead: Lead): number {
  return daysSince(lead.lastActivityAt);
}

export function leadAgeDays(lead: Lead): number {
  return daysSince(lead.createdAt);
}

/**
 * A lead is rotting when it is still open, its stage sets a rotting window, the
 * pipeline has the check switched on, and nothing has touched it inside that
 * window.
 *
 * Mirrored by `rottingSql()` in
 * `rateup-api/src/modules/pipeline/pipelineLead/lead.filters.ts`, which counts
 * them: this draws the badge on a card, that produces the number above the
 * column. Keep both in step.
 */
export function isRotting(lead: Lead, rottingEnabled: boolean): boolean {
  if (!rottingEnabled || lead.status !== "OPEN") return false;
  if (lead.stage.rottingDays <= 0) return false;
  return daysIdle(lead) > lead.stage.rottingDays;
}

export function isOverdue(lead: Lead): boolean {
  const dueAt = lead.nextTask?.dueAt;
  return Boolean(dueAt && dayjs(dueAt).isBefore(dayjs()));
}

/** True when `userId` is one of the people working this lead. */
export function isAssignedTo(lead: Lead, userId: string | undefined | null): boolean {
  if (!userId) return false;
  return lead.assignees.some((user) => user.id === userId);
}

/** Two-letter monogram for the avatar fallback. */
export function initials(name: string | null | undefined): string {
  const cleaned = (name ?? "").replace(/[^\p{L} ]/gu, "").trim();
  if (!cleaned) return "?";
  const [first, second] = cleaned.split(/\s+/);
  return `${first[0]}${second?.[0] ?? ""}`.toUpperCase();
}

/**
 * Board columns grouped into status bands, in stage order.
 *
 * A band breaks wherever the status changes, so a board that interleaves
 * statuses gets a band per run rather than being silently reordered — the
 * column order the org set is what the board shows. The heading is UI copy
 * (Open / Won / Lost), so the view supplies it from `status`.
 */
export interface StageBand {
  key: string;
  status: StageStatus;
  stages: PipelineStage[];
}

export function groupStagesIntoBands(stages: PipelineStage[]): StageBand[] {
  const bands: StageBand[] = [];

  for (const [index, stage] of stages.entries()) {
    const last = bands.at(-1);
    if (last?.status === stage.status) {
      last.stages.push(stage);
      continue;
    }
    bands.push({ key: `${stage.status}-${index}`, status: stage.status, stages: [stage] });
  }

  return bands;
}

// -------------------------------------------------------------------- insights

/** Per-stage figures from the counts endpoint, keyed by stage id. */
export type StageCounts = Map<string, { total: number; open: number; rotting: number }>;

export interface FunnelRow {
  stage: PipelineStage;
  count: number;
  /** Share of the widest stage, as a 0-100 width for the bar. */
  width: number;
  /**
   * How much of the previous stage reached this one, 0-100. Null on the first
   * row, which nothing feeds, and when the previous stage is empty — a share of
   * zero is undefined rather than 0%.
   *
   * The funnel reads as what carried forward rather than what dropped: the two
   * are the same number inverted, but "72% carried" is the figure people quote,
   * and a bar that is mostly full should not be labelled with a big number.
   */
  carried: number | null;
}

export function buildFunnel(stages: PipelineStage[], counts: StageCounts): FunnelRow[] {
  // Closing columns are the funnel's outcome, not a step along it, so they are
  // left out rather than showing up as a final always-narrow bar.
  const open = stages.filter((stage) => stage.status === "OPEN");
  const totals = open.map((stage) => counts.get(stage.id)?.total ?? 0);
  const widest = Math.max(1, ...totals);

  return open.map((stage, index) => ({
    stage,
    count: totals[index],
    width: Math.round((totals[index] / widest) * 100),
    carried:
      index === 0 || totals[index - 1] === 0
        ? null
        : Math.round((totals[index] / totals[index - 1]) * 100),
  }));
}

export interface StallRow {
  stage: PipelineStage;
  stalled: number;
  /** Open leads sitting in the stage — what `stalled` is a share of. */
  inStage: number;
  /** `stalled` as a share of `inStage`, 0-100. */
  width: number;
}

/**
 * One row per stage that has a rotting window, healthy stages included.
 *
 * Listing only the stages with something wrong made a clean board render as an
 * empty panel, which reads as "no data" rather than "nothing is stuck". Each bar
 * is that stage's own stalled share rather than a share of the worst stage, so a
 * row answers "how much of this column has gone quiet" instead of only ranking
 * the columns against each other.
 *
 * Stages with no rotting window are left out: nothing there can be late.
 */
export function buildStallRows(stages: PipelineStage[], counts: StageCounts): StallRow[] {
  return (
    stages
      // Nothing in a closing column can be late: the lead is already done.
      .filter((stage) => stage.status === "OPEN" && stage.rottingDays > 0)
      .map((stage) => {
        const row = counts.get(stage.id);
        const inStage = row?.open ?? 0;
        const stalled = row?.rotting ?? 0;
        return {
          stage,
          stalled,
          inStage,
          width: inStage === 0 ? 0 : Math.round((stalled / inStage) * 100),
        };
      })
  );
}

export interface SourceRow {
  source: Lead["source"];
  count: number;
  width: number;
}

/** Widths for the source mix, whose counts already arrive summed and sorted. */
export function buildSourceRows(rows: Array<{ source: Lead["source"]; total: number }>) {
  const widest = Math.max(1, ...rows.map((row) => row.total));
  return rows.map((row) => ({
    source: row.source,
    count: row.total,
    width: Math.round((row.total / widest) * 100),
  }));
}
