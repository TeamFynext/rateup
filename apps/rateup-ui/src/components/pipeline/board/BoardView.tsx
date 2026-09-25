import {
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { IconAlertTriangle, IconPlus } from "@tabler/icons-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { hasActiveLeadFilters } from "@/backend/pipeline/pipeline.keys.ts";
import { useStageLeadsQuery } from "@/backend/pipeline/pipeline.query.tsx";
import type {
  Lead,
  LeadListParams,
  PipelineStage,
  PipelineStats,
  PipelineType,
} from "@/backend/pipeline/pipeline.types.ts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { STATUS_BAND } from "../pipeline.constants.tsx";
import { stageStatusHint, stageStatusLabel } from "../pipeline.labels.ts";
import { groupStagesIntoBands } from "../pipeline.utils.ts";
import { usePipelineTypeConfig } from "../pipelineTypes.ts";
import { StageFill } from "../shared/atoms.tsx";
import { useHorizontalWheelScroll } from "../shared/useHorizontalWheelScroll.ts";
import type { PipelineData } from "../usePipelineData.ts";
import { isLeadDragData, LeadCard } from "./LeadCard.tsx";

type StageStats = PipelineStats["stages"][number];

interface BoardViewProps {
  data: PipelineData;
  onOpenLead: (leadId: string) => void;
  onOpenConversation: (lead: Lead) => void;
  onQuickAdd: (stageId: string) => void;
  onMoveLead: (leadId: string, fromStageId: string, stage: PipelineStage) => void;
}

/**
 * Pulls the next page in as the bottom of the column comes into view.
 *
 * The observer watches the column's own scroll container rather than the
 * viewport: the board scrolls sideways and each column scrolls inside itself, so
 * a sentinel can be on screen in the page's terms while its column is nowhere
 * near the end. `rootMargin` starts the fetch a screenful early, which is what
 * makes a long column read as continuous rather than as pages.
 *
 * Two things this has to get right, both of which look like "scrolling does
 * nothing":
 *
 * - The sentinel mounts *after* the first page arrives, so the observer cannot
 *   be attached once on mount — it is attached when the node itself appears,
 *   which is why the node is held in state rather than a ref. Holding it in
 *   state also means the effect runs after every ref in the tree is set, so the
 *   column's scroll container is available to use as `root`.
 * - `IntersectionObserver` reports *changes*, not a standing state. A sentinel
 *   that is still on screen once a page has loaded never fires again, so the
 *   fetch is driven by an effect over "is it visible" rather than from the
 *   observer callback: when a page lands and the sentinel is still in view, the
 *   effect runs again and asks for the next one.
 */
function useInfiniteScroll({
  rootRef,
  hasNextPage,
  isFetching,
  fetchNextPage,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>;
  hasNextPage: boolean;
  isFetching: boolean;
  fetchNextPage: () => void;
}) {
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!sentinel) return;

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      root: rootRef.current,
      rootMargin: "200px",
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, rootRef]);

  useEffect(() => {
    if (isVisible && hasNextPage && !isFetching) fetchNextPage();
  }, [isVisible, hasNextPage, isFetching, fetchNextPage]);

  return setSentinel;
}

/**
 * Wires an element up as a drop target and reports whether a card is over it.
 * `dropData` is read through a ref so re-registering the target on every render
 * is unnecessary, while a drop still sees the current value.
 */
function useDropTarget(dropData: Record<string, unknown>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const dataRef = useRef(dropData);
  dataRef.current = dropData;
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      getData: () => dataRef.current,
      canDrop: ({ source }) => isLeadDragData(source.data),
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    });
  }, []);

  return { ref, isOver };
}

/**
 * Memoised because the board is the expensive part of this screen.
 *
 * Every keystroke in the header writes to the pipeline store, which re-renders
 * the page and the board. Without this, that cascade reaches every loaded card
 * in every column on each character typed. The props are all stable between
 * those renders — `params` only changes once the search debounce fires, the
 * stats rows come from one query result, and the callbacks are `useCallback`ed
 * upstream — so the columns simply do not re-render until their data does.
 */
const StageColumn = memo(function StageColumn({
  stage,
  pipelineId,
  params,
  stageStats,
  widestCount,
  rottingEnabled,
  pipelineType,
  onOpenLead,
  onOpenConversation,
  onQuickAdd,
}: Readonly<{
  stage: PipelineStage;
  pipelineId: string | undefined;
  params: LeadListParams;
  /** Whole-column figures. Absent until the counts land. */
  stageStats: StageStats | undefined;
  widestCount: number;
  rottingEnabled: boolean;
  pipelineType: PipelineType;
  onOpenLead: (leadId: string) => void;
  onOpenConversation: (lead: Lead) => void;
  onQuickAdd: (stageId: string) => void;
}>) {
  const { t } = useTranslation();
  const { ref, isOver } = useDropTarget({ stageId: stage.id });
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Each column asks for its own cards, so the filters are applied per stage: a
  // column with one match returns it rather than losing the page to a busier one.
  const query = useStageLeadsQuery(pipelineId, stage.id, params);
  const leads = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  const setSentinel = useInfiniteScroll({
    rootRef: scrollRef,
    hasNextPage: query.hasNextPage,
    isFetching: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  });

  // The counts describe the whole column while the cards describe a filtered
  // slice of it, so under a filter the header reports what is actually on
  // screen instead of putting an unrelated total above it.
  const filtered = hasActiveLeadFilters(params);
  const count = filtered ? leads.length : (stageStats?.total ?? leads.length);
  const rottingCount = filtered ? 0 : (stageStats?.rotting ?? 0);
  const averageAge = stageStats?.avgDaysInStage ?? 0;

  return (
    <div
      ref={ref}
      className={cn(
        // Every column is the same surface whatever it does to a lead: the band
        // overhead already says which of them close one, and tinting the column
        // as well made Won and Lost read as a different kind of thing to drag
        // onto rather than one more step along.
        "bg-muted flex h-full min-h-0 w-[78vw] max-w-68.5 shrink-0 snap-start flex-col rounded-xl border transition-colors sm:w-68.5",
        isOver ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <div className="border-border border-b px-3.25 pt-3 pb-2.5">
        <div className="flex items-center gap-1.75">
          <span className="font-display text-foreground min-w-0 flex-1 truncate text-sm font-semibold">
            {stage.name}
          </span>
          <span className="border-border text-muted-foreground rounded-full border px-1.75 text-[11.5px] font-medium">
            {count}
          </span>
          {/* Only an open column takes a new lead: dropping one straight onto
              Won or Lost is a close, which the close dialog handles instead. */}
          {stage.status === "OPEN" ? (
            <button
              type="button"
              onClick={() => onQuickAdd(stage.id)}
              aria-label={t("Add lead to {stage}", { stage: stage.name })}
              className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            >
              <IconPlus className="size-3.75" />
            </button>
          ) : null}
        </div>

        <div className="mt-1.75 flex items-center gap-2.5 text-[11px]">
          {stage.status === "OPEN" && !filtered ? (
            <span className="text-muted-foreground">
              {t("{days}d avg in stage", { days: averageAge })}
            </span>
          ) : null}
          {rottingEnabled && rottingCount > 0 ? (
            <span className="text-destructive ml-auto inline-flex items-center gap-1 font-semibold">
              <IconAlertTriangle className="size-3" />
              {rottingCount}
            </span>
          ) : null}
        </div>

        <StageFill
          percent={widestCount ? Math.round((count / widestCount) * 100) : 0}
          color={stage.color}
        />
      </div>

      {/* `min-h-0` is what lets this scroll: without it a flex child refuses to
          shrink below its content and the overflow escapes to the page instead.
          The old `min-h-30` floor is gone — the column is now `h-full`, so the
          card list takes whatever height is left rather than setting its own.

          `overscroll-contain` stops the page behind moving when this list hits
          its end. It also stops the wheel chaining out to the board, but that is
          not what horizontal scrolling relies on — dropping it does not make the
          board scroll, so it stays. `useHorizontalWheelScroll` does that job. */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-2.25 overflow-y-auto overscroll-contain p-2.5"
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            rottingEnabled={rottingEnabled}
            pipelineType={pipelineType}
            onOpen={onOpenLead}
            onOpenConversation={onOpenConversation}
          />
        ))}

        {/* `isLoading`, not `isPending`: a column the stage facet has excluded is
            pending-but-idle, and would otherwise skeleton for ever. */}
        {query.isLoading
          ? [0, 1, 2].map((row) => <Skeleton key={row} className="h-21 shrink-0 rounded-lg" />)
          : null}

        {/* Always mounted, below the last card: the observer attaches to this
            node, so rendering it only once there is a next page would mean
            nothing was ever watching when the first page arrived. */}
        <div ref={setSentinel} className="flex shrink-0 flex-col gap-2.25">
          {query.isFetchingNextPage ? <Skeleton className="h-21 rounded-lg" /> : null}
        </div>

        {/* A failed page renders nothing at all otherwise: not pending, not
            successful, so neither the skeletons nor the empty state apply, and
            the column reads as an empty board rather than a broken request. */}
        {query.isError ? (
          <div className="border-destructive/40 text-destructive rounded-xl border-[1.5px] border-dashed px-3 py-4.5 text-center text-xs">
            <p>{t("Could not load this column.")}</p>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="mt-1.5 font-semibold underline underline-offset-2"
            >
              {t("Try again")}
            </button>
          </div>
        ) : null}

        {/* Only once the column is known to be empty — a column still loading
            its first page is not an invitation to drop. */}
        {!query.isLoading && !query.isError && leads.length === 0 ? (
          <div className="border-border text-muted-foreground rounded-xl border-[1.5px] border-dashed px-3 py-4.5 text-center text-xs">
            {filtered ? t("No leads match these filters.") : t("Drop a lead here")}
          </div>
        ) : null}
      </div>
    </div>
  );
});

/**
 * Stage columns grouped under their status band. Won and Lost are ordinary
 * columns now, so every drop is the same gesture and there is no separate zone.
 * Dropping is committed by one board-level monitor rather than per column, so a
 * card knows where it came from and where it landed in one place.
 */
export function BoardView({
  data,
  onOpenLead,
  onOpenConversation,
  onQuickAdd,
  onMoveLead,
}: Readonly<BoardViewProps>) {
  const { t } = useTranslation();
  const { pipeline, params, stats } = data;
  const typeConfig = usePipelineTypeConfig(pipeline);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useHorizontalWheelScroll(scrollRef);

  useEffect(() => {
    if (!pipeline) return;

    return monitorForElements({
      canMonitor: ({ source }) => isLeadDragData(source.data),
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0];
        if (!target || !isLeadDragData(source.data)) return;

        const { leadId, fromStageId } = source.data;

        const stageId = target.data.stageId;
        if (typeof stageId !== "string" || stageId === fromStageId) return;

        const stage = pipeline.stages.find((candidate) => candidate.id === stageId);
        // The column the card left is what the move has to take it out of, so
        // it travels with the drop rather than being looked up afterwards.
        if (stage) onMoveLead(leadId, fromStageId, stage);
      },
    });
  }, [pipeline, onMoveLead]);

  if (!pipeline) return null;

  const bands = groupStagesIntoBands(pipeline.stages);
  const statsByStage = new Map((stats?.stages ?? []).map((row) => [row.stageId, row]));

  // Scaled against the open columns only: a Won column holding every lead ever
  // closed would otherwise flatten every working column's bar to nothing.
  const widestCount = Math.max(
    1,
    ...pipeline.stages
      .filter((stage) => stage.status === "OPEN")
      .map((stage) => statsByStage.get(stage.id)?.total ?? 0),
  );

  return (
    // Only the horizontal axis scrolls out here — each column owns its own
    // vertical scroll, so the headers stay put while a long column scrolls
    // under them.
    //
    // The wheel needs `useHorizontalWheelScroll` to reach this element at all:
    // the columns are full height, so a wheel over the board lands on a card list
    // and is spent there. Letting it chain out instead — by dropping that list's
    // `overscroll-contain` — was tried and does not work.
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden p-4 sm:snap-none sm:p-6"
    >
      <div className="flex h-full items-stretch gap-4 sm:gap-6.5">
        {bands.map((band) => {
          const bandStyle = STATUS_BAND[band.status];
          const BandIcon = bandStyle.icon;
          const bandCount = band.stages.reduce(
            (total, stage) => total + (statsByStage.get(stage.id)?.total ?? 0),
            0,
          );

          return (
            <div key={band.key} className="flex h-full min-h-0 flex-col gap-2.5">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.75",
                  bandStyle.border,
                  bandStyle.surface,
                )}
              >
                <BandIcon className={cn("size-3.5 shrink-0", bandStyle.text)} />
                <span
                  className={cn(
                    "text-[11px] font-semibold tracking-[0.06em] uppercase",
                    bandStyle.text,
                  )}
                >
                  {stageStatusLabel(t, band.status, pipeline?.type)}
                </span>
                <span className={cn("text-[11px] font-bold opacity-75", bandStyle.text)}>
                  {typeConfig.cardTotal(bandCount)}
                </span>
                <span className="flex-1" />
                <span className="text-muted-foreground text-[10px]">
                  {stageStatusHint(t, band.status, pipeline?.type)}
                </span>
              </div>

              <div className="flex min-h-0 flex-1 items-stretch gap-3.25">
                {band.stages.map((stage) => (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    pipelineId={pipeline.id}
                    params={params}
                    stageStats={statsByStage.get(stage.id)}
                    widestCount={widestCount}
                    rottingEnabled={pipeline.rottingEnabled}
                    pipelineType={pipeline.type}
                    onOpenLead={onOpenLead}
                    onOpenConversation={onOpenConversation}
                    onQuickAdd={onQuickAdd}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
