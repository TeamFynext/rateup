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
  IconGitBranch,
  IconPlus,
  IconUserCheck,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";

import type {
  Lead,
  LeadSource,
  PipelineDetail,
  PipelineSummary,
} from "@/backend/pipeline/pipeline.types.ts";
import type { NavEntry, NavProgress } from "@/components/Layout/Navbar/hooks.tsx";
import { cn } from "@/lib/utils.ts";
import type { PipelineViewState } from "@/store/pipeline.store.ts";
import type { LeadFilter } from "@/store/pipeline.store.ts";

import { PIPELINE_LIMIT_PER_ORG, SOURCE_META, STATUS_BAND } from "./pipeline.constants.tsx";
import { leadFilterLabel, sourceLabel } from "./pipeline.labels.ts";
import { countByStatus, isAssignedTo, isRotting, stageFacets } from "./pipeline.utils.ts";

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

type FacetKey = "stageId" | "teamId" | "source" | "assigneeId";

export interface PipelineNavInput {
  /** Passed in rather than hooked: this builds data, so it is not a component. */
  t: TFunction;
  /** Every pipeline the user can see; drives the switcher rows. */
  pipelines: PipelineSummary[];
  /** The open pipeline, once loaded — needed for its stages and rotting setting. */
  pipeline: PipelineDetail | undefined;
  /** Unfiltered leads, so a facet count never shrinks because another facet is on. */
  leads: Lead[];
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

function countFor(
  filter: LeadFilter,
  leads: Lead[],
  options: { rottingEnabled: boolean; currentUserId: string | undefined },
): number {
  switch (filter) {
    case "open":
      return leads.length;
    case "mine":
      return leads.filter(
        (lead) => lead.status === "OPEN" && isAssignedTo(lead, options.currentUserId),
      ).length;
    case "rotting":
      return leads.filter((lead) => isRotting(lead, options.rottingEnabled)).length;
    case "noactivity":
      return leads.filter((lead) => lead.status === "OPEN" && !lead.nextTask).length;
    case "won":
      return countByStatus(leads, "WON");
    case "lost":
      return countByStatus(leads, "LOST");
  }
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
  leads,
  view,
  activePipelineId,
  currentUserId,
  setView,
  toggleFacet,
}: PipelineNavInput): NavEntry[] {
  const rottingEnabled = pipeline?.rottingEnabled ?? false;
  // Every non-switcher row keeps the board you are on: navigating to the bare
  // path would drop `?p=` and bounce you to the first pipeline.
  const boardHref = activePipelineId ? `${PIPELINE_PATH}?p=${activePipelineId}` : PIPELINE_PATH;

  const pipelineRows: NavEntry[] = [
    ...pipelines.map((row) => ({
      title: row.name,
      // The one row that is a real link: which board you are on is URL state.
      url: `${PIPELINE_PATH}?p=${row.id}`,
      icon: IconGitBranch,
      count: row.openLeadCount,
      variant: "inbox-tab",
      isActive: row.id === activePipelineId,
      // The open lead belongs to the board being left.
      handleClick: () => setView({ leadId: null }),
    })),
    ...(pipelines.length < PIPELINE_LIMIT_PER_ORG
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
    title: leadFilterLabel(t, row.id),
    url: boardHref,
    icon: row.icon,
    count: countFor(row.id, leads, { rottingEnabled, currentUserId }),
    variant: "inbox-tab",
    isActive: view.filter === row.id,
    handleClick: () => setView({ filter: row.id }),
  }));

  const stageRows: NavEntry[] = (pipeline ? stageFacets(pipeline, leads) : []).map((facet) => ({
    title: facet.name,
    url: boardHref,
    icon: STATUS_BAND[facet.status].icon,
    count: facet.count,
    variant: "inbox-tab",
    isActive: view.stageId === facet.id,
    handleClick: () => toggleFacet("stageId", facet.id),
  }));

  const teams = [
    ...new Map(
      leads.filter((lead) => lead.team).map((lead) => [lead.team!.id, lead.team!]),
    ).values(),
  ];

  const teamRows: NavEntry[] = teams.map((team) => ({
    title: team.name,
    url: boardHref,
    icon: IconUsersGroup,
    count: leads.filter((lead) => lead.teamId === team.id && lead.status === "OPEN").length,
    variant: "inbox-tab",
    isActive: view.teamId === team.id,
    handleClick: () => toggleFacet("teamId", team.id),
  }));

  const sources = [...new Set(leads.map((lead) => lead.source))] as LeadSource[];

  const sourceRows: NavEntry[] = sources.map((source) => ({
    title: sourceLabel(t, source),
    url: boardHref,
    icon: SOURCE_DOT[source],
    count: leads.filter((lead) => lead.source === source && lead.status === "OPEN").length,
    variant: "inbox-tab",
    isActive: view.source === source,
    handleClick: () => toggleFacet("source", source),
  }));

  return [
    ...section(t("Pipelines"), pipelineRows),
    ...section(t("Views"), viewRows),
    ...section(t("Lead stages"), stageRows),
    ...section(t("Teams"), teamRows),
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
