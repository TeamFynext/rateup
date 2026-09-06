import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  GetLeadMeta,
  GetLeadStageMapping,
} from "@/backend/appsIntegration/getlead/getlead.api";
import {
  useGetLeadSettings,
  useRefreshGetLeadMetaMutation,
  useSaveGetLeadSettingsMutation,
  useSaveGetLeadTriggersMutation,
} from "@/backend/appsIntegration/getlead/getlead.query";
import { usePipelineQuery, usePipelinesQuery } from "@/backend/pipeline/pipeline.query.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";

/** Sentinel for "do not sync a status for this column"; the Select has no empty value. */
const UNMAPPED = "__unmapped__";

/**
 * How long a refreshed list is trusted before opening a Select fetches again.
 *
 * Every refresh is one call against the org's GetLead rate limit, and mapping a
 * board means opening one Select per column in quick succession. A minute is
 * long enough that a pass down the page costs a single call, and short enough
 * that a status added in GetLead while this screen is open still shows up.
 */
const REFRESH_AFTER_MS = 60_000;

const TRIGGER_LABELS: Record<string, { title: string; help: string }> = {
  getlead_lead_create: {
    title: "New leads",
    help: "Push a lead to GetLead when it lands on the board.",
  },
  getlead_lead_update: {
    title: "Stage changes",
    help: "Update the GetLead lead when it moves between columns.",
  },
  getlead_note_create: {
    title: "Notes",
    help: "Copy notes added in RateUp onto the GetLead lead.",
  },
};

interface Props {
  /** Reference data from GetLead; the statuses are what columns map onto. */
  meta: GetLeadMeta | undefined;
}

/**
 * Maps board columns onto GetLead statuses.
 *
 * Without a mapping the push sends no `status_id` at all — `status_id` is a ULID,
 * so unlike Zoho's name-based `Lead_Status` there is nothing to fall back on and
 * a guess could only earn a 422. So until a column is mapped here, moving a lead
 * on the board changes nothing about its status in GetLead.
 */
export function GetLeadMapping({ meta }: Props) {
  const { t } = useTranslation();
  const { data: pipelines } = usePipelinesQuery();

  // The board to map. Most orgs have one; a picker for several is beyond what
  // this screen needs, so the first is used and named.
  const pipelineId = pipelines?.[0]?.id;
  const { data: pipeline } = usePipelineQuery(pipelineId);

  const { data: settings, isPending } = useGetLeadSettings(true);
  const saveMutation = useSaveGetLeadSettingsMutation();

  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [sourceId, setSourceId] = useState<string>(UNMAPPED);
  const [triggers, setTriggers] = useState<Record<string, boolean>>({});

  // Whether the source Select has been touched. Without this, the Direct
  // fallback below would re-apply after a refresh and undo a deliberate "None".
  const sourceTouched = useRef(false);

  // Hydrated once, from the first settings that arrive. Every later refetch is
  // this screen's own doing — a trigger toggle saving itself, or a refresh of
  // the reference data — and re-running would wipe mapping edits not yet saved.
  const hydrated = useRef(false);

  useEffect(() => {
    if (!settings || hydrated.current) return;
    hydrated.current = true;
    setMappings(
      Object.fromEntries(settings.stageMappings.map((m) => [m.stageId, m.getleadStatusId])),
    );
    setSourceId(settings.defaults?.sourceId ?? UNMAPPED);
    setTriggers(
      Object.fromEntries(settings.triggerSubscriptions.map((s) => [s.subscribed_field, s.active])),
    );
  }, [settings]);

  // Connecting seeds "Direct" server-side; this covers an org that connected
  // before that existed, so the screen opens on a sensible choice rather than
  // "None". Only ever fills a choice nobody has made.
  useEffect(() => {
    if (!meta || sourceTouched.current || settings?.defaults?.sourceId) return;
    const direct = meta.sources.find((s) => s.name.toLowerCase() === "direct")?.id;
    if (direct) setSourceId((prev) => (prev === UNMAPPED ? direct : prev));
  }, [meta, settings]);

  const stages = useMemo(
    () => [...(pipeline?.stages ?? [])].sort((a, b) => a.order - b.order),
    [pipeline],
  );

  // Base UI's Select renders the raw value unless the Root is given the
  // value->label pairs; without `items` the trigger shows a ULID.
  const statusItems = useMemo(
    () => [
      { value: UNMAPPED, label: t("Not synced") },
      ...(meta?.statuses ?? []).map((s) => ({ value: s.id, label: s.name })),
    ],
    [meta, t],
  );

  const sourceItems = useMemo(
    () => [
      { value: UNMAPPED, label: t("None") },
      ...(meta?.sources ?? []).map((s) => ({ value: s.id, label: s.name })),
    ],
    [meta, t],
  );

  const refreshMeta = useRefreshGetLeadMetaMutation();
  const lastRefreshedAt = useRef(0);

  // Statuses and sources live in GetLead, so a list rendered from the server's
  // 24h cache can be out of date by the time it is opened. Refreshing on open
  // means what you pick from is what GetLead has now.
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open || refreshMeta.isPending) return;
      if (Date.now() - lastRefreshedAt.current < REFRESH_AFTER_MS) return;
      lastRefreshedAt.current = Date.now();
      refreshMeta.mutate();
    },
    [refreshMeta],
  );

  // A column left unmapped is omitted rather than saved with an empty status:
  // "absent" is what the push reads as "send no status".
  const stageMappings = useMemo<GetLeadStageMapping[]>(() => {
    const statusName = (id: string) => meta?.statuses.find((s) => s.id === id)?.name;

    return stages
      .filter((stage) => mappings[stage.id] && mappings[stage.id] !== UNMAPPED)
      .map((stage) => ({
        stageId: stage.id,
        stageName: stage.name,
        getleadStatusId: mappings[stage.id],
        getleadStatusName: statusName(mappings[stage.id]),
      }));
  }, [stages, mappings, meta]);

  /**
   * Columns that will not move a lead's status in GetLead.
   *
   * Worth calling out rather than leaving to the Select's own "Not synced"
   * label: unmapped is the state that silently does nothing, and it is also the
   * default, so a board that was never mapped looks exactly like one that was
   * mapped deliberately.
   */
  const unmappedStages = useMemo(
    () => stages.filter((stage) => !mappings[stage.id] || mappings[stage.id] === UNMAPPED),
    [stages, mappings],
  );

  /**
   * Whether anything on screen differs from what is stored.
   *
   * Compared against the saved settings rather than tracked as an "edited"
   * flag, so moving a Select back to where it started stops warning. Only the
   * ids are compared: the status *names* are stored for readability and drift
   * on their own when something is renamed in GetLead, which is not an edit.
   *
   * A mapping whose column has since been deleted from the board also reads as
   * a change, which is right — saving is what prunes it.
   */
  const isDirty = useMemo(() => {
    // Until the board has loaded there are no columns to compare against, and
    // every saved mapping would read as removed.
    if (!settings || !pipeline) return false;

    const saved = new Map(settings.stageMappings.map((m) => [m.stageId, m.getleadStatusId]));
    if (saved.size !== stageMappings.length) return true;
    if (stageMappings.some((m) => saved.get(m.stageId) !== m.getleadStatusId)) return true;

    return (settings.defaults?.sourceId ?? UNMAPPED) !== sourceId;
  }, [settings, pipeline, stageMappings, sourceId]);

  // The toggles save themselves, so they are not part of what Save sends and
  // cannot make the screen dirty.
  const triggersMutation = useSaveGetLeadTriggersMutation();

  const handleTriggerChange = (key: string, active: boolean) => {
    const next = { ...triggers, [key]: active };
    setTriggers(next);
    triggersMutation.mutate(
      Object.entries(next).map(([subscribed_field, value]) => ({
        subscribed_field,
        active: value,
      })),
      // Put the switch back if the save did not land, rather than leaving it
      // showing a state GetLead does not have.
      { onError: () => setTriggers(triggers) },
    );
  };

  const handleSave = () => {
    // No `triggerSubscriptions`: the toggles are saved as they are flipped, and
    // sending a stale copy here would undo one toggled since this screen loaded.
    saveMutation.mutate({
      stageMappings,
      defaults: sourceId === UNMAPPED ? {} : { sourceId },
    });
  };

  if (isPending) {
    return (
      <Card className="p-4 flex items-center justify-center">
        <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Above the cards, not below them: the settings run past a screenful, so
          a footer button sits out of sight exactly while changes are being made.
          Sticky so it stays reachable, and so the unsaved warning cannot be
          scrolled away from. */}
      <div className="bg-background sticky top-0 z-10 flex items-center justify-between gap-4 py-3">
        {isDirty ? (
          <p className="text-sm text-destructive">
            {t("Changes are not saved yet — save them to take effect.")}
          </p>
        ) : (
          <span />
        )}
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? t("Saving...") : t("Save settings")}
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">{t("Lead stage mapping")}</h4>
          {/* The list can change under the cursor when a refresh lands; this
              says why rather than leaving it unexplained. */}
          {refreshMeta.isPending && (
            <IconLoader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {t(
            "Choose the GetLead status each board column should set. Columns left unmapped sync the lead's details but not its status.",
          )}
        </p>

        {/* Said once at the top as well as per row: with a long board the rows
            that need attention are the ones scrolled past. */}
        {unmappedStages.length > 0 && stages.length > 0 && (
          <p className="text-destructive mb-3 flex items-start gap-1.5 text-sm">
            <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {t(
                "{count} of {total} columns are not synced. Moving a lead into one of them updates its details in GetLead, but leaves its status alone.",
                { count: unmappedStages.length, total: stages.length },
              )}
            </span>
          </p>
        )}

        {stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No pipeline columns found.")}</p>
        ) : (
          <div className="flex flex-col gap-2 max-w-150">
            {stages.map((stage) => (
              <div key={stage.id} className="grid grid-cols-2 items-center gap-3">
                <div className="min-w-0">
                  <Label className="truncate" title={stage.name}>
                    {stage.name}
                  </Label>
                  {(!mappings[stage.id] || mappings[stage.id] === UNMAPPED) && (
                    <p className="text-destructive mt-0.5 flex items-center gap-1 text-xs">
                      <IconAlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {t("Not synced to any status")}
                    </p>
                  )}
                </div>
                <Select
                  items={statusItems}
                  onOpenChange={handleOpenChange}
                  value={mappings[stage.id] ?? UNMAPPED}
                  // Base UI hands back null when the value is cleared; treat that
                  // as unmapped rather than storing a null the save would trip on.
                  onValueChange={(value) =>
                    setMappings((prev) => ({ ...prev, [stage.id]: value ?? UNMAPPED }))
                  }
                >
                  {/* `w-full`: the trigger is `w-fit` by default, so each row
                      would size to its own status name and the column would
                      come out ragged. */}
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("Not synced")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNMAPPED}>{t("Not synced")}</SelectItem>
                    {meta?.statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h4 className="text-sm font-medium">{t("Default source")}</h4>
        <p className="text-sm text-muted-foreground mb-3">
          {/* GetLead attributes an unattributed lead to its own "API" source, which
              tells the org nothing about where the lead came from. */}
          {t("Applied to every lead RateUp creates. Left unset, GetLead files them under 'API'.")}
        </p>
        <div className="max-w-75">
          <Select
            items={sourceItems}
            onOpenChange={handleOpenChange}
            value={sourceId}
            onValueChange={(value) => {
              sourceTouched.current = true;
              setSourceId(value ?? UNMAPPED);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("None")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNMAPPED}>{t("None")}</SelectItem>
              {meta?.sources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-medium">{t("What to sync")}</h4>
          <span className="text-xs text-muted-foreground">{t("Saved as you switch")}</span>
        </div>
        <div className="flex flex-col gap-3 max-w-150">
          {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={key}>{t(label.title)}</Label>
                <p className="text-sm text-muted-foreground">{t(label.help)}</p>
              </div>
              <Switch
                id={key}
                checked={triggers[key] ?? false}
                disabled={triggersMutation.isPending}
                onCheckedChange={(checked) => handleTriggerChange(key, checked)}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
