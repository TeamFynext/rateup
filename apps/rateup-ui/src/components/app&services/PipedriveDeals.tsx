import { IconCircleCheck, IconCircleX, IconLoader2 } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { PipedriveSettings } from "@/backend/appsIntegration/pipedrive/pipedrive.api";
import {
  usePipedrivePipelines,
  useUpdatePipedriveSettings,
} from "@/backend/appsIntegration/pipedrive/pipedrive.query";
import { usePipelineQuery, usePipelinesQuery } from "@/backend/pipeline/pipeline.query.tsx";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { StageMappingEditor } from "@/components/dashboard/settings/integrations/mapping/StageMappingEditor.tsx";
import { findLeadsPipeline } from "@/components/pipeline/pipelineTypes.ts";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import { suggestPipedriveStageMappings } from "./pipedriveStageSuggestions";

/**
 * The Pipedrive page's Deals card: the switch, the Pipedrive pipeline leads go to, and which
 * of its stages each open Leads board column sets. Won and Lost columns are not mapped:
 * Pipedrive keeps won and lost as a deal's status, so they mark the deal instead. The switch
 * saves as it is flipped; the pipeline and the mapping save together, on the button.
 *
 * Pipedrive's ids are numbers; the Selects hold them as strings until they are saved.
 */
export function PipedriveDeals({ settings }: Readonly<{ settings: PipedriveSettings }>) {
  const { t } = useTranslation();
  const save = useUpdatePipedriveSettings();
  const { data: pipelines, isFetching: pipelinesLoading, refetch } = usePipedrivePipelines(true);

  const { data: boards } = usePipelinesQuery();
  const { data: board } = usePipelineQuery(findLeadsPipeline(boards)?.id);
  const columns = useMemo(
    () => [...(board?.stages ?? [])].sort((a, b) => a.order - b.order),
    [board],
  );
  const openColumns = useMemo(() => columns.filter((c) => c.status === "OPEN"), [columns]);
  const closedColumns = useMemo(() => columns.filter((c) => c.status !== "OPEN"), [columns]);

  const [pipelineId, setPipelineId] = useState(
    settings.dealPipelineId === null ? "" : String(settings.dealPipelineId),
  );
  const [mappings, setMappings] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.stageMappings.map((m) => [m.stageId, String(m.pipedriveStageId)])),
  );

  const stages = useMemo(
    () => pipelines?.find((pipeline) => String(pipeline.id) === pipelineId)?.stages ?? [],
    [pipelines, pipelineId],
  );

  // A pipeline saved with nothing mapped yet opens on the suggestions, once both lists are in.
  const suggested = useRef(settings.stageMappings.length > 0);
  useEffect(() => {
    if (suggested.current || !stages.length || !columns.length) return;
    suggested.current = true;
    setMappings(suggestPipedriveStageMappings(columns, stages));
  }, [stages, columns]);

  const pickPipeline = (id: string) => {
    setPipelineId(id);
    const next = pipelines?.find((pipeline) => String(pipeline.id) === id)?.stages ?? [];
    setMappings(suggestPipedriveStageMappings(columns, next));
    suggested.current = true;
  };

  // Only live open columns and stages of the picked pipeline are sent; the rest is stale.
  const stageMappings = useMemo(
    () =>
      openColumns
        .filter((column) => stages.some((stage) => String(stage.id) === mappings[column.id]))
        .map((column) => ({ stageId: column.id, pipedriveStageId: Number(mappings[column.id]) })),
    [openColumns, stages, mappings],
  );

  const isDirty = useMemo(() => {
    if (!board || !pipelines) return false;
    const savedPipeline = settings.dealPipelineId === null ? "" : String(settings.dealPipelineId);
    if (savedPipeline !== pipelineId) return true;
    // Filtered like `stageMappings`: a saved mapping to a deleted column or stage is not an edit.
    const saved = new Map(
      settings.stageMappings
        .filter(
          (m) =>
            openColumns.some((column) => column.id === m.stageId) &&
            stages.some((stage) => stage.id === m.pipedriveStageId),
        )
        .map((m) => [m.stageId, m.pipedriveStageId]),
    );
    return (
      saved.size !== stageMappings.length ||
      stageMappings.some((m) => saved.get(m.stageId) !== m.pipedriveStageId)
    );
  }, [board, pipelines, settings, pipelineId, openColumns, stages, stageMappings]);

  const pipelineItems = (pipelines ?? []).map((pipeline) => ({
    value: String(pipeline.id),
    label: pipeline.name,
  }));

  return (
    <IntegrationFormCard
      title={t("Deals")}
      description={t(
        "Leads on your Leads board become deals in Pipedrive, on the lead's contact, and move to the stage mapped to their column. Won and Lost columns mark the deal won or lost. Changes made in Pipedrive move the lead here.",
      )}
      actions={
        <Button
          onClick={() => save.mutate({ dealPipelineId: Number(pipelineId), stageMappings })}
          loading={save.isPending}
          disabled={!pipelineId || !isDirty}
        >
          {t("Save")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field orientation="horizontal" className="rounded-lg border border-border p-3">
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="pipedrive-sync-deals" className="text-sm font-medium">
              {t("Send leads to Pipedrive as deals")}
            </FieldLabel>
            <FieldDescription className="text-xs">
              {t(
                "Nothing is sent until a pipeline is picked and saved. A lead's contact is added to Pipedrive if it is not there yet.",
              )}
            </FieldDescription>
          </div>
          <Switch
            id="pipedrive-sync-deals"
            checked={settings.syncDeals}
            disabled={save.isPending}
            onCheckedChange={(on) => save.mutate({ syncDeals: on })}
          />
        </Field>

        <Field orientation="horizontal" className="rounded-lg border border-border p-3">
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="pipedrive-import-deals" className="text-sm font-medium">
              {t("Add new Pipedrive deals to the Leads board")}
            </FieldLabel>
            <FieldDescription className="text-xs">
              {t(
                "Deals created in this pipeline become leads, in the column mapped to their stage. Deals in an unmapped stage are skipped.",
              )}
            </FieldDescription>
          </div>
          <Switch
            id="pipedrive-import-deals"
            checked={settings.importDeals}
            disabled={save.isPending}
            onCheckedChange={(on) => save.mutate({ importDeals: on })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="pipedrive-deal-pipeline">{t("Pipedrive pipeline")}</FieldLabel>
          <div className="flex max-w-100 items-center gap-2">
            <Select
              items={pipelineItems}
              value={pipelineId || null}
              onValueChange={(value) => value && pickPipeline(String(value))}
              onOpenChange={(open) => open && refetch()}
            >
              <SelectTrigger id="pipedrive-deal-pipeline" className="w-full">
                <SelectValue placeholder={t("Choose a pipeline")} />
              </SelectTrigger>
              <SelectContent>
                {pipelineItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pipelinesLoading && (
              <IconLoader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            )}
          </div>
        </Field>

        {pipelineId && (
          <>
            <StageMappingEditor
              rows={openColumns.map((column) => ({ id: column.id, label: column.name }))}
              options={stages.map((stage) => ({ value: String(stage.id), label: stage.name }))}
              value={Object.fromEntries(
                openColumns.map((column) => [
                  column.id,
                  stages.some((stage) => String(stage.id) === mappings[column.id])
                    ? mappings[column.id]
                    : undefined,
                ]),
              )}
              onChange={(columnId, stageId) =>
                setMappings((prev) => {
                  const next = { ...prev };
                  if (stageId) next[columnId] = stageId;
                  else delete next[columnId];
                  return next;
                })
              }
              rowsLabel={t("Leads board column")}
              optionsLabel={t("Pipedrive stage")}
              unmappedLabel={t("Not synced")}
              unmappedHint={t("Leads in this column are not sent to Pipedrive")}
              summary={(count, total) =>
                t(
                  "{count} of {total} open columns are not synced. Leads in them are not sent to Pipedrive.",
                  { count, total },
                )
              }
              empty={
                <p className="text-sm text-muted-foreground">{t("No pipeline columns found.")}</p>
              }
            />

            {closedColumns.length > 0 && (
              <ul className="flex max-w-150 flex-col gap-2">
                {closedColumns.map((column) => (
                  <li key={column.id} className="grid grid-cols-2 items-center gap-x-3 text-sm">
                    <span className="truncate font-medium" title={column.name}>
                      {column.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {column.status === "WON" ? (
                        <IconCircleCheck className="size-4 shrink-0 text-emerald-600" />
                      ) : (
                        <IconCircleX className="size-4 shrink-0 text-destructive" />
                      )}
                      {column.status === "WON"
                        ? t("Marks the deal won")
                        : t("Marks the deal lost, with the lost reason")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {isDirty && (
          <p className="text-sm text-destructive">
            {t("Changes are not saved yet — save them to take effect.")}
          </p>
        )}
      </div>
    </IntegrationFormCard>
  );
}
