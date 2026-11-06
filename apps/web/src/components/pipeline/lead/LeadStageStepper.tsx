import { IconCheck, IconX } from "@tabler/icons-react";
import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { Lead, PipelineDetail, PipelineStage } from "@/backend/pipeline/pipeline.types.ts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { daysIdle, daysInStage, isRotting, leadAgeDays } from "../pipeline.utils.ts";

interface LeadStageStepperProps {
  lead: Lead;
  pipeline: PipelineDetail;
  onMoveStage: (stage: PipelineStage) => void;
}

/**
 * The lead's path through the open stages as a dot track; every dot is a button,
 * so the modal can move a lead without going back to the board. Won and Lost stay
 * off the track because the header's buttons own closing a lead.
 *
 * A closed lead still moves: the server treats the column as the authority, so
 * landing on an open one reopens it and clears its lost reason, as a drag does.
 */
export function LeadStageStepper({ lead, pipeline, onMoveStage }: Readonly<LeadStageStepperProps>) {
  const { t } = useTranslation();
  const openStages = pipeline.stages.filter((stage) => stage.status === "OPEN");
  const currentIndex = openStages.findIndex((stage) => stage.id === lead.stageId);
  const closed = lead.status !== "OPEN";
  const closingStage = pipeline.stages.find((stage) => stage.id === lead.stageId);
  const rotting = isRotting(lead, pipeline.rottingEnabled);

  // Past this many the labels are too narrow to read, so only the current dot
  // keeps its name.
  const labelled = openStages.length <= 7;

  const stats: ReactNode[] = [
    closed ? null : t("{percent}% likely", { percent: lead.stage.probability }),
    t("{days}d in stage", { days: daysInStage(lead) }),
    closed ? null : (
      <span key="idle" className={cn(rotting && "text-destructive font-medium")}>
        {rotting
          ? t("idle {days}d — stalled", { days: daysIdle(lead) })
          : t("idle {days}d", { days: daysIdle(lead) })}
      </span>
    ),
    t("{days}d old", { days: leadAgeDays(lead) }),
  ].filter(Boolean);

  return (
    <div className="border-border shrink-0 border-b px-6 pt-4 pb-3.5">
      <ol className="flex items-start">
        {openStages.map((stage, index) => {
          const isCurrent = index === currentIndex;
          // A closed lead has passed every open stage.
          const done = closed || index < currentIndex;
          const reached = closed || index <= currentIndex;
          const label = isCurrent
            ? stage.name
            : closed
              ? t("Reopen in {stage}", { stage: stage.name })
              : t("Move to {stage}", { stage: stage.name });
          return (
            <li key={stage.id} className="relative flex min-w-0 flex-1 flex-col items-center">
              {index > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-2.25 right-1/2 h-0.5 w-full",
                    reached ? "bg-primary/40" : "bg-border",
                  )}
                />
              ) : null}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={label}
                      aria-current={isCurrent ? "step" : undefined}
                      disabled={isCurrent}
                      onClick={() => onMoveStage(stage)}
                      className={cn(
                        "relative z-10 flex size-5 items-center justify-center rounded-full transition-transform",
                        "disabled:cursor-default not-disabled:cursor-pointer not-disabled:hover:scale-110",
                        "focus-visible:ring-ring/50 outline-none focus-visible:ring-3",
                        isCurrent && "bg-primary text-primary-foreground ring-primary/20 ring-4",
                        done && "bg-primary/15 text-primary",
                        !reached && "bg-background border-border border-2",
                      )}
                    >
                      {done ? <IconCheck className="size-3" stroke={3} /> : null}
                      {isCurrent ? (
                        <span className="bg-primary-foreground size-1.5 rounded-full" />
                      ) : null}
                    </button>
                  }
                />
                {isCurrent ? null : <TooltipContent>{label}</TooltipContent>}
              </Tooltip>
              {labelled || isCurrent ? (
                <span
                  className={cn(
                    "mt-1.5 block max-w-full truncate px-1 text-[11px]",
                    isCurrent ? "text-foreground font-semibold" : "text-muted-foreground",
                  )}
                >
                  {stage.short ?? stage.name}
                </span>
              ) : null}
            </li>
          );
        })}
        {closed ? (
          <li className="relative flex min-w-0 flex-1 flex-col items-center">
            <span aria-hidden className="bg-primary/40 absolute top-2.25 right-1/2 h-0.5 w-full" />
            <span
              className={cn(
                "relative z-10 flex size-5 items-center justify-center rounded-full ring-4",
                lead.status === "WON"
                  ? "bg-green-600/15 text-green-700 ring-green-600/10 dark:text-green-500"
                  : "bg-muted text-muted-foreground ring-muted",
              )}
            >
              {lead.status === "WON" ? (
                <IconCheck className="size-3" stroke={3} />
              ) : (
                <IconX className="size-3" stroke={3} />
              )}
            </span>
            <span className="text-foreground mt-1.5 block max-w-full truncate px-1 text-[11px] font-semibold">
              {closingStage?.short ?? lead.stage.name}
            </span>
          </li>
        ) : null}
      </ol>

      <p className="text-muted-foreground mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-xs">
        {stats.map((stat, index) => (
          <Fragment key={index}>
            {index > 0 ? <span aria-hidden>·</span> : null}
            {stat}
          </Fragment>
        ))}
      </p>
    </div>
  );
}
