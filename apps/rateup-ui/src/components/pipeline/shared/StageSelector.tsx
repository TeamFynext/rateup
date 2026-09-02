import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { usePipelineQuery, usePipelinesQuery } from "@/backend/pipeline/pipeline.query";
import { useTeamFeatures } from "@/context/TeamFeaturesContext.tsx";
import { TeamFeature } from "@/types/enums.ts";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../../ui/select.tsx";
import { stageStatusLabel } from "../pipeline.labels.ts";
import { groupStagesIntoBands } from "../pipeline.utils.ts";
import { StageDot } from "./atoms.tsx";

/**
 * The columns of the org's board, for callers that have to decide whether to
 * render a stage field at all — `StageSelector` renders nothing without a board,
 * which would otherwise leave a labelled field with no control under it.
 *
 * Empty means one of three things, all of them ordinary: the org lacks the
 * Pipeline feature, it has no board yet, or the board has no columns.
 */
export function usePipelineStages() {
  // The pipeline endpoints sit behind `requireFeature`, so asking without the
  // feature would 403 on screens that never mention pipelines.
  const { allowedFeatures } = useTeamFeatures();
  const hasPipeline = allowedFeatures === null || allowedFeatures.has(TeamFeature.Pipeline);

  const { data: pipelines = [] } = usePipelinesQuery(hasPipeline);
  // One board per org today (`PIPELINE_LIMIT_PER_ORG`), and the server resolves
  // the same first-by-order board when it writes. Revisit together.
  const { data: board } = usePipelineQuery(hasPipeline ? pipelines[0]?.id : undefined);
  return board?.stages ?? [];
}

/**
 * Picks a column on the org's board — the replacement for `LifecycleSelector`
 * everywhere a contact is put on a stage.
 *
 * Grouped by status the way the board bands its columns, so Won and Lost are
 * pickable like any other column rather than hidden behind a separate "close"
 * gesture. Renders nothing when the org has no board: an empty select would
 * suggest the stages had gone missing.
 *
 * Fetches the board itself rather than taking it as a prop, so a caller only has
 * to hand over a value and a handler. The queries are cached under
 * `pipelineKeys`, so several of these on one screen cost one request.
 */
export function StageSelector({
  value,
  onChange,
  placeholder,
  className = "",
  disabled = false,
  all = false,
}: Readonly<{
  /** The chosen stage id, "" for none, or "all" when filtering with `all`. */
  value: string;
  onChange: (stageId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /**
   * Adds an "All stages" option, for filtering rather than setting. Its value is
   * the string `"all"` — the same sentinel `LifecycleSelector` and the contacts
   * table's other filters already use, which the API reads as "no filter".
   */
  all?: boolean;
}>) {
  const { t } = useTranslation();
  const stages = usePipelineStages();
  if (stages.length === 0) return null;

  const bands = groupStagesIntoBands(stages);
  const items = [
    ...(all ? [{ value: "all", label: t("All stages") }] : []),
    ...stages.map((stage) => ({ value: stage.id, label: stage.name })),
  ];

  return (
    <Select
      value={value || null}
      onValueChange={(next) => onChange(next ?? "")}
      items={items}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder ?? t("Select a stage")} />
      </SelectTrigger>
      <SelectContent>
        {all && (
          <>
            <SelectItem value="all">{t("All stages")}</SelectItem>
            <SelectSeparator />
          </>
        )}
        {bands.map((band, index) => (
          <Fragment key={band.key}>
            {index > 0 && <SelectSeparator />}
            <SelectGroup>
              <SelectLabel>{stageStatusLabel(t, band.status)}</SelectLabel>
              {band.stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <span className="flex items-center gap-2">
                    <StageDot color={stage.color} />
                    {stage.name}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </Fragment>
        ))}
      </SelectContent>
    </Select>
  );
}
