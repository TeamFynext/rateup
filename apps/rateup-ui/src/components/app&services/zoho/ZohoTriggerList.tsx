// Extracted verbatim from `Zoho.tsx`. Behaviour is unchanged.

import { IconDeviceFloppy, IconSettings } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppIntegration } from "@/backend/appsIntegration/integration.api";
import { useUpdateIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import { useZohoPipelines, useZohoUsers } from "@/backend/appsIntegration/zoho/zoho.query";
import RefreshButton from "@/components/Button/RefreshButton";
import {
  FieldMappingEditor,
  type MappableField,
  type MappableFieldType,
} from "@/components/dashboard/settings/integrations/mapping/FieldMappingEditor.tsx";
import { StageMappingEditor } from "@/components/dashboard/settings/integrations/mapping/StageMappingEditor.tsx";
import { BiginLogo, ZohoLogo } from "@/components/integrations/logos";
import { usePipelineStages } from "@/components/pipeline/shared/StageSelector.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/context/UserContext";
import { IntegratedApps } from "@/types/enums";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Field, FieldDescription, FieldLabel } from "../../ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { ZohoTriggers, getTriggerLabel, getTriggerDescription } from "./shared.tsx";

/**
 * Bigin's data types onto the ways the shared field editor fills a field. A date is stored
 * as days from today. A picklist is typed, since Bigin's pipeline response carries no
 * choices. Anything else has no input, as it never had.
 */
const BIGIN_FIELD_TYPES: Record<string, MappableFieldType | undefined> = {
  date: "days",
  text: "text",
  email: "text",
  phone: "text",
  picklist: "picklist",
};

export const ZohoTriggerList = ({
  integration,
  refetch,
  isLoading,
}: {
  integration: AppIntegration;
  refetch: () => void;
  isLoading: boolean;
}) => {
  const { user } = useUser();
  const { t } = useTranslation();
  const { data: zohoUsersResponse, isLoading: zohoUsersLoading } = useZohoUsers(
    user?.orgId,
    "bigin",
  );

  const [selectedBiginOwnerId, setSelectedBiginOwnerId] = useState<string>(
    integration?.credential?.bigin?.biginOwner ?? "",
  );

  useEffect(() => {
    if (integration?.credential?.bigin?.biginOwner) {
      setSelectedBiginOwnerId(integration.credential.bigin.biginOwner);
    }
  }, [integration?.credential?.bigin?.biginOwner]);

  const usersField = zohoUsersResponse?.users;
  const zohoUsers = Array.isArray(usersField)
    ? usersField
    : Array.isArray(usersField?.users)
      ? usersField.users
      : [];

  const triggers = integration ? (integration.credential?.triggerSubscriptions ?? []) : [];

  const biginCreateEnabled = triggers.some(
    (t) =>
      (t.subscribed_field === ZohoTriggers.BIGIN_DEAL_CREATE ||
        t.subscribed_field === ZohoTriggers.BIGIN_CONTACT_CREATE) &&
      t.active,
  );

  const selectedOwner = zohoUsers.find((owner) => owner.id === selectedBiginOwnerId);

  const savedPipeline = integration?.credential?.bigin?.pipeline?.selectedPipeline;

  const savedSubPipeline = integration?.credential?.bigin?.pipeline?.selectedSubPipeline;

  const savedRequiredFieldMappings =
    integration?.credential?.bigin?.pipeline?.requiredFieldMappings || {};

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(
    savedPipeline?.id ? String(savedPipeline.id) : "",
  );

  const [selectedSubPipelineId, setSelectedSubPipelineId] = useState<string>(
    savedSubPipeline?.id ? String(savedSubPipeline.id) : "",
  );

  const [requiredFieldValues, setRequiredFieldValues] = useState<Record<string, string>>(
    savedRequiredFieldMappings,
  );

  const [openStageMappingModal, setOpenStageMappingModal] = useState(false);

  const [stageMappings, setStageMappings] = useState<
    Array<{
      stageId: string;
      stageName?: string;
      biginStageId?: string;
      biginStageName?: string;
    }>
  >([]);

  const pipelineStages = usePipelineStages();

  const updateMut = useUpdateIntegrationMutation(IntegratedApps.zoho);

  const { data: zohopipelines } = useZohoPipelines("bigin");

  const pipelines = zohopipelines?.pipelines ?? [];
  const subPipelines = zohopipelines?.subPipelines ?? [];
  const stages = zohopipelines?.stages ?? [];

  const selectedPipeline = pipelines.find(
    (pipeline) => String(pipeline.id) === String(selectedPipelineId),
  );

  /**
   * The credential column is replaced wholesale on save, not merged — see
   * `updateIntegrationByName`. So every write has to carry forward the keys it
   * is not changing, at both levels: `bigin` holds `biginOwner` next to
   * `pipeline`, and rebuilding either from scratch silently deletes the rest.
   * That is what used to wipe the saved Bigin owner whenever the pipeline
   * configuration or the stage mapping was saved.
   */
  const credentialWithPipelinePatch = (
    patch: Partial<NonNullable<NonNullable<typeof integration.credential.bigin>["pipeline"]>>,
  ) => {
    const selectedPipelineObj = pipelines.find(
      (pipeline) => String(pipeline.id) === String(selectedPipelineId),
    );

    const selectedSubPipelineObj = subPipelines.find(
      (pipeline) => String(pipeline.id) === String(selectedSubPipelineId),
    );

    return {
      ...integration.credential,
      bigin: {
        ...integration?.credential?.bigin,
        pipeline: {
          ...integration?.credential?.bigin?.pipeline,
          selectedPipeline: {
            id: selectedPipelineObj?.id,
            name: selectedPipelineObj?.name,
          },
          selectedSubPipeline: {
            id: selectedSubPipelineObj?.id,
            name: selectedSubPipelineObj?.name,
            value: selectedSubPipelineObj?.value,
          },
          requiredFieldMappings: requiredFieldValues,
          ...patch,
        },
      },
    };
  };

  const handleSavePipelineConfig = () => {
    updateMut.mutate({ credential: credentialWithPipelinePatch({}) });
  };

  const handleOpenStageMapping = () => {
    if (!pipelineStages.length) return;

    // Key name is legacy — the stored mappings target pipeline columns now.
    const existingMappings = integration?.credential?.bigin?.pipeline?.lifecycleStageMappings || [];

    // One row per column on the board, in board order, so a newly added column
    // shows up here unmapped rather than silently missing.
    const mappings = pipelineStages.map((stage) => {
      const existing = existingMappings.find((m) => m.stageId === stage.id);

      return {
        stageId: stage.id,
        stageName: stage.name,
        biginStageId: existing?.biginStageId || "",
        biginStageName: existing?.biginStageName || "",
      };
    });

    setStageMappings(mappings);

    setOpenStageMappingModal(true);
  };

  const handleSaveStageMappings = () => {
    updateMut.mutate({
      // Key name is legacy; the entries target pipeline columns now.
      credential: credentialWithPipelinePatch({ lifecycleStageMappings: stageMappings }),
    });
    setOpenStageMappingModal(false);
  };

  async function handleToggleTrigger(triggerKey: ZohoTriggers, enabled: boolean) {
    let updatedTriggers = [...triggers];

    if (enabled) {
      const alreadyExists = updatedTriggers.find((t) => t.subscribed_field === triggerKey);

      if (!alreadyExists) {
        updatedTriggers.push({
          subscribed_field: triggerKey,
          active: true,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      updatedTriggers = updatedTriggers.filter((t) => t.subscribed_field !== triggerKey);
    }

    updateMut.mutate({
      credential: {
        ...integration.credential,
        triggerSubscriptions: updatedTriggers,
      },
    });
  }

  if (!integration) return null;

  const supportedTriggers = [
    ...(integration?.credential?.supportedProducts?.crm
      ? [
          ZohoTriggers.CONTACT_CREATE,
          ZohoTriggers.CONTACT_UPDATE,
          ZohoTriggers.CONTACT_DELETE,
          ZohoTriggers.LEAD_UPDATE,
          ZohoTriggers.LEAD_CREATE,
          ZohoTriggers.CONTACT_WEBHOOK,
          ZohoTriggers.LEAD_WEBHOOK,
        ]
      : []),

    ...(integration?.credential?.supportedProducts?.bigin
      ? [
          ZohoTriggers.BIGIN_CONTACT_CREATE,
          ZohoTriggers.BIGIN_CONTACT_UPDATE,
          ZohoTriggers.BIGIN_CONTACT_DELETE,
          ZohoTriggers.BIGIN_DEAL_CREATE,
          ZohoTriggers.BIGIN_CONTACT_WEBHOOK,
          ZohoTriggers.BIGIN_DEAL_WEBHOOK,
        ]
      : []),
  ];

  // Filled in by the push itself, so never offered here.
  const autoManagedFields = [
    "Deal_Name",
    "Stage",
    "Pipeline",
    "Sub_Pipeline",
    "Contact_Name",
    "Lead_Source",
  ];

  const requiredFields: MappableField[] = (selectedPipeline?.requiredFields ?? [])
    .filter((field) => !autoManagedFields.includes(field.apiName))
    .flatMap((field) => {
      const type = field.dataType ? BIGIN_FIELD_TYPES[field.dataType] : undefined;
      return field.apiName && type
        ? [{ key: field.apiName, label: field.label ?? field.apiName, type }]
        : [];
    });

  return (
    <div className="space-y-6 w-full">
      {/* Trigger Card */}
      <Card className="overflow-hidden rounded-3xl border shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle>{t("Trigger Subscriptions")}</CardTitle>
            <RefreshButton onClick={refetch} isLoading={isLoading} />
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          {supportedTriggers.map((triggerKey) => {
            const subscribed = triggers.find((t) => t.subscribed_field === triggerKey && t.active);

            return (
              <div
                key={triggerKey}
                className="flex items-start justify-between rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start gap-3 pr-4">
                  <div className="rounded-xl border bg-background p-2 shadow-sm">
                    {triggerKey.startsWith("bigin") ? (
                      <BiginLogo className="h-4 w-4" />
                    ) : (
                      <ZohoLogo className="h-4 w-4" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{getTriggerLabel(triggerKey)}</p>

                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {getTriggerDescription(triggerKey)}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {subscribed ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>

                <Switch
                  checked={!!subscribed}
                  onCheckedChange={(checked) => handleToggleTrigger(triggerKey, checked)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {biginCreateEnabled && integration?.credential?.supportedProducts?.bigin && (
        <Card className="overflow-hidden rounded-3xl border shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border bg-background p-2">
                <BiginLogo className="h-5 w-5" />
              </div>

              <div>
                <CardTitle className="text-lg">{t("Assign Bigin Owner")}</CardTitle>

                <p className="text-muted-foreground text-sm">
                  {t(
                    "Select a Zoho user to assign as the owner for created Bigin contacts and deals.",
                  )}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <Field>
              <FieldLabel>{t("Bigin owner")}</FieldLabel>
              <Select
                value={selectedBiginOwnerId}
                onValueChange={(value) => setSelectedBiginOwnerId(String(value))}
                disabled={zohoUsersLoading}
                items={zohoUsers.map((owner) => ({
                  value: owner.id,
                  label: `${owner.name} ${owner.email ? `(${owner.email})` : ""}`,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={zohoUsersLoading ? t("Loading users...") : t("Select a Zoho user")}
                  />
                </SelectTrigger>

                <SelectContent>
                  {zohoUsers.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name} {owner.email ? `(${owner.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <FieldDescription>
                {t(
                  "The selected user id will be saved as the Bigin owner in your Zoho credential.",
                )}
              </FieldDescription>
            </Field>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                onClick={() =>
                  updateMut.mutate({
                    credential: {
                      ...integration.credential,
                      bigin: {
                        ...integration?.credential?.bigin,
                        biginOwner: selectedBiginOwnerId,
                      },
                    },
                  })
                }
                disabled={!selectedBiginOwnerId}
              >
                {t("Save Owner")}
              </Button>

              {selectedOwner ? (
                <p className="text-sm text-muted-foreground">
                  {t("Current owner")}: {selectedOwner.name}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bigin Config */}
      {triggers.some((t) => t.subscribed_field === ZohoTriggers.BIGIN_DEAL_CREATE && t.active) && (
        <Card className="overflow-hidden rounded-3xl border bg-gradient-to-br from-background to-muted/30 shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border bg-background p-2">
                <BiginLogo className="h-5 w-5" />
              </div>

              <div>
                <CardTitle className="text-lg">{t("Bigin Deal Configuration")}</CardTitle>

                <p className="text-muted-foreground text-sm">
                  {t("Configure where new deals should be created in Zoho Bigin")}.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pipeline */}
              <Field>
                <FieldLabel>{t("Pipeline")}</FieldLabel>
                <Select
                  value={selectedPipelineId}
                  onValueChange={(value) => {
                    setSelectedPipelineId(String(value));
                  }}
                  items={pipelines.map((pipeline) => ({
                    value: String(pipeline.id),
                    label: pipeline.name,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>

                  <SelectContent>
                    {pipelines.map((pipeline) => (
                      <SelectItem key={String(pipeline.id)} value={String(pipeline.id)}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Sub Pipeline */}
              <Field>
                <div className="flex items-center gap-1">
                  <FieldLabel>{t("Sub pipeline")}</FieldLabel>

                  <p className="text-xs text-muted-foreground">
                    ({t("Select a sub pipeline that belongs to the selected pipeline")})
                  </p>
                </div>
                <Select
                  value={selectedSubPipelineId}
                  onValueChange={(value) => {
                    setSelectedSubPipelineId(String(value));
                  }}
                  items={subPipelines.map((pipeline) => ({
                    value: String(pipeline.id),
                    label: pipeline.name,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select sub pipeline" />
                  </SelectTrigger>

                  <SelectContent>
                    {subPipelines.map((pipeline) => (
                      <SelectItem key={String(pipeline.id)} value={String(pipeline.id)}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* REQUIRED FIELDS */}
            {requiredFields.length > 0 && (
              <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
                <div>
                  <h3 className="font-display text-base font-medium">{t("Required fields")}</h3>

                  <p className="text-sm text-muted-foreground">
                    {t("Configure mandatory fields for this pipeline")}.
                  </p>
                </div>

                <FieldMappingEditor
                  fields={requiredFields}
                  value={requiredFieldValues}
                  onChange={(key, value) =>
                    setRequiredFieldValues((prev) => ({ ...prev, [key]: value }))
                  }
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl px-8"
                disabled={!selectedPipelineId || !selectedSubPipelineId}
                onClick={handleSavePipelineConfig}
              >
                <IconDeviceFloppy />
                {t("Save Configuration")}
              </Button>

              <Button
                size="lg"
                className="rounded-xl px-8"
                disabled={!selectedPipelineId || !selectedSubPipelineId}
                onClick={handleOpenStageMapping}
              >
                <IconSettings />
                {t("Configure lead stage mapping")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead stage mapping */}
      <Dialog open={openStageMappingModal} onOpenChange={setOpenStageMappingModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Lead stage mapping")}</DialogTitle>

            <DialogDescription>
              {t(
                "Map the columns of your pipeline to Bigin stages. Moving a lead on the board updates the matching Bigin deal, and a Bigin stage change moves the lead back.",
              )}
              <p className="mt-2 text-sm font-medium text-foreground">
                {t(
                  "Important: Select only stages that belong to the selected pipeline and sub pipeline configuration.",
                )}
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <StageMappingEditor
              rows={pipelineStages.map((stage) => ({ id: stage.id, label: stage.name }))}
              options={stages.map((stage) => ({ value: String(stage.id), label: stage.name }))}
              value={Object.fromEntries(
                stageMappings.map((mapping) => [
                  mapping.stageId,
                  mapping.biginStageId || undefined,
                ]),
              )}
              onChange={(stageId, biginStageId) => {
                const stage = stages.find((s) => String(s.id) === biginStageId);
                setStageMappings((prev) =>
                  prev.map((mapping) =>
                    mapping.stageId === stageId
                      ? {
                          ...mapping,
                          // Saved as "" when cleared, as it always was: the push reads an
                          // empty id as "no stage for this column".
                          biginStageId: stage?.id === undefined ? "" : String(stage.id),
                          biginStageName: stage?.name ?? "",
                        }
                      : mapping,
                  ),
                );
              }}
              rowsLabel={t("Pipeline column")}
              optionsLabel={t("Bigin stage")}
              placeholder={t("Select stage")}
              summary={(count, total) =>
                t(
                  "{count} of {total} columns have no Bigin stage. Moving a lead into one updates its deal in Bigin, but not the deal's stage.",
                  { count, total },
                )
              }
            />
          </div>

          <DialogFooter>
            <Button onClick={handleSaveStageMappings}>
              <IconDeviceFloppy />
              {t("Save Mapping")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
