"use client";

import { useMemo, useState } from "react";

import { IconPlugConnected, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
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
  useZohoContacts,
  useZohoLeads,
} from "@/backend/appsIntegration/zoho/zoho.query";
import {
  useCreateLifeCycleMutation,
  useLifecyclesWithContactCount,
} from "@/backend/lifecycle/lifecycle.query";
import RefreshButton from "@/components/Button/RefreshButton";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import { BiginLogo, ZohoLogo } from "@/components/integrations/logos";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { DataTable } from "@/components/Table/data-table";
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
  LEAD_UPDATE = "lead_updated",
  LEAD_CREATE = "lead_created",
  BIGIN_CONTACT_CREATE = "bigin_contact_created",
  BIGIN_CONTACT_UPDATE = "bigin_contact_updated",
  BIGIN_CONTACT_DELETE = "bigin_contact_deleted",
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
      );
    }

    if (connectionMode === "bigin" || connectionMode === "both") {
      scopes.push(
        "ZohoBigin.modules.ALL",
        "ZohoBigin.settings.ALL",
        "ZohoBigin.users.ALL",
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

  function handleDelete() {
    deleteMut.mutate();
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
  const updateMut = useUpdateIntegrationMutation(IntegratedApps.zoho);

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
        ]
      : []),

    ...(integration?.credential?.supportedProducts?.bigin
      ? [
          ZohoTriggers.BIGIN_CONTACT_CREATE,
          ZohoTriggers.BIGIN_CONTACT_UPDATE,
          ZohoTriggers.BIGIN_CONTACT_DELETE,
        ]
      : []),
  ];
  return (
    <Card className="w-full rounded-2xl border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("Trigger Subscriptions")}</CardTitle>

        <RefreshButton onClick={refetch} isLoading={isLoading} />
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {supportedTriggers.map((triggerKey) => {
          const subscribed = triggers.find(
            (t) => t.subscribed_field === triggerKey && t.active,
          );

          return (
            <div
              key={triggerKey}
              className="flex items-start justify-between rounded-2xl border bg-muted/40 p-4"
            >
              <div className="flex items-start gap-3 pr-4">
                <div className="mt-0.5 rounded-lg border bg-background p-1.5">
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
                  <p className="text-xs text-muted-foreground">
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
  );
};

const columnHelper = createColumnHelper<any>();

function ZohoContactsTable({ integration }: { integration: any }) {
  const { user } = useUser();
  const { t } = useTranslation();

  const syncMutation = useSyncZohoContactsMutation("crm");
  const { data, isLoading, refetch, isRefetching } = useZohoContacts(
    user.orgId,
  );

  const contacts = data?.contacts?.contacts || [];

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
  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => `${row.First_Name || ""} ${row.Last_Name || ""}`,
        {
          id: "name",
          header: "Name",
          cell: (info) => info.getValue(),
        },
      ),

      columnHelper.accessor("Email", {
        header: "Email",
      }),

      columnHelper.accessor("Phone", {
        header: "Phone",
      }),

      columnHelper.accessor("Modified_Time", {
        header: "Modified",

        cell: (info) => new Date(info.getValue()).toLocaleString(),
      }),
    ],
    [],
  );

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
            <RefreshButton onClick={refetch} isLoading={isRefetching} />

            <Button onClick={handleSync} disabled={syncMutation.isPending}>
              {syncMutation.isPending ? t("Syncing") : t("Sync to Rateup")}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <DataTable columns={columns} data={contacts} isPending={isLoading} />
      </CardContent>
    </Card>
  );
}

function ZohoLeadsTable({ integration }: { integration: any }) {
  const { user } = useUser();
  const { t } = useTranslation();
  const { data: lifecycles, isLoading: isLifecycleLoading } =
    useLifecyclesWithContactCount();
  const createLifecycleMutation = useCreateLifeCycleMutation();
  const [openLifecycleModal, setOpenLifecycleModal] = useState(false);
  const [missingStatuses, setMissingStatuses] = useState<any[]>([]);
  const syncMutation = useSyncZohoLeadsMutation();
  const { data, isLoading, refetch, isRefetching } = useZohoLeads(user.orgId);
  const leads = data?.leads?.leads || [];
  const queryClient = useQueryClient();

  async function handleSync() {
    if (!lifecycles || !leads.length) return;

    const existingLifecycleNames = lifecycles.map((l) =>
      l.name.trim().toLowerCase(),
    );

    const uniqueLeadStatuses = Array.from(
      new Set<string>(
        leads
          .map((lead) => lead.Lead_Status)
          .filter((status): status is string => !!status),
      ),
    );

    const missing = uniqueLeadStatuses.filter(
      (status) => !existingLifecycleNames.includes(status.trim().toLowerCase()),
    );

    if (missing.length > 0) {
      setMissingStatuses(
        missing.map((status) => ({
          name: status,
          category: "active",
        })),
      );
      setOpenLifecycleModal(true);
      return;
    }
    await startSync();
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

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => `${row.First_Name || ""} ${row.Last_Name || ""}`,
        {
          id: "name",
          header: "Name",
          cell: (info) => info.getValue(),
        },
      ),
      columnHelper.accessor("Email", {
        header: "Email",
      }),
      columnHelper.accessor("Phone", {
        header: "Phone",
      }),
      columnHelper.accessor("Company", {
        header: "Company",
      }),
      columnHelper.accessor("Lead_Status", {
        header: "Status",
      }),
      columnHelper.accessor("Modified_Time", {
        header: "Modified",
        cell: (info) =>
          info.getValue() ? new Date(info.getValue()).toLocaleString() : "-",
      }),
    ],
    [],
  );

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
                {t("Synced leads from Zoho CRM")}
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
              <RefreshButton onClick={refetch} isLoading={isRefetching} />
              <Button onClick={handleSync} disabled={syncMutation.isPending}>
                {syncMutation.isPending ? t("Syncing") : t("Sync Leads")}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <DataTable columns={columns} data={leads} isPending={isLoading} />
        </CardContent>
      </Card>
      <Dialog open={openLifecycleModal} onOpenChange={setOpenLifecycleModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Create missing lifecycles")}</DialogTitle>
            <DialogDescription>
              {t(
                "Some Zoho lead statuses do not exist in your CRM lifecycles.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {missingStatuses.map((status, index) => (
              <div
                key={status.name}
                className="flex items-center gap-4 rounded-xl border p-4"
              >
                <div className="flex-1">
                  <Input
                    value={status.name}
                    onChange={(e) => {
                      const updated = [...missingStatuses];
                      updated[index].name = e.target.value;
                      setMissingStatuses(updated);
                    }}
                  />
                </div>

                <Select
                  value={status.category}
                  onValueChange={(value) => {
                    const updated = [...missingStatuses];
                    updated[index].category = value;
                    setMissingStatuses(updated);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenLifecycleModal(false)}
            >
              {t("Cancel")}
            </Button>

            <Button
              onClick={async () => {
                try {
                  await Promise.all(
                    missingStatuses.map((status, index) =>
                      createLifecycleMutation.mutateAsync({
                        name: status.name,
                        category: status.category,
                        ordering: index + 1,
                        emoji: status.category === "lost" ? "❌" : "🆕",
                        description: "",
                        isWon: false,
                        color: "#00a2ffff",
                      }),
                    ),
                  );
                  setOpenLifecycleModal(false);
                  await startSync();
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              {t("Create & Sync")}
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
  const { data, isLoading, refetch, isRefetching } = useZohoContacts(
    user.orgId,
    "bigin",
  );
  const contacts = data?.contacts?.contacts || [];
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

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => `${row.First_Name || ""} ${row.Last_Name || ""}`,
        {
          id: "name",
          header: "Name",
          cell: (info) => info.getValue(),
        },
      ),
      columnHelper.accessor("Email", {
        header: "Email",
      }),
      columnHelper.accessor("Phone", {
        header: "Phone",
      }),
      columnHelper.accessor("Modified_Time", {
        header: "Modified",
        cell: (info) =>
          info.getValue() ? new Date(info.getValue()).toLocaleString() : "-",
      }),
    ],
    [],
  );

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
            <RefreshButton onClick={refetch} isLoading={isRefetching} />

            <Button onClick={handleSync} disabled={syncMutation.isPending}>
              {syncMutation.isPending ? t("Syncing") : t("Sync to Rateup")}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <DataTable columns={columns} data={contacts} isPending={isLoading} />
      </CardContent>
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
    default:
      return "Not Supported";
  }
}

export default Zoho;
