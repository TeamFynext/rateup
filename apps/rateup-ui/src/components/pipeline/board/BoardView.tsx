import {
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { IconAlertTriangle, IconCircleX, IconPlus, IconTrophy } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Lead, PipelineStage } from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { LIFECYCLE_BAND } from "../pipeline.constants.tsx";
import { daysInStage, groupStagesIntoBands, isRotting, leadsInStage } from "../pipeline.utils.ts";
import { StageFill } from "../shared/atoms.tsx";
import type { PipelineData } from "../usePipelineData.ts";
import { isLeadDragData, LeadCard } from "./LeadCard.tsx";

interface BoardViewProps {
  data: PipelineData;
  onOpenLead: (leadId: string) => void;
  onOpenConversation: (lead: Lead) => void;
  onQuickAdd: (stageId: string) => void;
  onMoveLead: (leadId: string, stage: PipelineStage) => void;
  onMarkLost: (leadId: string) => void;
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
        "bg-muted/50 flex h-full min-h-0 w-[78vw] max-w-68.5 shrink-0 snap-start flex-col rounded-xl border transition-colors sm:w-68.5",
        isOver
          ? "border-primary bg-primary/5"
          : // Landing here closes the lead won, so the column that does it reads
            // as the end of the funnel rather than one more step along it.
            stage.isWon
            ? "border-green-600/40 bg-green-600/5"
            : "border-border",
      )}
    >
      <div className="border-border border-b p-3">
        <div className="flex items-center gap-2">
          {stage.isWon ? (
            <IconTrophy
              className="size-3.5 shrink-0 text-green-700 dark:text-green-500"
              title={t("Leads dropped here are marked won")}
            />
          ) : null}
          <span className="font-nunito text-foreground min-w-0 flex-1 truncate text-[13px] font-extrabold">
            {stage.name}
          </span>
          <span className="bg-background text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-bold">
            {leads.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => onQuickAdd(stage.id)}
            aria-label={t("Add lead to {stage}", { stage: stage.name })}
          >
            <IconPlus className="size-3.5" />
          </Button>
        </div>

        <div className="mt-1.5 flex items-center gap-2.5 text-[11px]">
          <span className="text-primary font-bold">
            {t("{percent}% likely", { percent: stage.probability })}
          </span>
          <span className="bg-border h-2.5 w-px" />
          <span className="text-muted-foreground">{t("{days}d avg", { days: averageAge })}</span>
          {rottingCount > 0 ? (
            <span className="text-destructive ml-auto inline-flex items-center gap-1 font-bold">
              <IconAlertTriangle className="size-3" />
              {rottingCount}
            </span>
          ) : null}
        </div>

        <StageFill
          percent={widestCount ? Math.round((leads.length / widestCount) * 100) : 0}
          fillClassName="bg-green-600 dark:bg-green-500"
        />
      </div>

      {/* `min-h-0` is what lets this scroll: without it a flex child refuses to
          shrink below its content and the overflow escapes to the page instead.
          The old `min-h-30` floor is gone — the column is now `h-full`, so the
          card list takes whatever height is left rather than setting its own. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain p-2.5">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            rottingEnabled={rottingEnabled}
            stageColor={stage.color}
            onOpen={onOpenLead}
            onOpenConversation={onOpenConversation}
          />
        ))}
        {leads.length === 0 ? (
          <div className="border-border text-muted-foreground rounded-xl border border-dashed p-5 text-center text-[11px]">
            {t("Drop a lead here")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LostDropZone({ lostCount }: Readonly<{ lostCount: number }>) {
  const { t } = useTranslation();
  const { ref, isOver } = useDropTarget({ lost: true });

  return (
    <div
      ref={ref}
      className={cn(
        "flex w-28 shrink-0 snap-start flex-col items-center justify-center gap-2 self-stretch rounded-xl border border-dashed p-3 text-center transition-colors sm:w-36 sm:p-4",
        isOver ? "border-destructive bg-destructive/5" : "border-border",
      )}
    >
      <IconCircleX
        className={cn("size-6", isOver ? "text-destructive" : "text-muted-foreground")}
      />
      {/* Two whole sentences rather than a shared "Lost" with a prefix spliced
          on: the long and short forms do not share a word order in every
          language, so each is translated on its own. */}
      <span className="text-foreground text-xs font-bold">
        <span className="hidden sm:inline">{t("Drop to mark Lost")}</span>
        <span className="sm:hidden">{t("Lost")}</span>
      </span>
      <span className="text-muted-foreground text-[11px]">
        {t("{total} lost so far", { total: lostCount })}
      </span>
    </div>
  );
}

/**
 * Stage columns grouped under their lifecycle band, with a lost zone parked at
 * the end. Dropping is committed by one board-level monitor rather than per
 * column, so a card knows where it came from and where it landed in one place.
 */
export function BoardView({
  data,
  onOpenLead,
  onOpenConversation,
  onQuickAdd,
  onMoveLead,
  onMarkLost,
}: Readonly<BoardViewProps>) {
  const { t } = useTranslation();
  const { pipeline, visibleLeads, leads } = data;

  useEffect(() => {
    if (!pipeline) return;

    return monitorForElements({
      canMonitor: ({ source }) => isLeadDragData(source.data),
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0];
        if (!target || !isLeadDragData(source.data)) return;

        const { leadId, fromStageId } = source.data;

        if (target.data.lost === true) {
          onMarkLost(leadId);
          return;
        }

        const stageId = target.data.stageId;
        if (typeof stageId !== "string" || stageId === fromStageId) return;

        const stage = pipeline.stages.find((candidate) => candidate.id === stageId);
        if (stage) onMoveLead(leadId, stage);
      },
    });
  }, [pipeline, onMoveLead, onMarkLost]);

  if (!pipeline) return null;

  const bands = groupStagesIntoBands(pipeline.stages);
  const widestCount = Math.max(
    1,
    ...pipeline.stages.map((stage) => leadsInStage(visibleLeads, stage.id).length),
  );
  const lostCount = leads.filter((lead) => lead.status === "LOST").length;

  return (
    // Only the horizontal axis scrolls out here — each column owns its own
    // vertical scroll, so the headers and the Lost zone stay put while a long
    // column scrolls under them.
    <div className="min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden p-4 sm:snap-none sm:p-6">
      <div className="flex h-full items-stretch gap-4 sm:gap-6">
        {bands.map((band) => {
          const bandStyle = LIFECYCLE_BAND[band.category];
          const bandCount = band.stages.reduce(
            (total, stage) => total + leadsInStage(visibleLeads, stage.id).length,
            0,
          );

          return (
            <div key={band.key} className="flex h-full min-h-0 flex-col gap-2.5">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border border-dashed px-3 py-1.5",
                  bandStyle.border,
                  bandStyle.surface,
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-extrabold tracking-[0.06em] uppercase",
                    bandStyle.text,
                  )}
                >
                  {band.label ?? t("Unmapped stages")}
                </span>
                <span className={cn("text-[11px] font-bold opacity-75", bandStyle.text)}>
                  {t("{total} leads", { total: bandCount })}
                </span>
                <span className="flex-1" />
                <span className="text-muted-foreground text-[10px]">{t("syncs to inbox")}</span>
              </div>

              <div className="flex min-h-0 flex-1 items-stretch gap-3 sm:gap-3">
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

        <LostDropZone lostCount={lostCount} />
      </div>
    </div>
  );
}
