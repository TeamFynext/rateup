// View-level derivations over the pipeline contracts: everything the board,
// list, forecast and insights read but the API does not store — how long a lead
// has sat, whether it is rotting, how the funnel narrows.

import dayjs from "dayjs";

import type {
  Lead,
  LeadStatus,
  PipelineDetail,
  PipelineStage,
} from "@/backend/pipeline/pipeline.types.ts";
import type { LeadFilter } from "@/store/pipeline.store.ts";

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

export interface LeadFilterState {
  filter: LeadFilter;
  search: string;
  lifecycleId: string | null;
  teamId: string | null;
  source: string | null;
  assigneeId: string | null;
}

/**
 * The one place the sidebar's facets and the saved view combine.
 *
 * `currentUserId` resolves the "Mine" view; passing `undefined` makes it match
 * nothing rather than everything, which is the honest answer while the session
 * is loading. A lifecycle facet filters by the *stage's* lifecycle, so the
 * caller resolves it to that lifecycle's stage ids before calling in.
 */
export function filterLeads(
  leads: Lead[],
  filters: LeadFilterState,
  options: {
    rottingEnabled: boolean;
    currentUserId: string | undefined;
    lifecycleStageIds: string[] | null;
  },
): Lead[] {
  const search = filters.search.trim().toLowerCase();
  const { currentUserId, lifecycleStageIds } = options;

  return leads.filter((lead) => {
    if (filters.teamId && lead.teamId !== filters.teamId) return false;
    if (filters.source && lead.source !== filters.source) return false;
    if (filters.assigneeId && !isAssignedTo(lead, filters.assigneeId)) return false;
    if (lifecycleStageIds && !lifecycleStageIds.includes(lead.stageId)) return false;
    if (search) {
      const haystack = `${lead.name} ${lead.company ?? ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    switch (filters.filter) {
      case "open":
        return lead.status !== "LOST";
      case "mine":
        return lead.status === "OPEN" && isAssignedTo(lead, currentUserId);
      case "rotting":
        return isRotting(lead, options.rottingEnabled);
      case "noactivity":
        return lead.status === "OPEN" && !lead.nextTask;
      case "won":
        return lead.status === "WON";
      case "lost":
        return lead.status === "LOST";
    }
  });
}

/** Lifecycle facet rows for the sidebar, counted across every lead. */
export function lifecycleFacets(pipeline: PipelineDetail, leads: Lead[]) {
  const seen = new Map<string, { id: string; name: string; emoji: string; stageIds: string[] }>();

  for (const stage of pipeline.stages) {
    if (!stage.lifecycle) continue;
    const entry = seen.get(stage.lifecycle.id) ?? {
      id: stage.lifecycle.id,
      name: stage.lifecycle.name,
      emoji: stage.lifecycle.emoji,
      stageIds: [],
    };
    entry.stageIds.push(stage.id);
    seen.set(stage.lifecycle.id, entry);
  }

  return [...seen.values()].map((entry) => ({
    ...entry,
    count: leads.filter((lead) => entry.stageIds.includes(lead.stageId)).length,
  }));
}

/**
 * Board columns grouped into lifecycle bands, in stage order. Stages with no
 * lifecycle mapping fall into their own trailing band so nothing is hidden.
 */
export interface StageBand {
  key: string;
  /** The lifecycle's own name — org data. Null for the trailing unmapped band,
   *  whose heading is UI copy and so is left to the view. */
  label: string | null;
  category: "active" | "won" | "lost";
  stages: PipelineStage[];
}

export function groupStagesIntoBands(stages: PipelineStage[]): StageBand[] {
  const bands: StageBand[] = [];

  for (const stage of stages) {
    const key = stage.lifecycle?.id ?? "unmapped";
    const last = bands.at(-1);
    if (last?.key === key) {
      last.stages.push(stage);
      continue;
    }
    bands.push({
      key,
      label: stage.lifecycle?.name ?? null,
      category: stage.lifecycle?.category ?? (stage.isWon ? "won" : "active"),
      stages: [stage],
    });
  }

  return bands;
}

export function leadsInStage(leads: Lead[], stageId: string): Lead[] {
  return leads.filter((lead) => lead.stageId === stageId && lead.status !== "LOST");
}

export function countByStatus(leads: Lead[], status: LeadStatus): number {
  return leads.filter((lead) => lead.status === status).length;
}

// -------------------------------------------------------------------- forecast

export interface ForecastColumn {
  key: string;
  /** The formatted month. Empty for the unscheduled bucket, which the view titles itself. */
  label: string;
  /** Set on the trailing bucket of leads with no expected close date. */
  unscheduled: boolean;
  leads: Lead[];
  /** Leads weighted by their stage probability — the expected conversions. */
  expected: number;
}

/**
 * Open leads bucketed by expected close month, earliest first. Leads with no
 * expected close date collect in a trailing "Unscheduled" column rather than
 * being dropped, since an unscheduled lead is exactly what a forecast should
 * surface.
 */
export function buildForecast(leads: Lead[]): ForecastColumn[] {
  const open = leads.filter((lead) => lead.status === "OPEN");
  const buckets = new Map<string, ForecastColumn>();

  for (const lead of open) {
    const key = lead.expectedCloseAt
      ? dayjs(lead.expectedCloseAt).format("YYYY-MM")
      : "unscheduled";
    // The month is formatted here; the unscheduled bucket's title is UI copy, so
    // it is left to the view where `t` is in scope.
    const label = lead.expectedCloseAt ? dayjs(lead.expectedCloseAt).format("MMM YYYY") : "";

    const bucket = buckets.get(key) ?? {
      key,
      label,
      unscheduled: !lead.expectedCloseAt,
      leads: [],
      expected: 0,
    };
    bucket.leads.push(lead);
    bucket.expected += lead.stage.probability / 100;
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .map((bucket) => ({ ...bucket, expected: Math.round(bucket.expected * 10) / 10 }))
    .sort((a, b) => {
      if (a.key === "unscheduled") return 1;
      if (b.key === "unscheduled") return -1;
      return a.key.localeCompare(b.key);
    });
}

// -------------------------------------------------------------------- insights

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

export function buildFunnel(stages: PipelineStage[], leads: Lead[]): FunnelRow[] {
  const counts = stages.map((stage) => leadsInStage(leads, stage.id).length);
  const widest = Math.max(1, ...counts);

  return stages.map((stage, index) => ({
    stage,
    count: counts[index],
    width: Math.round((counts[index] / widest) * 100),
    carried:
      index === 0 || counts[index - 1] === 0
        ? null
        : Math.round((counts[index] / counts[index - 1]) * 100),
  }));
}

export interface AssigneePerformanceRow {
  assigneeId: string | null;
  /** The person's own name. Null for the unassigned bucket and for a teammate
   *  with no name set — both headings are UI copy, so the view supplies them. */
  name: string | null;
  open: number;
  won: number;
  /** Won as a share of all closed leads, 0-100; null when nothing has closed. */
  winRate: number | null;
  stalled: number;
}

/**
 * One row per person, plus an "Unassigned" bucket. A lead worked by two people
 * counts for both of them, so the columns sum to more than the lead count —
 * that is the point of the table: it reads per person, not per lead.
 */
export function buildAssigneePerformance(
  leads: Lead[],
  rottingEnabled: boolean,
): AssigneePerformanceRow[] {
  const rows = new Map<string, AssigneePerformanceRow>();
  const closedPerKey = new Map<string, number>();

  for (const lead of leads) {
    const people: Array<{ id: string | null; name: string | null }> = lead.assignees.length
      ? lead.assignees.map((user) => ({ id: user.id, name: user.name }))
      : [{ id: null, name: null }];

    for (const person of people) {
      const key = person.id ?? "unassigned";
      const row = rows.get(key) ?? {
        assigneeId: person.id,
        name: person.name,
        open: 0,
        won: 0,
        winRate: null,
        stalled: 0,
      };

      if (lead.status === "OPEN") row.open += 1;
      if (lead.status === "WON") row.won += 1;
      if (lead.status !== "OPEN") closedPerKey.set(key, (closedPerKey.get(key) ?? 0) + 1);
      if (isRotting(lead, rottingEnabled)) row.stalled += 1;
      rows.set(key, row);
    }
  }

  for (const [key, row] of rows) {
    const closed = closedPerKey.get(key) ?? 0;
    row.winRate = closed === 0 ? null : Math.round((row.won / closed) * 100);
  }

  return [...rows.values()].sort((a, b) => b.open - a.open);
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
export function buildStallRows(
  stages: PipelineStage[],
  leads: Lead[],
  rottingEnabled: boolean,
): StallRow[] {
  return stages
    .filter((stage) => stage.rottingDays > 0)
    .map((stage) => {
      const open = leads.filter((lead) => lead.stageId === stage.id && lead.status === "OPEN");
      const stalled = open.filter((lead) => isRotting(lead, rottingEnabled)).length;
      return {
        stage,
        stalled,
        inStage: open.length,
        width: open.length === 0 ? 0 : Math.round((stalled / open.length) * 100),
      };
    });
}

export interface SourceRow {
  source: Lead["source"];
  count: number;
  width: number;
}

export function buildSourceRows(leads: Lead[]): SourceRow[] {
  const counts = new Map<Lead["source"], number>();
  for (const lead of leads) {
    counts.set(lead.source, (counts.get(lead.source) ?? 0) + 1);
  }

  const widest = Math.max(1, ...counts.values());
  return [...counts.entries()]
    .map(([source, count]) => ({ source, count, width: Math.round((count / widest) * 100) }))
    .sort((a, b) => b.count - a.count);
}
