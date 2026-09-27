// The pipeline's sub-nav, as entries for the shared app sidebar.
//
// This builds data, not markup: `useNavMain` splices the result into the
// Pipeline entry's `items` and `AppSidebar` renders it with the same components
// every other section uses. Counts are computed with the same helpers the board
// reads, so the sidebar and the board can never disagree.
//
// Only the pipeline id is URL state, so switching board is a link and every
// other row is a click into `usePipelineStore`. Each row still points at
// `/dashboard/pipeline`, so the sidebar works from anywhere in the app.

import {
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconCalendarX,
  IconCircleCheck,
  IconCircleDot,
  IconCircleX,
  IconPlus,
  IconUserCheck,
  type Icon,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";

import type {
  LeadSource,
  PipelineDetail,
  PipelineStats,
  PipelineSummary,
} from "@/backend/pipeline/pipeline.types.ts";
import type { NavEntry, NavProgress } from "@/components/Layout/Navbar/hooks.tsx";
import { cn } from "@/lib/utils.ts";
import type { PipelineViewState } from "@/store/pipeline.store.ts";
import type { LeadFilter } from "@/store/pipeline.store.ts";

import { SOURCE_META, STATUS_BAND } from "./pipeline.constants.tsx";
import { leadFilterLabel, sourceLabel } from "./pipeline.labels.ts";
import { OTHER_PIPELINE_LIMIT, pipelineTypeConfig } from "./pipelineTypes.ts";

const PIPELINE_PATH = "/dashboard/pipeline";

// Labels come from `leadFilterLabel`, which is where `t` can reach them.
const FILTER_ROWS: ReadonlyArray<{ id: LeadFilter; icon: Icon }> = [
  { id: "open", icon: IconCircleDot },
  { id: "mine", icon: IconUserCheck },
  { id: "rotting", icon: IconAlertTriangle },
  { id: "noactivity", icon: IconCalendarX },
  { id: "won", icon: IconCircleCheck },
  { id: "lost", icon: IconCircleX },
];

type NavIcon = NonNullable<NavEntry["icon"]>;

/**
 * Sources are keyed by colour rather than by glyph, the way the design lays the
 * list out. Built once at module load: `NavEntry.icon` is a component type, and
 * minting a new one per render would remount every dot on every keystroke.
 */
function sourceDot(fillClassName: string): NavIcon {
  return function SourceDot({ className }: Readonly<{ className?: string }>) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center", className)}>
        <span className={cn("size-2 rounded-full", fillClassName)} />
      </span>
    );
  };
}

const SOURCE_DOT: Record<LeadSource, NavIcon> = {
  WHATSAPP: sourceDot(SOURCE_META.WHATSAPP.fillClassName),
  INSTAGRAM: sourceDot(SOURCE_META.INSTAGRAM.fillClassName),
  MESSENGER: sourceDot(SOURCE_META.MESSENGER.fillClassName),
  WEBCHAT: sourceDot(SOURCE_META.WEBCHAT.fillClassName),
  SURVEY: sourceDot(SOURCE_META.SURVEY.fillClassName),
  REFERRAL: sourceDot(SOURCE_META.REFERRAL.fillClassName),
  LOYALTY: sourceDot(SOURCE_META.LOYALTY.fillClassName),
  MANUAL: sourceDot(SOURCE_META.MANUAL.fillClassName),
};

type FacetKey = "stageId" | "source" | "assigneeId";

export interface PipelineNavInput {
  /** Passed in rather than hooked: this builds data, so it is not a component. */
  t: TFunction;
  /** Every pipeline the user can see; drives the switcher rows. */
  pipelines: PipelineSummary[];
  /** The open pipeline, once loaded — needed for its stages and rotting setting. */
  pipeline: PipelineDetail | undefined;
  /**
   * Counts over the whole board. They come from the server unfiltered, so a
   * facet count never shrinks because another facet is on — and never reflects
   * only the page a column happens to have loaded.
   */
  stats: PipelineStats | undefined;
  /** The board's live view state, so the active row matches what is on screen. */
  view: PipelineViewState;
  activePipelineId: string | undefined;
  currentUserId: string | undefined;
  setView: (patch: Partial<PipelineViewState>) => void;
  toggleFacet: <K extends FacetKey>(key: K, value: NonNullable<PipelineViewState[K]>) => void;
  /** Drives the meter under the panel. Absent until the stats query resolves. */
  conversationLimit?: { used: number; limit: number; hasLimit: boolean };
}

/**
 * The meter under the pipeline panel, as the design hangs it there.
 *
 * It reads as a fuel gauge — what is LEFT, emptying as the month runs on —
 * rather than as consumption filling up, because the number that decides
 * whether a broadcast can go out is the remainder. Absent when the plan has no
 * cap: an unlimited plan has nothing to meter.
 */
export function buildPipelineNavProgress({
  t,
  conversationLimit,
}: PipelineNavInput): NavProgress | undefined {
  if (!conversationLimit?.hasLimit) return undefined;
  const { used, limit } = conversationLimit;
  return {
    label: t("Conversations left"),
    done: Math.max(0, limit - used),
    total: limit,
  };
}

/** A view's row count, or undefined while the counts are still loading. */
function countFor(filter: LeadFilter, stats: PipelineStats | undefined): number | undefined {
  if (!stats) return undefined;
  // "All leads on board" counts every lead, which is what the board shows under
  // that view — won and lost included.
  return filter === "open" ? stats.totals.leads : stats.totals[filter];
}

/**
 * A labelled section of rows, as the design lays the sidebar out: a heading over
 * a flat list, rather than something you have to expand first. Empty sections
 * are dropped rather than rendered as an empty heading.
 */
function section(group: string, items: NavEntry[]): NavEntry[] {
  return items.length > 0 ? [{ group, items }] : [];
}

/** The Pipeline entry's `items`, in sidebar order. */
export function buildPipelineNavItems({
  t,
  pipelines,
  pipeline,
  stats,
  view,
  activePipelineId,
  setView,
  toggleFacet,
}: PipelineNavInput): NavEntry[] {
  // Every non-switcher row keeps the board you are on: navigating to the bare
  // path would drop `?p=` and bounce you to the first pipeline.
  const boardHref = activePipelineId ? `${PIPELINE_PATH}?p=${activePipelineId}` : PIPELINE_PATH;

  const typeConfig = pipelineTypeConfig(t, pipeline?.type ?? "LEADS");
  const hasLeads = pipelines.some((row) => row.type === "LEADS");
  const others = pipelines.filter((row) => row.type !== "LEADS").length;

  const pipelineRows: NavEntry[] = [
    // The Leads board first: it is the one the inbox and automations read.
    ...pipelines
      .toSorted((a, b) => Number(b.type === "LEADS") - Number(a.type === "LEADS"))
      .map((row) => ({
        title: row.name,
        // The one row that is a real link: which board you are on is URL state.
        url: `${PIPELINE_PATH}?p=${row.id}`,
        icon: pipelineTypeConfig(t, row.type).icon,
        count: row.openLeadCount,
        variant: "inbox-tab",
        isActive: row.id === activePipelineId,
        // The open lead belongs to the board being left.
        handleClick: () => setView({ leadId: null }),
      })),
    ...(!hasLeads || others < OTHER_PIPELINE_LIMIT
      ? [
          {
            title: t("New pipeline"),
            url: boardHref,
            icon: IconPlus,
            variant: "inbox-tab",
            isActive: false,
            handleClick: () => setView({ createPipelineOpen: true }),
          },
        ]
      : []),
  ];

  const viewRows: NavEntry[] = FILTER_ROWS.map((row) => ({
    title: leadFilterLabel(t, row.id, typeConfig.type),
    url: boardHref,
    icon: row.icon,
    count: countFor(row.id, stats),
    variant: "inbox-tab",
    isActive: view.filter === row.id,
    handleClick: () => setView({ filter: row.id }),
  }));

  // Board order comes from the pipeline, the numbers from the counts — a column
  // the user has emptied still lists, because the stats carry every stage.
  const countByStage = new Map((stats?.stages ?? []).map((row) => [row.stageId, row.total]));

  const stageRows: NavEntry[] = (pipeline?.stages ?? []).map((stage) => ({
    title: stage.name,
    url: boardHref,
    icon: STATUS_BAND[stage.status].icon,
    count: countByStage.get(stage.id),
    variant: "inbox-tab",
    isActive: view.stageId === stage.id,
    handleClick: () => toggleFacet("stageId", stage.id),
  }));

  const sourceRows: NavEntry[] = (typeConfig.features.source ? (stats?.sources ?? []) : []).map(
    (row) => ({
      title: sourceLabel(t, row.source),
      url: boardHref,
      icon: SOURCE_DOT[row.source],
      count: row.open,
      variant: "inbox-tab",
      isActive: view.source === row.source,
      handleClick: () => toggleFacet("source", row.source),
    }),
  );

  return [
    ...section(t("Pipelines"), pipelineRows),
    ...section(t("Views"), viewRows),
    ...section(typeConfig.type === "LEADS" ? t("Lead stages") : t("Stages"), stageRows),
    ...section(t("Sources"), sourceRows),
    // Ungrouped, so it sits on its own below the last section — the sidebar
    // renders a bare entry without a heading.
    {
      title: t("Pipeline settings"),
      url: boardHref,
      icon: IconAdjustmentsHorizontal,
      variant: "inbox-tab",
      isActive: view.view === "settings",
      handleClick: () => setView({ view: "settings" }),
    },
  ];
}
