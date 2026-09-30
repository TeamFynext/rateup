import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { HubSpotSettings } from "@/backend/appsIntegration/hubspot/hubspot.api";
import {
  useHubSpotPipelines,
  useUpdateHubSpotSettings,
} from "@/backend/appsIntegration/hubspot/hubspot.query";
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

import { suggestStageMappings } from "./hubspotStageSuggestions";

/**
 * The HubSpot page's Deals card: the switch, the HubSpot pipeline leads go to, and which of
 * its stages each Leads board column sets. The switch saves as it is flipped; the pipeline
 * and the mapping save together, on the button, since a mapping only means something for
 * the pipeline it was made against.
 */
export function HubSpotDeals({ settings }: Readonly<{ settings: HubSpotSettings }>) {
  const { t } = useTranslation();
  const save = useUpdateHubSpotSettings();
  const { data: pipelines, isFetching: pipelinesLoading, refetch } = useHubSpotPipelines(true);

  const { data: boards } = usePipelinesQuery();
  const { data: board } = usePipelineQuery(findLeadsPipeline(boards)?.id);
  const columns = useMemo(
    () => [...(board?.stages ?? [])].sort((a, b) => a.order - b.order),
    [board],
  );

  const [pipelineId, setPipelineId] = useState(settings.dealPipelineId ?? "");
  const [mappings, setMappings] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.stageMappings.map((m) => [m.stageId, m.hubspotStageId])),
  );

  const stages = useMemo(
    () => pipelines?.find((pipeline) => pipeline.id === pipelineId)?.stages ?? [],
    [pipelines, pipelineId],
  );

  // A pipeline saved with nothing mapped yet opens on the suggestions, once both lists are in.
  const suggested = useRef(settings.stageMappings.length > 0);
  useEffect(() => {
    if (suggested.current || !stages.length || !columns.length) return;
    suggested.current = true;
    setMappings(suggestStageMappings(columns, stages));
  }, [stages, columns]);

  const pickPipeline = (id: string) => {
    setPipelineId(id);
    const next = pipelines?.find((pipeline) => pipeline.id === id)?.stages ?? [];
    setMappings(suggestStageMappings(columns, next));
    suggested.current = true;
  };

  // Only live columns and stages of the picked pipeline are sent; the rest is stale.
  const stageMappings = useMemo(
    () =>
      columns
        .filter((column) => stages.some((stage) => stage.id === mappings[column.id]))
        .map((column) => ({ stageId: column.id, hubspotStageId: mappings[column.id] })),
    [columns, stages, mappings],
  );

  const isDirty = useMemo(() => {
    if (!board || !pipelines) return false;
    if ((settings.dealPipelineId ?? "") !== pipelineId) return true;
    // Filtered like `stageMappings`: a saved mapping to a deleted column or stage is not an edit.
    const saved = new Map(
      settings.stageMappings
        .filter(
          (m) =>
            columns.some((column) => column.id === m.stageId) &&
            stages.some((stage) => stage.id === m.hubspotStageId),
        )
        .map((m) => [m.stageId, m.hubspotStageId]),
    );
    return (
      saved.size !== stageMappings.length ||
      stageMappings.some((m) => saved.get(m.stageId) !== m.hubspotStageId)
    );
  }, [board, pipelines, settings, pipelineId, columns, stages, stageMappings]);

  const pipelineItems = (pipelines ?? []).map((pipeline) => ({
    value: pipeline.id,
    label: pipeline.label,
  }));

  return (
    <IntegrationFormCard
      title={t("Deals")}
      description={t(
        "Leads on your Leads board become deals in HubSpot, on the lead's contact, and move to the stage mapped to their column. Stage changes made in HubSpot move the lead here.",
      )}
      actions={
        <Button
          onClick={() => save.mutate({ dealPipelineId: pipelineId, stageMappings })}
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
            <FieldLabel htmlFor="hubspot-sync-deals" className="text-sm font-medium">
              {t("Send leads to HubSpot as deals")}
            </FieldLabel>
            <FieldDescription className="text-xs">
              {t(
                "Nothing is sent until a pipeline is picked and saved. A lead's contact is added to HubSpot if it is not there yet.",
              )}
            </FieldDescription>
          </div>
          <Switch
            id="hubspot-sync-deals"
            checked={settings.syncDeals}
            disabled={save.isPending}
            onCheckedChange={(on) => save.mutate({ syncDeals: on })}
          />
        </Field>

        <Field orientation="horizontal" className="rounded-lg border border-border p-3">
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="hubspot-import-deals" className="text-sm font-medium">
              {t("Add new HubSpot deals to the Leads board")}
            </FieldLabel>
            <FieldDescription className="text-xs">
              {t(
                "Deals created in this pipeline become leads, in the column mapped to their stage. Deals in an unmapped stage are skipped.",
              )}
            </FieldDescription>
          </div>
          <Switch
            id="hubspot-import-deals"
            checked={settings.importDeals}
            disabled={save.isPending}
            onCheckedChange={(on) => save.mutate({ importDeals: on })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="hubspot-deal-pipeline">{t("HubSpot pipeline")}</FieldLabel>
          <div className="flex items-center gap-2 max-w-100">
            <Select
              items={pipelineItems}
              value={pipelineId || null}
              onValueChange={(value) => value && pickPipeline(value)}
              onOpenChange={(open) => open && refetch()}
            >
              <SelectTrigger id="hubspot-deal-pipeline" className="w-full">
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
          <StageMappingEditor
            rows={columns.map((column) => ({ id: column.id, label: column.name }))}
            options={stages.map((stage) => ({ value: stage.id, label: stage.label }))}
            value={Object.fromEntries(
              columns.map((column) => [
                column.id,
                stages.some((stage) => stage.id === mappings[column.id])
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
            optionsLabel={t("HubSpot stage")}
            unmappedLabel={t("Not synced")}
            unmappedHint={t("Leads in this column are not sent to HubSpot")}
            summary={(count, total) =>
              t(
                "{count} of {total} columns are not synced. Leads in them are not sent to HubSpot.",
                { count, total },
              )
            }
            empty={
              <p className="text-sm text-muted-foreground">{t("No pipeline columns found.")}</p>
            }
          />
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
