import {
  IconCalendarX,
  IconChevronDown,
  IconChevronRight,
  IconMinus,
  IconRosetteDiscountCheck,
  IconLayoutRows,
  IconX,
} from "@tabler/icons-react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { hasActiveLeadFilters } from "@/backend/pipeline/pipeline.keys.ts";
import { useListLeadsQuery, useStageLeadsQuery } from "@/backend/pipeline/pipeline.query.tsx";
import type {
  Lead,
  LeadListParams,
  LeadPage,
  PipelineDetail,
  PipelineStage,
  PipelineStats,
} from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { STATUS_BAND, TASK_TYPE_ICON } from "../pipeline.constants.tsx";
import { stageStatusLabel } from "../pipeline.labels.ts";
import { daysIdle, daysInStage, isOverdue, isRotting, leadAgeDays } from "../pipeline.utils.ts";
import { AssigneeStack } from "../shared/AssigneeStack.tsx";
import { StageDot } from "../shared/atoms.tsx";
import { LeadAvatar } from "../shared/LeadAvatar.tsx";
import type { PipelineData } from "../usePipelineData.ts";

interface ListViewProps {
  data: PipelineData;
  onOpenLead: (leadId: string) => void;
  onBulkMove: (leadIds: string[], stage: PipelineStage) => void;
  onBulkAssign: (leadIds: string[], assigneeIds: string[]) => void;
}

/**
 * Column widths, shared by the header, the rows and the summary footer.
 *
 * All of them are hidden below `lg`: seven columns need about 1040px, and a phone
 * scrolling sideways through them is worse than a stacked row. Each row then
 * shows the lead plus a summary line (see the `lg:hidden` span), and the wide
 * table comes back intact from `lg` up. These strings are always the last
 * argument to `cn`, so their `hidden` wins the display conflict against a call
 * site's `flex`.
 */
const COLUMN = {
  stage: "hidden w-37.5 shrink-0 lg:flex",
  status: "hidden w-28 shrink-0 lg:block",
  assignees: "hidden w-33 shrink-0 lg:flex",
  next: "hidden w-42.5 shrink-0 lg:flex",
  stageAge: "hidden w-21 shrink-0 text-right lg:block",
  age: "hidden w-17.5 shrink-0 text-right lg:block",
} as const;

function HeaderCell({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <span
      className={cn(
        "text-muted-foreground text-[11.5px] font-semibold tracking-[0.04em] uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Memoised for the same reason as the board's cards: one row per lead loaded. */
const LeadRow = memo(function LeadRow({
  lead,
  pipeline,
  selected,
  onToggleSelected,
  onOpenLead,
}: Readonly<{
  lead: Lead;
  pipeline: PipelineDetail;
  selected: boolean;
  onToggleSelected: (leadId: string) => void;
  onOpenLead: (leadId: string) => void;
}>) {
  const { t } = useTranslation();
  const rotting = isRotting(lead, pipeline.rottingEnabled);
  const overdue = isOverdue(lead);
  const stage = pipeline.stages.find((candidate) => candidate.id === lead.stageId);
  const NextIcon =
    lead.status !== "OPEN"
      ? lead.status === "WON"
        ? IconRosetteDiscountCheck
        : IconMinus
      : lead.nextTask
        ? TASK_TYPE_ICON[lead.nextTask.type]
        : IconCalendarX;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenLead(lead.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpenLead(lead.id);
      }}
      className={cn(
        "border-border/60 hover:bg-muted/50 flex cursor-pointer items-center gap-3 border-b px-4 py-2.75 transition-colors",
        selected && "bg-primary/5",
      )}
    >
      <span onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelected(lead.id)}
          aria-label={t("Select {name}", { name: lead.name })}
        />
      </span>

      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <LeadAvatar name={lead.name} source={lead.source} />
        <span className="min-w-0">
          <span className="text-foreground block truncate text-[13.5px] font-medium">
            {lead.name}
          </span>
          <span className="text-muted-foreground block truncate text-[11px]">
            {lead.company ?? t("Direct customer")}
          </span>
          {/* Stands in for the columns that fold away below `lg` — stage, next
              step and how long it has sat. */}
          <span className="text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate text-[11px] lg:hidden">
            <StageDot color={stage?.color ?? null} className="size-1.5" />
            {lead.stage.name}
            <span className="bg-border h-2.5 w-px" />
            <span className={cn(overdue && "text-destructive font-semibold")}>
              {lead.status !== "OPEN"
                ? lead.status === "WON"
                  ? t("Won")
                  : t("Lost")
                : (lead.nextTask?.title ?? t("No next step"))}
            </span>
            <span className="bg-border h-2.5 w-px" />
            <span className={cn(rotting && "text-destructive font-semibold")}>
              {rotting
                ? t("{days}d idle", { days: daysIdle(lead) })
                : t("{days}d", { days: daysInStage(lead) })}
            </span>
          </span>
        </span>
      </span>

      <span className={cn("flex items-center gap-1.5", COLUMN.stage)}>
        <StageDot color={stage?.color ?? null} className="size-1.75" />
        <span className="text-foreground truncate text-xs font-semibold">
          {lead.status === "LOST"
            ? t("{stage} (lost)", { stage: lead.stage.name })
            : lead.stage.name}
        </span>
      </span>

      <span className={COLUMN.status}>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            STATUS_BAND[lead.stage.status].surface,
            STATUS_BAND[lead.stage.status].text,
          )}
        >
          {stageStatusLabel(t, lead.stage.status)}
        </span>
      </span>

      <span className={cn("flex items-center gap-2", COLUMN.assignees)}>
        {lead.assignees.length > 0 ? (
          <>
            <AssigneeStack assignees={lead.assignees} max={2} />
            <span className="min-w-0">
              <span className="text-foreground block truncate text-xs">
                {lead.assignees.length === 1
                  ? lead.assignees[0].name
                  : t("{total} assignees", { total: lead.assignees.length })}
              </span>
              <span className="text-muted-foreground block text-[10px]">
                {lead.team?.name ?? t("No team")}
              </span>
            </span>
          </>
        ) : (
          <span className="text-muted-foreground text-[11px]">{t("Unassigned")}</span>
        )}
      </span>

      <span
        className={cn(
          "flex items-center gap-1.5 text-xs",
          COLUMN.next,
          lead.status !== "OPEN"
            ? "text-muted-foreground"
            : overdue
              ? "text-destructive font-semibold"
              : lead.nextTask
                ? "text-foreground"
                : "font-semibold text-amber-700 dark:text-amber-500",
        )}
      >
        <NextIcon className="size-3 shrink-0" />
        <span className="truncate">
          {lead.status !== "OPEN" ? "—" : (lead.nextTask?.title ?? t("None scheduled"))}
        </span>
      </span>

      <span
        className={cn(
          "text-xs font-bold",
          COLUMN.stageAge,
          rotting ? "text-destructive" : "text-foreground",
        )}
      >
        {rotting
          ? t("{days}d idle", { days: daysIdle(lead) })
          : t("{days}d", { days: daysInStage(lead) })}
      </span>

      <span className={cn("text-muted-foreground text-xs", COLUMN.age)}>
        {t("{days}d", { days: leadAgeDays(lead) })}
      </span>
    </div>
  );
});

/** The shared tail of a paged list: a loading row, then a way to ask for more. */
function LoadMore({
  isPending,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
}: Readonly<{
  isPending: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}>) {
  const { t } = useTranslation();

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-9" />
        ))}
      </div>
    );
  }

  if (!hasNextPage) return null;

  return (
    <div className="border-border/60 flex justify-center border-b py-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        disabled={isFetchingNextPage}
        onClick={() => fetchNextPage()}
      >
        {isFetchingNextPage ? t("Loading…") : t("Load more")}
      </Button>
    </div>
  );
}

/**
 * One board column's rows.
 *
 * Each group runs its own paged query, the same way a board column does — which
 * is what keeps a stage holding a single match visible instead of losing the
 * page to a busier stage.
 */
function StageGroup({
  stage,
  pipeline,
  pipelineId,
  params,
  stageStats,
  collapsed,
  onToggleCollapsed,
  selected,
  onToggleSelected,
  onOpenLead,
}: Readonly<{
  stage: PipelineStage;
  pipeline: PipelineDetail;
  pipelineId: string | undefined;
  params: LeadListParams;
  stageStats: PipelineStats["stages"][number] | undefined;
  collapsed: boolean;
  onToggleCollapsed: (stageId: string) => void;
  selected: string[];
  onToggleSelected: (leadId: string) => void;
  onOpenLead: (leadId: string) => void;
}>) {
  const { t } = useTranslation();
  const query = useStageLeadsQuery(pipelineId, stage.id, params);
  const leads = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  // Under a filter the count has to describe the rows below it; with no filter
  // the whole-column figure is both true and more useful.
  const count = hasActiveLeadFilters(params) ? leads.length : (stageStats?.total ?? leads.length);
  const ChevronIcon = collapsed ? IconChevronRight : IconChevronDown;

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggleCollapsed(stage.id)}
        className="bg-background hover:bg-muted/60 border-border flex w-full items-center gap-2.25 border-b px-4 py-2.25 text-left transition-colors"
      >
        <ChevronIcon className="text-muted-foreground size-3.5" />
        <StageDot color={stage.color} className="size-2" />
        <span className="font-nunito text-foreground text-[13px] font-semibold">{stage.name}</span>
        <span className="bg-muted border-border text-muted-foreground rounded-full border px-1.75 text-[11.5px] font-medium">
          {count}
        </span>
      </button>

      {collapsed ? null : (
        <>
          {leads.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              pipeline={pipeline}
              selected={selected.includes(lead.id)}
              onToggleSelected={onToggleSelected}
              onOpenLead={onOpenLead}
            />
          ))}

          {!query.isLoading && leads.length === 0 ? (
            <div className="text-muted-foreground border-border/60 border-b px-4 py-3 text-center text-xs">
              {t("No leads match these filters.")}
            </div>
          ) : null}

          <LoadMore
            isPending={query.isLoading}
            isFetchingNextPage={query.isFetchingNextPage}
            hasNextPage={query.hasNextPage}
            fetchNextPage={query.fetchNextPage}
          />
        </>
      )}
    </div>
  );
}

/** Every lead on the board in one list, ungrouped. */
function UngroupedList({
  pipeline,
  pipelineId,
  params,
  selected,
  onToggleSelected,
  onOpenLead,
}: Readonly<{
  pipeline: PipelineDetail;
  pipelineId: string | undefined;
  params: LeadListParams;
  selected: string[];
  onToggleSelected: (leadId: string) => void;
  onOpenLead: (leadId: string) => void;
}>) {
  const { t } = useTranslation();
  const query = useListLeadsQuery(pipelineId, params);
  const leads = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  return (
    <>
      {leads.map((lead) => (
        <LeadRow
          key={lead.id}
          lead={lead}
          pipeline={pipeline}
          selected={selected.includes(lead.id)}
          onToggleSelected={onToggleSelected}
          onOpenLead={onOpenLead}
        />
      ))}

      {!query.isLoading && leads.length === 0 ? (
        <div className="text-muted-foreground p-10 text-center text-sm">
          {t("No leads match these filters.")}
        </div>
      ) : null}

      <LoadMore
        isPending={query.isLoading}
        isFetchingNextPage={query.isFetchingNextPage}
        hasNextPage={query.hasNextPage}
        fetchNextPage={query.fetchNextPage}
      />
    </>
  );
}

export function ListView({ data, onOpenLead, onBulkMove, onBulkAssign }: Readonly<ListViewProps>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { pipeline, params, stats, members } = data;
  const [grouped, setGrouped] = useState(true);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  if (!pipeline) return null;

  const filtered = hasActiveLeadFilters(params);
  const statsByStage = new Map((stats?.stages ?? []).map((row) => [row.stageId, row]));

  const toggleSelected = (leadId: string) =>
    setSelected((previous) =>
      previous.includes(leadId) ? previous.filter((id) => id !== leadId) : [...previous, leadId],
    );

  const toggleCollapsed = (stageId: string) =>
    setCollapsed((previous) =>
      previous.includes(stageId)
        ? previous.filter((key) => key !== stageId)
        : [...previous, stageId],
    );

  /**
   * Selects what is on screen.
   *
   * The rows live in one cache entry per group, so the ids are read from the
   * cache on click rather than mirrored into state as the pages arrive — a copy
   * would go stale the moment a page loaded or a card moved.
   */
  const selectAllLoaded = () => {
    const lists = queryClient.getQueriesData<InfiniteData<LeadPage>>({
      queryKey: ["pipeline", "leads", pipeline.id],
    });
    const ids = new Set<string>();
    for (const [, cached] of lists) {
      for (const page of cached?.pages ?? []) {
        for (const lead of page.items) ids.add(lead.id);
      }
    }
    // The bulk endpoint takes 200 at a time; beyond that this would fail on send.
    setSelected([...ids].slice(0, 200));
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="bg-card border-border flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-6">
        <span className="text-muted-foreground text-[13px]">
          {t("{total} leads · {open} open", {
            total: stats?.totals.leads ?? 0,
            open: stats?.totals.open ?? 0,
          })}
        </span>
        <Button
          variant={grouped ? "secondary" : "outline"}
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setGrouped((previous) => !previous)}
        >
          <IconLayoutRows className="size-3.5" />
          {t("Group by lead stage")}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-6 sm:px-6">
        <div className="bg-card border-border mt-4 overflow-hidden rounded-xl border shadow-xs lg:min-w-270">
          <div className="bg-muted border-border flex items-center gap-3 border-b px-4 py-2.75">
            <Checkbox
              checked={selected.length > 0}
              onCheckedChange={(checked) => (checked ? selectAllLoaded() : setSelected([]))}
              aria-label={t("Select all loaded leads")}
            />
            <HeaderCell className="min-w-0 flex-1">{t("Lead")}</HeaderCell>
            <HeaderCell className={COLUMN.stage}>{t("Lead stage")}</HeaderCell>
            <HeaderCell className={COLUMN.status}>{t("Status")}</HeaderCell>
            <HeaderCell className={COLUMN.assignees}>{t("Assignees")}</HeaderCell>
            <HeaderCell className={COLUMN.next}>{t("Next activity")}</HeaderCell>
            <HeaderCell className={COLUMN.stageAge}>{t("In stage")}</HeaderCell>
            <HeaderCell className={COLUMN.age}>{t("Age")}</HeaderCell>
          </div>

          {grouped ? (
            // Every column is listed, empty ones included: a stage is part of the
            // board's shape, and hiding it would make a filter that matched
            // nothing there look like a column that no longer exists.
            pipeline.stages.map((stage) => (
              <StageGroup
                key={stage.id}
                stage={stage}
                pipeline={pipeline}
                pipelineId={pipeline.id}
                params={params}
                stageStats={statsByStage.get(stage.id)}
                collapsed={collapsed.includes(stage.id)}
                onToggleCollapsed={toggleCollapsed}
                selected={selected}
                onToggleSelected={toggleSelected}
                onOpenLead={onOpenLead}
              />
            ))
          ) : (
            <UngroupedList
              pipeline={pipeline}
              pipelineId={pipeline.id}
              params={params}
              selected={selected}
              onToggleSelected={toggleSelected}
              onOpenLead={onOpenLead}
            />
          )}

          {/* Whole-board figures, so they are only shown when the rows above are
              the whole board too. Under a filter they would read as a summary of
              a list they do not describe. */}
          {!filtered && stats ? (
            <div className="bg-muted sticky bottom-0 flex items-center gap-3 px-4 py-3">
              <span className="w-4 shrink-0" />
              <span className="text-foreground min-w-0 flex-1 text-xs font-semibold">
                {t("{total} leads", { total: stats.totals.leads })}
              </span>
              <span className={cn("text-muted-foreground text-xs", COLUMN.stage)}>
                {t("{total} stages", { total: pipeline.stages.length })}
              </span>
              <span className={cn("text-muted-foreground text-xs", COLUMN.status)} />
              <span className={cn("text-muted-foreground text-xs", COLUMN.assignees)}>
                {t("{total} assignees", {
                  total: stats.assignees.filter((row) => row.assigneeId).length,
                })}
              </span>
              <span className={cn("text-destructive text-xs font-bold", COLUMN.next)}>
                {t("{total} without a next step", { total: stats.totals.noactivity })}
              </span>
              <span className={cn("text-foreground text-xs font-semibold", COLUMN.stageAge)}>
                {t("{days}d", { days: stats.totals.avgDaysInStage })}
              </span>
              <span className={cn("text-foreground text-xs font-semibold", COLUMN.age)}>
                {t("{days}d", { days: stats.totals.avgAgeDays })}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="bg-sidebar absolute bottom-5.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-xl px-3 py-2.25 text-white shadow-lg">
          <span className="px-2 text-xs font-semibold">
            {t("{total} selected", { total: selected.length })}
          </span>
          <span className="h-5 w-px bg-white/20" />

          {pipeline.stages.slice(0, 3).map((stage) => (
            <Button
              key={stage.id}
              variant="ghost"
              size="sm"
              className="h-auto rounded-lg px-2.75 py-1.75 text-xs font-semibold text-white/90 hover:bg-white/10 hover:text-white"
              onClick={() => {
                onBulkMove(selected, stage);
                setSelected([]);
              }}
            >
              → {stage.name}
            </Button>
          ))}

          {members.slice(0, 3).map((member) => (
            <Button
              key={member.id}
              variant="ghost"
              size="sm"
              className="h-auto gap-1.5 rounded-lg px-2.75 py-1.75 text-xs font-semibold text-white/90 hover:bg-white/10 hover:text-white"
              onClick={() => {
                onBulkAssign(selected, [member.id]);
                setSelected([]);
              }}
            >
              <LeadAvatar
                name={member.name}
                photo={member.profilePhoto}
                tone="person"
                colorKey={member.id}
                size="sm"
              />
              {member.name?.split(" ")[0]}
            </Button>
          ))}

          <Button
            variant="ghost"
            size="icon"
            className="ml-1 size-6 text-white/60 hover:bg-white/10 hover:text-white"
            onClick={() => setSelected([])}
            aria-label={t("Clear selection")}
          >
            <IconX className="size-3.75" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
