// Extracted verbatim from `Zoho.tsx`. Behaviour is unchanged.

import { IconRefresh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { AppIntegration } from "@/backend/appsIntegration/integration.api";
import { useUpdateIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import {
  useSyncZohoContactsMutation,
  useSyncZohoLeadsMutation,
  useZohoLeads,
} from "@/backend/appsIntegration/zoho/zoho.query";
import { zohoKeys } from "@/backend/whatsapp/automation.keys";
import { BiginLogo, ZohoLogo } from "@/components/integrations/logos";
import { usePipelineStages } from "@/components/pipeline/shared/StageSelector.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";

export function ZohoContactsTable({ integration }: { integration: AppIntegration }) {
  const { user } = useUser();
  const { t } = useTranslation();
  const syncMutation = useSyncZohoContactsMutation("crm");
  const queryClient = useQueryClient();

  async function handleSync() {
    const toastId = toast.loading(t("Syncing Zoho contacts to Rateup..."));

    try {
      await syncMutation.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: zohoKeys.contacts(user?.orgId, "crm"),
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
            <p className="text-sm text-muted-foreground">{t("Synced contacts from Zoho CRM")}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {integration?.credential?.lastZohoSyncAt && (
            <p className="text-sm text-muted-foreground">
              {t("Last Sync")}: {new Date(integration.credential.lastZohoSyncAt).toLocaleString()}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={handleSync} disabled={syncMutation.isPending}>
              <IconRefresh
                className={syncMutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              {syncMutation.isPending ? t("Syncing") : t("Sync to Rateup")}
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export function ZohoLeadsTable({ integration }: { integration: AppIntegration }) {
  const { user } = useUser();
  const { t } = useTranslation();
  const pipelineStages = usePipelineStages();
  const syncMutation = useSyncZohoLeadsMutation();
  const updateIntegrationMutation = useUpdateIntegrationMutation(IntegratedApps.zoho);
  const { data } = useZohoLeads(user?.orgId);
  const leads = data?.leads?.leads || [];
  const queryClient = useQueryClient();
  const [openMappingModal, setOpenMappingModal] = useState(false);
  const [leadStatusMappings, setLeadStatusMappings] = useState<
    Array<{ zohoLeadStatus: string; stageId?: string; stageName?: string }>
  >([]);

  async function handleSync() {
    if (!pipelineStages.length || !leads.length) return;
    const uniqueLeadStatuses = Array.from(
      new Set<string>(
        leads
          .map((lead: { Lead_Status?: string }) => lead.Lead_Status)
          .filter((status: string | undefined): status is string => !!status),
      ),
    );

    // Key name is legacy; the entries target pipeline columns now.
    const existingMappings = integration?.credential?.crm?.leadLifecycleMappings || [];

    const mappings = uniqueLeadStatuses.map((status) => {
      const existing = existingMappings.find((m) => m.zohoLeadStatus === status);

      return {
        zohoLeadStatus: status,
        stageId: existing?.stageId || "",
        stageName: existing?.stageName || "",
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
        queryKey: zohoKeys.leads(user?.orgId),
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
            ...integration?.credential?.crm,

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
                {t("Keep Zoho Lead Statuses and your pipeline columns in step")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {integration?.credential?.lastZohoLeadSyncAt && (
              <p className="text-sm text-muted-foreground">
                {t("Last Sync")}:{" "}
                {new Date(integration.credential.lastZohoLeadSyncAt).toLocaleString()}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={handleSync} disabled={syncMutation.isPending}>
                <IconRefresh
                  className={syncMutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"}
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
              {t(
                "Map each Zoho Lead Status to a column of your pipeline. The mapping runs both ways: a status change in Zoho moves the lead to the matching column, and moving it on your board sets the matching status in Zoho. A column no status points at is left out of the sync.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {(() => {
              const unmatched = leadStatusMappings.filter((mapping) => !mapping.stageId);

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
                {/* LEFT = RATEUP PIPELINE COLUMN */}

                <div className="flex-1">
                  <Select
                    value={mapping.stageId}
                    onValueChange={(value) => {
                      const stage = pipelineStages.find((s) => String(s.id) === String(value));

                      const updated = [...leadStatusMappings];

                      updated[index] = {
                        ...mapping,

                        stageId: stage?.id,

                        stageName: stage?.name,
                      };

                      setLeadStatusMappings(updated);
                    }}
                    items={pipelineStages.map((stage) => ({
                      value: String(stage.id),
                      label: stage.name,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("Select a lead stage")} />
                    </SelectTrigger>

                    <SelectContent>
                      {pipelineStages.map((stage) => (
                        <SelectItem key={stage.id} value={String(stage.id)}>
                          {stage.name}
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
            <Button variant="outline" onClick={() => setOpenMappingModal(false)}>
              {t("Cancel")}
            </Button>

            <Button
              onClick={saveMappingsAndSync}
              disabled={leadStatusMappings.some((m) => !m.stageId)}
            >
              {t("Save Mapping & Sync")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BiginContactsTable({ integration }: { integration: AppIntegration }) {
  const { user } = useUser();
  const { t } = useTranslation();
  const syncMutation = useSyncZohoContactsMutation("bigin");
  const queryClient = useQueryClient();
  async function handleSync() {
    const toastId = toast.loading(t("Syncing Bigin contacts to Rateup..."));
    try {
      await syncMutation.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: zohoKeys.contacts(user?.orgId, "bigin"),
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

            <p className="text-sm text-muted-foreground">{t("Synced contacts from Zoho Bigin")}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {integration?.credential?.lastBiginSyncAt && (
            <p className="text-sm text-muted-foreground">
              {t("Last Sync")}: {new Date(integration.credential.lastBiginSyncAt).toLocaleString()}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={handleSync} disabled={syncMutation.isPending}>
              <IconRefresh
                className={syncMutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              {syncMutation.isPending ? t("Syncing") : t("Sync to Rateup")}
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
