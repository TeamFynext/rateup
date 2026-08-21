import { useTranslation } from "react-i18next";

import type { Lead, PipelineDetail, PipelineStage } from "@/backend/pipeline/pipeline.types.ts";
import { cn } from "@/lib/utils";

import { stageStatusLabel } from "../pipeline.labels.ts";
import { daysInStage } from "../pipeline.utils.ts";

interface LeadStageStepperProps {
  lead: Lead;
  pipeline: PipelineDetail;
  onMoveStage: (stage: PipelineStage) => void;
}

/**
 * The lead's position in the funnel as a segmented bar — every stage is a
 * button, so the drawer can move a lead without going back to the board. Stages
 * behind the current one read as done, ahead of it as still to come.
 */
export function LeadStageStepper({ lead, pipeline, onMoveStage }: Readonly<LeadStageStepperProps>) {
  const { t } = useTranslation();
  const currentIndex = pipeline.stages.findIndex((stage) => stage.id === lead.stageId);
  const stage = pipeline.stages[currentIndex];
  const closed = lead.status !== "OPEN";

  // A board can carry a lot of columns. Past this many the labels are too
  // narrow to read, and the segments become plain bars — the line underneath
  // already names the stage the lead is on.
  const labelled = pipeline.stages.length <= 6;

  return (
    <div className="border-border shrink-0 border-b px-5 py-3.5">
      <div className="flex items-center gap-[3px]">
        {pipeline.stages.map((candidate, index) => (
          <button
            key={candidate.id}
            type="button"
            title={candidate.name}
            aria-label={candidate.name}
            disabled={closed || index === currentIndex}
            onClick={() => onMoveStage(candidate)}
            className={cn(
              // min-w-0 is what keeps a long funnel inside the drawer: without it
              // each segment refuses to shrink below its label.
              "min-w-0 flex-1 overflow-hidden",
              "first:rounded-l-md last:rounded-r-md",
              "disabled:cursor-default not-disabled:cursor-pointer not-disabled:hover:brightness-95",
              labelled ? "h-6.5 px-1 text-[10px] font-extrabold" : "h-2.5",
              index === currentIndex && "bg-primary text-primary-foreground",
              index < currentIndex && "bg-primary/15 text-primary",
              index > currentIndex && "bg-muted text-muted-foreground",
            )}
          >
            {labelled ? (
              <span className="block truncate">{candidate.short ?? candidate.name}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        {/* The stage name is its own element because it is bold, so the rest of
            the line is assembled from whole translated clauses joined by the
            separator rather than from one interpolated sentence. */}
        <span className="text-muted-foreground truncate text-xs">
          <span className="text-foreground font-semibold">{lead.stage.name}</span>
          {labelled
            ? null
            : ` ${t("(stage {index} of {total})", {
                index: currentIndex + 1,
                total: pipeline.stages.length,
              })}`}
          {" · "}
          {t("{percent}% likely", { percent: lead.stage.probability })}
          {" · "}
          {t("{days}d in stage", { days: daysInStage(lead) })}
        </span>
        {stage ? (
          <span
            className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
            // Stage colours are picked per org and stored as hex, so there is no
            // class that names them.
            style={
              stage.color ? { backgroundColor: `${stage.color}1f`, color: stage.color } : undefined
            }
          >
            {stageStatusLabel(t, stage.status)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
