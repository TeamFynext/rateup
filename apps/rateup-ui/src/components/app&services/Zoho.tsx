"use client";

import { useState } from "react";

import { IconPlugConnected, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCcw, Save, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { IntegratedApps } from "@/types/enums";
import {
  useDeleteIntegrationMutation,
  useIntegrationByType,
  useUpdateIntegrationMutation,
} from "@/backend/appsIntegration/integration.query";
import {
  useSyncZohoContactsMutation,
  useSyncZohoLeadsMutation,
  useUnsubscribeZoho,
  useZohoLeads,
  useZohoPipelines,
} from "@/backend/appsIntegration/zoho/zoho.query";
import { useLifecyclesWithContactCount } from "@/backend/lifecycle/lifecycle.query";
import RefreshButton from "@/components/Button/RefreshButton";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import { BiginLogo, ZohoLogo } from "@/components/integrations/logos";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/context/UserContext";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export enum ZohoTriggers {
  CONTACT_CREATE = "contact_created",
  CONTACT_UPDATE = "contact_updated",
  CONTACT_DELETE = "contact_deleted",
  CONTACT_WEBHOOK = "contact_webhook",
  LEAD_WEBHOOK = "lead_webhook",
  LEAD_UPDATE = "lead_updated",
  LEAD_CREATE = "lead_created",
  BIGIN_CONTACT_CREATE = "bigin_contact_created",
  BIGIN_CONTACT_UPDATE = "bigin_contact_updated",
  BIGIN_CONTACT_DELETE = "bigin_contact_deleted",
  BIGIN_DEAL_CREATE = "bigin_deal_created",
  BIGIN_CONTACT_WEBHOOK = "bigin_contact_webhook",
  BIGIN_DEAL_WEBHOOK = "bigin_deal_webhook",
}

export function Zoho() {
  const { t } = useTranslation();
  const {
    data: integration,
    isLoading,
    refetch,
    isRefetching,
  } = useIntegrationByType(IntegratedApps.zoho);

  if (isLoading) return <RateupLoader />;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center gap-4">
        <div className="relative flex h-12 w-16 items-center">
          <div className="absolute left-0 z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-sm border">
            <ZohoLogo className="h-7 w-7" />
          </div>

          <div className="absolute left-7 flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-sm border">
            <BiginLogo className="h-7 w-7" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("Zoho CRM/Bigin")}
          </h1>

          <p className="text-sm text-muted-foreground">
            {t(
              "Manage your Zoho CRM/Bigin integration and trigger subscriptions",
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-6">
        <ZohoAuthentication integration={integration} />
        <ZohoTriggerList
          integration={integration}
          refetch={refetch}
          isLoading={isRefetching}
        />
        {integration?.credential?.supportedProducts?.crm && (
          <ZohoLeadsTable integration={integration} />
        )}
        {integration?.credential?.supportedProducts?.crm && (
          <ZohoContactsTable integration={integration} />
        )}
        {integration?.credential?.supportedProducts?.bigin && (
          <BiginContactsTable integration={integration} />
        )}
      </div>
    </div>
  );
}

const ZohoAuthentication = ({ integration }) => {
  const { t } = useTranslation();
  const user = useUser();
  const [connectionMode, setConnectionMode] = useState<
    "crm" | "bigin" | "both" | null
  >(null);
  const deleteMut = useDeleteIntegrationMutation(IntegratedApps.zoho);
  const disconnectMut = useUnsubscribeZoho();

  function handleConnect() {
    if (!connectionMode) return;
    const clientId = import.meta.env.VITE_ZOHO_CLIENT_ID;
    const redirectUri = `${import.meta.env.VITE_FRONTEND_URL}/dashboard/settings/integrations/zoho/callback`;

    const scopes: string[] = [];

    if (connectionMode === "crm" || connectionMode === "both") {
      scopes.push(
        "ZohoCRM.modules.ALL",
        "ZohoCRM.settings.ALL",
        "ZohoCRM.users.ALL",
        "ZohoCRM.notifications.ALL",
      );
    }

    if (connectionMode === "bigin" || connectionMode === "both") {
      scopes.push(
        "ZohoBigin.modules.ALL",
        "ZohoBigin.settings.ALL",
        "ZohoBigin.users.ALL",
        "ZohoBigin.notifications.ALL",
      );
    }

    scopes.push("offline_access");

    const scope = scopes.join(" ");

    const authUrl =
      `https://accounts.zoho.in/oauth/v2/auth` +
      `?scope=${encodeURIComponent(scope)}` +
      `&client_id=${clientId}` +
      `&response_type=code` +
      `&access_type=offline` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${user.user.orgId}`;

    window.location.href = authUrl;
  }

  async function handleDelete() {
    await disconnectMut.mutate(user.user.orgId);
    await deleteMut.mutate();
  }

  return (
    <Card className="w-full rounded-2xl border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>{t("Zoho Connection")}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <ContainedTextField
          label={t("Organization ID")}
          value={user.user.orgId}
          readOnly
          rightSection={<ApiCopyButton value={user.user.orgId} />}
        />

        {!integration && (
          <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("Connection Mode")}</p>

              <p className="text-xs text-muted-foreground">
                {t("Choose which Zoho products to connect")}
              </p>
            </div>

            <Select
              value={connectionMode || ""}
              onValueChange={(value: any) => setConnectionMode(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("Select integration")} />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="crm">Zoho CRM Only</SelectItem>

                <SelectItem value="bigin">Zoho Bigin Only</SelectItem>

                <SelectItem value="both">Zoho CRM + Bigin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {integration ? (
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="w-full gap-2 rounded-xl"
          >
            <IconTrash className="h-4 w-4" />

            {t("Disconnect Zoho")}
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            className="w-full gap-2 rounded-xl"
            disabled={!connectionMode}
          >
            <IconPlugConnected className="h-4 w-4" />

            {t("Connect Zoho")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const ZohoTriggerList = ({
  integration,
  refetch,
  isLoading,
}: {
  integration: any;
  refetch: () => void;
  isLoading: boolean;
}) => {
  const { t } = useTranslation();

  const triggers = integration
    ? (integration.credential?.triggerSubscriptions ?? [])
    : [];

  const savedPipeline =
    integration?.credential?.bigin?.pipeline?.selectedPipeline;

  const savedSubPipeline =
    integration?.credential?.bigin?.pipeline?.selectedSubPipeline;

  const savedRequiredFieldMappings =
    integration?.credential?.bigin?.pipeline?.requiredFieldMappings || {};

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(
    savedPipeline?.id ? String(savedPipeline.id) : "",
  );

  const [selectedSubPipelineId, setSelectedSubPipelineId] = useState<string>(
    savedSubPipeline?.id ? String(savedSubPipeline.id) : "",
  );

  const [requiredFieldValues, setRequiredFieldValues] = useState<
    Record<string, any>
  >(savedRequiredFieldMappings);

  const [openLifecycleMappingModal, setOpenLifecycleMappingModal] =
    useState(false);

  const [lifecycleMappings, setLifecycleMappings] = useState<any[]>([]);

  const { data: lifecycles } = useLifecyclesWithContactCount();

  const updateMut = useUpdateIntegrationMutation(IntegratedApps.zoho);

  const { data: zohopipelines, isLoading: zohopipelinesLoading } =
    useZohoPipelines("bigin");

  const pipelines = zohopipelines?.pipelines ?? [];
  const subPipelines = zohopipelines?.subPipelines ?? [];
  const stages = zohopipelines?.stages ?? [];

  const selectedPipeline = pipelines.find(
    (pipeline: any) => String(pipeline.id) === String(selectedPipelineId),
  );

  const handleSavePipelineConfig = () => {
    const selectedPipelineObj = pipelines.find(
      (pipeline: any) => String(pipeline.id) === String(selectedPipelineId),
    );

    const selectedSubPipelineObj = subPipelines.find(
      (pipeline: any) => String(pipeline.id) === String(selectedSubPipelineId),
    );

    updateMut.mutate({
      credential: {
        ...integration.credential,
        bigin: {
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
          },
        },
      },
    });
  };

  const handleOpenLifecycleMapping = () => {
    if (!lifecycles?.length) return;

    const existingMappings =
      integration?.credential?.bigin?.pipeline?.lifecycleStageMappings || [];

    const mappings = lifecycles.map((lifecycle: any) => {
      const existing = existingMappings.find(
        (m: any) => m.lifecycleId === lifecycle.id,
      );

      return {
        lifecycleId: lifecycle.id,
        lifecycleName: lifecycle.name,
        biginStageId: existing?.biginStageId || "",
        biginStageName: existing?.biginStageName || "",
      };
    });

    setLifecycleMappings(mappings);

    setOpenLifecycleMappingModal(true);
  };

  const handleSaveLifecycleMappings = () => {
    const selectedPipelineObj = pipelines.find(
      (pipeline: any) => String(pipeline.id) === String(selectedPipelineId),
    );

    const selectedSubPipelineObj = subPipelines.find(
      (pipeline: any) => String(pipeline.id) === String(selectedSubPipelineId),
    );

    updateMut.mutate({
      credential: {
        ...integration.credential,
        bigin: {
          pipeline: {
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
            lifecycleStageMappings: lifecycleMappings,
          },
        },
      },
    });
    setOpenLifecycleMappingModal(false);
  };

  async function handleToggleTrigger(
    triggerKey: ZohoTriggers,
    enabled: boolean,
  ) {
    let updatedTriggers = [...triggers];

    if (enabled) {
      const alreadyExists = updatedTriggers.find(
        (t) => t.subscribed_field === triggerKey,
      );

      if (!alreadyExists) {
        updatedTriggers.push({
          subscribed_field: triggerKey,
          active: true,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      updatedTriggers = updatedTriggers.filter(
        (t) => t.subscribed_field !== triggerKey,
      );
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

  const autoManagedFields = [
    "Deal_Name",
    "Stage",
    "Pipeline",
    "Sub_Pipeline",
    "Contact_Name",
    "Lead_Source",
  ];

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
            const subscribed = triggers.find(
              (t) => t.subscribed_field === triggerKey && t.active,
            );

            return (
              <div
                key={triggerKey}
                className="flex items-start justify-between rounded-2xl border bg-muted/40 p-4 transition-all hover:bg-muted/60"
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
                    <p className="font-semibold text-sm">
                      {getTriggerLabel(triggerKey)}
                    </p>

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
                  onCheckedChange={(checked) =>
                    handleToggleTrigger(triggerKey, checked)
                  }
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Bigin Config */}
      {triggers.some(
        (t) =>
          t.subscribed_field === ZohoTriggers.BIGIN_DEAL_CREATE && t.active,
      ) && (
        <Card className="overflow-hidden rounded-3xl border bg-gradient-to-br from-background to-muted/30 shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border bg-background p-2 shadow-sm">
                <BiginLogo className="h-5 w-5" />
              </div>

              <div>
                <CardTitle className="text-lg">
                  {t("Bigin Deal Configuration")}
                </CardTitle>

                <p className="text-muted-foreground text-sm">
                  {t(
                    "Configure where new deals should be created in Zoho Bigin",
                  )}
                  .
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pipeline */}
              <div className="space-y-2">
                <Label>{t("Pipeline")}</Label>
                <Select
                  value={selectedPipelineId}
                  onValueChange={(value) => {
                    setSelectedPipelineId(String(value));
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl w-full">
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>

                  <SelectContent>
                    {pipelines.map((pipeline: any) => (
                      <SelectItem
                        key={String(pipeline.id)}
                        value={String(pipeline.id)}
                      >
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sub Pipeline */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label>{t("Sub Pipeline")}</Label>

                  <p className="text-xs text-red-500 font-medium">
                    (
                    {t(
                      "Select a sub pipeline that belongs to the selected pipeline",
                    )}
                    )
                  </p>
                </div>
                <Select
                  value={selectedSubPipelineId}
                  onValueChange={(value) => {
                    setSelectedSubPipelineId(String(value));
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl w-full">
                    <SelectValue placeholder="Select sub pipeline" />
                  </SelectTrigger>

                  <SelectContent>
                    {subPipelines.map((pipeline: any) => (
                      <SelectItem
                        key={String(pipeline.id)}
                        value={String(pipeline.id)}
                      >
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* REQUIRED FIELDS */}
            {selectedPipeline?.requiredFields?.length > 0 && (
              <div className="space-y-4 rounded-2xl border bg-muted/20 p-5">
                <div>
                  <h3 className="font-semibold">{t("Required Fields")}</h3>

                  <p className="text-sm text-muted-foreground">
                    {t("Configure mandatory fields for this pipeline")}.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {selectedPipeline.requiredFields
                    .filter(
                      (field: any) =>
                        !autoManagedFields.includes(field.apiName),
                    )
                    .map((field: any) => (
                      <div key={field.apiName} className="space-y-2">
                        <Label>{field.label}</Label>

                        {field.dataType === "date" && (
                          <Input
                            type="number"
                            min={0}
                            placeholder={t("Enter number of days from today")}
                            value={requiredFieldValues[field.apiName] || ""}
                            onChange={(e) =>
                              setRequiredFieldValues((prev) => ({
                                ...prev,

                                [field.apiName]: e.target.value,
                              }))
                            }
                          />
                        )}

                        {(field.dataType === "text" ||
                          field.dataType === "email" ||
                          field.dataType === "phone") && (
                          <Input
                            value={requiredFieldValues[field.apiName] || ""}
                            placeholder={t("Enter value")}
                            onChange={(e) =>
                              setRequiredFieldValues((prev) => ({
                                ...prev,

                                [field.apiName]: e.target.value,
                              }))
                            }
                          />
                        )}

                        {field.dataType === "picklist" && (
                          <Input
                            placeholder={t("Enter value")}
                            value={requiredFieldValues[field.apiName] || ""}
                            onChange={(e) =>
                              setRequiredFieldValues((prev) => ({
                                ...prev,

                                [field.apiName]: e.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                    ))}
                </div>
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
                <Save />
                {t("Save Configuration")}
              </Button>

              <Button
                size="lg"
                className="rounded-xl px-8"
                disabled={!selectedPipelineId || !selectedSubPipelineId}
                onClick={handleOpenLifecycleMapping}
              >
                <Settings />
                {t("Configure Lifecycle Mapping")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lifecycle Modal */}
      <Dialog
        open={openLifecycleMappingModal}
        onOpenChange={setOpenLifecycleMappingModal}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Lifecycle Stage Mapping")}</DialogTitle>

            <DialogDescription>
              {t("Map Rateup lifecycles to Bigin stages.")}
              <p className="text-sm text-red-500 font-medium mt-2">
                {t(
                  "Important: Select only stages that belong to the selected pipeline and sub pipeline configuration.",
                )}
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {(() => {
              const unmatchedStages = stages.filter(
                (stage: any) =>
                  !lifecycleMappings.some(
                    (mapping) =>
                      String(mapping.biginStageId) === String(stage.id),
                  ),
              );

              return (
                <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                  {t("Unmatched stages left")}:{" "}
                  <span className="font-semibold">
                    {unmatchedStages.length}
                  </span>
                </div>
              );
            })()}
            {lifecycleMappings.map((mapping, index) => (
              <div
                key={mapping.lifecycleId}
                className="flex items-center gap-4 rounded-xl border p-4"
              >
                <div className="flex-1">
                  <Label>{mapping.lifecycleName}</Label>
                </div>

                <Select
                  value={mapping.biginStageId}
                  onValueChange={(value) => {
                    const stage = stages.find(
                      (s: any) => String(s.id) === String(value),
                    );
                    const updated = [...lifecycleMappings];
                    updated[index] = {
                      ...mapping,
                      biginStageId: stage?.id,
                      biginStageName: stage?.name,
                    };
                    setLifecycleMappings(updated);
                  }}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>

                  <SelectContent>
                    {stages.map((stage: any) => (
                      <SelectItem key={stage.id} value={String(stage.id)}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={handleSaveLifecycleMappings}>
              <Save />
              {t("Save Mapping")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function ZohoContactsTable({ integration }: { integration: any }) {
  const { user } = useUser();
  const { t } = useTranslation();
  const syncMutation = useSyncZohoContactsMutation("crm");
  const queryClient = useQueryClient();

  async function handleSync() {
    const toastId = toast.loading(t("Syncing Zoho contacts to Rateup..."));

    try {
      await syncMutation.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: ["zoho-contacts", user.orgId, "crm"],
      });

      toast.success(t("Zoho contacts synced successfully"), {
        id: toastId,
      });
    } catch (error) {
      console.error(error);

      toast.error(t("Failed to sync Zoho contacts"), {
        id: toastId,
      });
    }
  }

  if (!integration) return null;

  return (
    <Card className="w-full rounded-2xl border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <ZohoLogo className="h-8 w-8" />
          <div>
            <CardTitle>{t("Zoho Contacts")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("Synced contacts from Zoho CRM")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {integration?.credential?.lastZohoSyncAt && (
            <p className="text-sm text-muted-foreground">
              {t("Last Sync")}:{" "}
              {new Date(integration.credential.lastZohoSyncAt).toLocaleString()}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={handleSync} disabled={syncMutation.isPending}>
              <RefreshCcw
                className={
                  syncMutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"
                }
              />
              {syncMutation.isPending ? t("Syncing") : t("Sync to Rateup")}
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function ZohoLeadsTable({ integration }: { integration: any }) {
  const { user } = useUser();
  const { t } = useTranslation();
  const { data: lifecycles, isLoading: isLifecycleLoading } =
    useLifecyclesWithContactCount();
  const syncMutation = useSyncZohoLeadsMutation();
  const updateIntegrationMutation = useUpdateIntegrationMutation(
    IntegratedApps.zoho,
  );
  const { data, isLoading, refetch, isRefetching } = useZohoLeads(user.orgId);
  const leads = data?.leads?.leads || [];
  const queryClient = useQueryClient();
  const [openMappingModal, setOpenMappingModal] = useState(false);
  const [leadStatusMappings, setLeadStatusMappings] = useState<any[]>([]);

  async function handleSync() {
    if (!lifecycles || !leads.length) return;
    const uniqueLeadStatuses = Array.from(
      new Set<string>(
        leads
          .map((lead) => lead.Lead_Status)
          .filter((status): status is string => !!status),
      ),
    );

    const existingMappings =
      integration?.credential?.crm?.leadLifecycleMappings || [];

    const mappings = uniqueLeadStatuses.map((status) => {
      const existing = existingMappings.find(
        (m: any) => m.zohoLeadStatus === status,
      );

      return {
        zohoLeadStatus: status,
        lifecycleId: existing?.lifecycleId || "",
        lifecycleName: existing?.lifecycleName || "",
      };
    });

    setLeadStatusMappings(mappings);
    setOpenMappingModal(true);
  }

  async function startSync() {
    const toastId = toast.loading(t("Syncing Zoho leads to Rateup..."));

    try {
      await syncMutation.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: ["zoho-leads", user.orgId],
      });

      toast.success(t("Zoho leads synced successfully"), {
        id: toastId,
      });
    } catch (error) {
      console.error(error);

      toast.error(t("Failed to sync Zoho leads"), {
        id: toastId,
      });
    }
  }

  async function saveMappingsAndSync() {
    try {
      await updateIntegrationMutation.mutateAsync({
        credential: {
          ...integration.credential,

          crm: {
            ...(integration?.credential?.crm || {}),

            leadLifecycleMappings: leadStatusMappings,
          },
        },
      });

      setOpenMappingModal(false);

      await startSync();
    } catch (err) {
      console.error(err);
      toast.error(t("Failed to save mappings"));
    }
  }

  if (!integration) return null;

  return (
    <>
      <Card className="w-full rounded-2xl border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <ZohoLogo className="h-8 w-8" />

            <div>
              <CardTitle>{t("Zoho Leads")}</CardTitle>

              <p className="text-sm text-muted-foreground">
                {t("Map Zoho Lead Statuses to Rateup Lifecycles")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {integration?.credential?.lastZohoLeadSyncAt && (
              <p className="text-sm text-muted-foreground">
                {t("Last Sync")}:{" "}
                {new Date(
                  integration.credential.lastZohoLeadSyncAt,
                ).toLocaleString()}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={handleSync} disabled={syncMutation.isPending}>
                <RefreshCcw
                  className={
                    syncMutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"
                  }
                />

                {syncMutation.isPending ? t("Syncing") : t("Configure & Sync")}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={openMappingModal} onOpenChange={setOpenMappingModal}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("Lead Status Mapping")}</DialogTitle>

            <DialogDescription>
              {t("Map Zoho Lead Statuses with existing Rateup lifecycles.")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {(() => {
              const unmatched = leadStatusMappings.filter(
                (mapping) => !mapping.lifecycleId,
              );

              return (
                <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                  {t("Unmapped statuses left")}:{" "}
                  <span className="font-semibold">{unmatched.length}</span>
                </div>
              );
            })()}

            {leadStatusMappings.map((mapping, index) => (
              <div
                key={mapping.zohoLeadStatus}
                className="flex items-center gap-4 rounded-xl border p-4"
              >
                {/* LEFT = RATEUP LIFECYCLE */}

                <div className="flex-1">
                  <Select
                    value={mapping.lifecycleId}
                    onValueChange={(value) => {
                      const lifecycle = lifecycles?.find(
                        (l) => String(l.id) === String(value),
                      );

                      const updated = [...leadStatusMappings];

                      updated[index] = {
                        ...mapping,

                        lifecycleId: lifecycle?.id,

                        lifecycleName: lifecycle?.name,
                      };

                      setLeadStatusMappings(updated);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("Select lifecycle")} />
                    </SelectTrigger>

                    <SelectContent>
                      {lifecycles?.map((lifecycle) => (
                        <SelectItem
                          key={lifecycle.id}
                          value={String(lifecycle.id)}
                        >
                          {lifecycle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* RIGHT = ZOHO LEAD STATUS */}

                <div className="flex-1 rounded-xl border bg-muted/40 px-4 py-2 text-sm font-medium">
                  {mapping.zohoLeadStatus}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setOpenMappingModal(false)}
            >
              {t("Cancel")}
            </Button>

            <Button
              onClick={saveMappingsAndSync}
              disabled={leadStatusMappings.some((m) => !m.lifecycleId)}
            >
              {t("Save Mapping & Sync")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BiginContactsTable({ integration }: { integration: any }) {
  const { user } = useUser();
  const { t } = useTranslation();
  const syncMutation = useSyncZohoContactsMutation("bigin");
  const queryClient = useQueryClient();
  async function handleSync() {
    const toastId = toast.loading(t("Syncing Bigin contacts to Rateup..."));
    try {
      await syncMutation.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: ["zoho-contacts", user.orgId, "bigin"],
      });
      toast.success(t("Bigin contacts synced successfully"), {
        id: toastId,
      });
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to sync Bigin contacts"), {
        id: toastId,
      });
    }
  }

  if (!integration?.credential?.supportedProducts?.bigin) {
    return null;
  }

  return (
    <Card className="w-full rounded-2xl border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <BiginLogo className="h-8 w-8" />

          <div>
            <CardTitle>{t("Zoho Bigin Contacts")}</CardTitle>

            <p className="text-sm text-muted-foreground">
              {t("Synced contacts from Zoho Bigin")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {integration?.credential?.lastBiginSyncAt && (
            <p className="text-sm text-muted-foreground">
              {t("Last Sync")}:{" "}
              {new Date(
                integration.credential.lastBiginSyncAt,
              ).toLocaleString()}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={handleSync} disabled={syncMutation.isPending}>
              <RefreshCcw
                className={
                  syncMutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"
                }
              />
              {syncMutation.isPending ? t("Syncing") : t("Sync to Rateup")}
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function getTriggerLabel(triggerKey: ZohoTriggers) {
  switch (triggerKey) {
    case ZohoTriggers.CONTACT_CREATE:
      return "Create Contact";
    case ZohoTriggers.CONTACT_UPDATE:
      return "Update Contact";
    case ZohoTriggers.CONTACT_DELETE:
      return "Delete Contact";
    case ZohoTriggers.LEAD_UPDATE:
      return "Update Lead";
    case ZohoTriggers.LEAD_CREATE:
      return "Create Lead";
    case ZohoTriggers.BIGIN_CONTACT_CREATE:
      return "Create Bigin Contact";
    case ZohoTriggers.BIGIN_CONTACT_UPDATE:
      return "Update Bigin Contact";
    case ZohoTriggers.BIGIN_CONTACT_DELETE:
      return "Delete Bigin Contact";
    case ZohoTriggers.BIGIN_DEAL_CREATE:
      return "Create Bigin Deal";
    case ZohoTriggers.BIGIN_CONTACT_WEBHOOK:
      return "Bigin Contact Webhook";
    case ZohoTriggers.BIGIN_DEAL_WEBHOOK:
      return "Bigin Deal Webhook";
    case ZohoTriggers.LEAD_WEBHOOK:
      return "CRM Lead Webhook";
    case ZohoTriggers.CONTACT_WEBHOOK:
      return "CRM Contact Webhook";
    default:
      return "Not Supported";
  }
}

function getTriggerDescription(triggerKey: ZohoTriggers) {
  switch (triggerKey) {
    case ZohoTriggers.CONTACT_CREATE:
      return "Automatically create contacts in Zoho CRM when new contacts are added.";
    case ZohoTriggers.CONTACT_UPDATE:
      return "Sync contact changes like name, email, and phone to Zoho CRM.";
    case ZohoTriggers.CONTACT_DELETE:
      return "Delete Zoho CRM contacts when contacts are removed in Rateup.";
    case ZohoTriggers.LEAD_CREATE:
      return "Create Zoho CRM leads from newly created Rateup contacts.";
    case ZohoTriggers.LEAD_UPDATE:
      return "Update Zoho lead status when lifecycle stages change.";
    case ZohoTriggers.BIGIN_CONTACT_CREATE:
      return "Automatically create contacts in Zoho Bigin.";
    case ZohoTriggers.BIGIN_CONTACT_UPDATE:
      return "Sync contact updates to Zoho Bigin.";
    case ZohoTriggers.BIGIN_CONTACT_DELETE:
      return "Delete contacts from Zoho Bigin when removed in Rateup.";
    case ZohoTriggers.BIGIN_DEAL_CREATE:
      return "Automatically create deals using the selected pipeline and stage.";
    case ZohoTriggers.LEAD_WEBHOOK:
      return "Receive Zoho CRM lead updates and sync lifecycle changes into Rateup.";
    case ZohoTriggers.BIGIN_CONTACT_WEBHOOK:
      return "Receive Zoho Bigin contact updates and sync them into Rateup.";
    case ZohoTriggers.BIGIN_DEAL_WEBHOOK:
      return "Receive Bigin deal updates and update Rateup lifecycle stages.";
    case ZohoTriggers.CONTACT_WEBHOOK:
      return "Receive Zoho CRM contact updates and sync them into Rateup.";
    default:
      return "Not Supported";
  }
}

export default Zoho;
