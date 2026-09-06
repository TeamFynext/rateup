import {
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { IconAlertTriangle, IconPlus } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Lead, PipelineStage } from "@/backend/pipeline/pipeline.types.ts";
import { cn } from "@/lib/utils";

import { STATUS_BAND } from "../pipeline.constants.tsx";
import { stageStatusHint, stageStatusLabel } from "../pipeline.labels.ts";
import { daysInStage, groupStagesIntoBands, isRotting, leadsInStage } from "../pipeline.utils.ts";
import { StageFill } from "../shared/atoms.tsx";
import { useHorizontalWheelScroll } from "../shared/useHorizontalWheelScroll.ts";
import type { PipelineData } from "../usePipelineData.ts";
import { isLeadDragData, LeadCard } from "./LeadCard.tsx";

interface BoardViewProps {
  data: PipelineData;
  onOpenLead: (leadId: string) => void;
  onOpenConversation: (lead: Lead) => void;
  onQuickAdd: (stageId: string) => void;
  onMoveLead: (leadId: string, stage: PipelineStage) => void;
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

function StageColumn({
  stage,
  leads,
  widestCount,
  rottingEnabled,
  onOpenLead,
  onOpenConversation,
  onQuickAdd,
}: Readonly<{
  stage: PipelineStage;
  leads: Lead[];
  widestCount: number;
  rottingEnabled: boolean;
  onOpenLead: (leadId: string) => void;
  onOpenConversation: (lead: Lead) => void;
  onQuickAdd: (stageId: string) => void;
}>) {
  const { t } = useTranslation();
  const { ref, isOver } = useDropTarget({ stageId: stage.id });

  const rottingCount = leads.filter((lead) => isRotting(lead, rottingEnabled)).length;
  const averageAge = leads.length
    ? Math.round(leads.reduce((total, lead) => total + daysInStage(lead), 0) / leads.length)
    : 0;

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
          <span className="font-nunito text-foreground min-w-0 flex-1 truncate text-sm font-semibold">
            {stage.name}
          </span>
          <span className="border-border text-muted-foreground rounded-full border px-1.75 text-[11.5px] font-medium">
            {leads.length}
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
          {stage.status === "OPEN" ? (
            <span className="text-muted-foreground">
              {t("{days}d avg in stage", { days: averageAge })}
            </span>
          ) : null}
          {rottingCount > 0 ? (
            <span className="text-destructive ml-auto inline-flex items-center gap-1 font-semibold">
              <IconAlertTriangle className="size-3" />
              {rottingCount}
            </span>
          ) : null}
        </div>

        <StageFill
          percent={widestCount ? Math.round((leads.length / widestCount) * 100) : 0}
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
      <div className="flex min-h-0 flex-1 flex-col gap-2.25 overflow-y-auto overscroll-contain p-2.5">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            rottingEnabled={rottingEnabled}
            onOpen={onOpenLead}
            onOpenConversation={onOpenConversation}
          />
        ))}
        {leads.length === 0 ? (
          <div className="border-border text-muted-foreground rounded-xl border-[1.5px] border-dashed px-3 py-4.5 text-center text-xs">
            {t("Drop a lead here")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
  const { pipeline, visibleLeads } = data;

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
        if (stage) onMoveLead(leadId, stage);
      },
    });
  }, [pipeline, onMoveLead]);

  if (!pipeline) return null;

  const bands = groupStagesIntoBands(pipeline.stages);
  // Scaled against the open columns only: a Won column holding every lead ever
  // closed would otherwise flatten every working column's bar to nothing.
  const widestCount = Math.max(
    1,
    ...pipeline.stages
      .filter((stage) => stage.status === "OPEN")
      .map((stage) => leadsInStage(visibleLeads, stage.id).length),
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
            (total, stage) => total + leadsInStage(visibleLeads, stage.id).length,
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
                  {stageStatusLabel(t, band.status)}
                </span>
                <span className={cn("text-[11px] font-bold opacity-75", bandStyle.text)}>
                  {t("{total} leads", { total: bandCount })}
                </span>
                <span className="flex-1" />
                <span className="text-muted-foreground text-[10px]">
                  {stageStatusHint(t, band.status)}
                </span>
              </div>

              <div className="flex min-h-0 flex-1 items-stretch gap-3.25">
                {band.stages.map((stage) => (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    leads={leadsInStage(visibleLeads, stage.id)}
                    widestCount={widestCount}
                    rottingEnabled={pipeline.rottingEnabled}
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
