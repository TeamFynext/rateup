"use client";

import { useMemo } from "react";

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
import RefreshButton from "@/components/Button/RefreshButton";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import { ZohoLogo } from "@/components/integrations/logos";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { DataTable } from "@/components/Table/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUser } from "@/context/UserContext";

export enum ZohoTriggers {
  CONTACT_CREATE = "contact_created",
  CONTACT_UPDATE = "contact_updated",
  CONTACT_DELETE = "contact_deleted",
  DEAL_CREATE = "deal_created",
  DEAL_UPDATE = "deal_updated",
  LEAD_CREATE = "lead_created",
  LEAD_UPDATE = "lead_updated",
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
        <div className="flex h-12 w-12 items-center justify-center shadow-sm">
          <ZohoLogo />
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("Zoho CRM")}</h1>

          <p className="text-sm text-muted-foreground">
            {t("Manage your Zoho CRM integration and trigger subscriptions")}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-6">
        <div className="flex gap-4 w-full">
          <ZohoAuthentication integration={integration} />

          <ZohoTriggerList
            integration={integration}
            refetch={refetch}
            isLoading={isRefetching}
          />
        </div>
        <ZohoLeadsTable integration={integration} />
        <ZohoContactsTable integration={integration} />
      </div>
    </div>
  );
}

const ZohoAuthentication = ({ integration }) => {
  const { t } = useTranslation();
  const user = useUser();
  const deleteMut = useDeleteIntegrationMutation(IntegratedApps.zoho);

  function handleConnect() {
    const clientId = process.env.VITE_ZOHO_CLIENT_ID;
    const redirectUri = `${process.env.VITE_FRONTEND_URL}/dashboard/settings/integrations/zoho/callback`;

    const scope =
      "ZohoCRM.modules.ALL ZohoCRM.settings.ALL ZohoCRM.users.ALL offline_access";

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
    <Card className="w-[500px] rounded-2xl border shadow-sm">
      <CardHeader>
        <CardTitle>{t("Zoho Connection")}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <ContainedTextField
          label={"Organization ID"}
          value={user.user.orgId}
          readOnly
          rightSection={<ApiCopyButton value={user.user.orgId} />}
        />

        <div className="flex">
          {integration ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" onClick={handleDelete}>
                    <IconTrash className="h-4 w-4" /> {t("Disconnect Zoho")}
                  </Button>
                </TooltipTrigger>

                <TooltipContent>{t("Disconnect Zoho")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button onClick={handleConnect} className="gap-2 rounded-xl">
              <IconPlugConnected className="h-4 w-4" />
              {t("Connect Zoho")}
            </Button>
          )}
        </div>
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
    ZohoTriggers.CONTACT_CREATE,
    ZohoTriggers.CONTACT_UPDATE,
    ZohoTriggers.CONTACT_DELETE,
  ];

  return (
    <Card className="w-full max-w-4xl rounded-2xl border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("Trigger Subscriptions")}</CardTitle>

        <RefreshButton onClick={refetch} isLoading={isLoading} />
      </CardHeader>

      <CardContent className="space-y-2">
        {supportedTriggers.map((triggerKey) => {
          const subscribed = triggers.find(
            (t) => t.subscribed_field === triggerKey && t.active,
          );

          return (
            <div
              key={triggerKey}
              className="flex items-center justify-between rounded-2xl border bg-muted/40 px-4 py-2"
            >
              <div className="space-y-1">
                <p className="font-semibold text-sm">
                  {getTriggerLabel(triggerKey)}
                </p>

                <p className="text-sm text-muted-foreground">
                  {subscribed ? "Enabled" : "Disabled"}
                </p>
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

  const syncMutation = useSyncZohoContactsMutation();
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
        queryKey: ["zoho-contacts", user.orgId],
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
        <div>
          <CardTitle>{t("Zoho Contacts")}</CardTitle>

          <p className="text-sm text-muted-foreground">
            {t("Synced contacts from Zoho CRM")}
          </p>
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

  const syncMutation = useSyncZohoLeadsMutation();

  const { data, isLoading, refetch, isRefetching } = useZohoLeads(user.orgId);

  const leads = data?.leads?.leads || [];

  const queryClient = useQueryClient();

  async function handleSync() {
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
    <Card className="w-full rounded-2xl border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("Zoho Leads")}</CardTitle>

          <p className="text-sm text-muted-foreground">
            {t("Synced leads from Zoho CRM")}
          </p>
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

    default:
      return "Not Supported";
  }
}

export default Zoho;
