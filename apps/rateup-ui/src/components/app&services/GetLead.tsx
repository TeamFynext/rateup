import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";

import {
  useConnectGetLeadMutation,
  useGetLeadMeta,
  useGetLeadStatus,
  useGetLeadWebhook,
} from "@/backend/appsIntegration/getlead/getlead.query";
import { useDeleteIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import { ApiKeyConnectCard } from "@/components/dashboard/settings/integrations/connect/ApiKeyConnectCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { SyncActivityPanel } from "@/components/dashboard/settings/integrations/SyncActivityPanel.tsx";
import { LinkCopyElement } from "@/components/input/LinkCopyElement.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegratedApps } from "@/types/enums.ts";

import { GetLeadMapping } from "./GetLeadMapping.tsx";
import { GetLeadWebhook } from "./GetLeadWebhook.tsx";

const schema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, "An API key is required")
    .startsWith("ik_", "A GetLead API key starts with ik_"),
});

export function GetLead() {
  const { t } = useTranslation();
  const { data: status, isPending } = useGetLeadStatus();
  const connected = status?.connected === true;
  const { data: meta } = useGetLeadMeta(connected);

  const { data: webhook, isPending: webhookPending } = useGetLeadWebhook(connected);
  const connectMutation = useConnectGetLeadMutation();
  const deleteMutation = useDeleteIntegrationMutation(IntegratedApps.getlead);

  const config = INTEGRATIONS_CONFIG.getlead;

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      connected={connected}
      detail={status?.keyPreview}
    >
      {/* Stated before connecting, not discovered afterwards: GetLead requires a
          phone number on every lead, and Instagram/Messenger contacts are created
          from a DM id with no phone at all. An org whose leads arrive by DM would
          otherwise connect this and see nothing sync. */}
      <Alert>
        <IconAlertTriangle />
        <AlertTitle>{t("Leads need a phone number")}</AlertTitle>
        <AlertDescription>
          {t(
            "GetLead requires a valid phone number on every lead. Leads that reach you as Instagram or Messenger DMs have no phone number, so they are skipped. WhatsApp leads always sync.",
          )}
        </AlertDescription>
      </Alert>

      <ApiKeyConnectCard
        title={t("API key")}
        description={t(
          "Leads on your pipeline board are pushed to GetLead. Generate a key in GetLead under Integrations → API Keys, then paste it here.",
        )}
        fields={[
          {
            name: "apiKey",
            label: t("API key"),
            replaceLabel: t("Replace API key"),
            placeholder: "ik_...",
          },
        ]}
        schema={schema}
        connected={connected}
        preview={status?.keyPreview ?? "ik_••••••••"}
        loading={isPending}
        onConnect={({ apiKey }) => connectMutation.mutateAsync(apiKey)}
        connecting={connectMutation.isPending}
        onDisconnect={() => deleteMutation.mutate()}
        disconnecting={deleteMutation.isPending}
        labels={{ connect: t("Connect"), update: t("Update key"), pending: t("Checking key...") }}
      >
        {/* Right below the key, because saving one is what creates this and the
            two are pasted into GetLead in the same sitting. Connecting seeds the
            URL, so there is nothing further to press. */}
        {connected && (
          <div className="mt-4 border-t pt-4">
            {webhookPending ? (
              <div className="flex items-center gap-2">
                <IconLoader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                <span className="text-muted-foreground text-sm">
                  {t("Loading your webhook URL...")}
                </span>
              </div>
            ) : webhook?.url ? (
              <div className="max-w-lg">
                <LinkCopyElement link={webhook.url} label={t("Your webhook URL")} />
                <p className="text-muted-foreground mt-1.5 text-xs">
                  {t(
                    "Paste this into a GetLead workflow to have status changes there reach Rateup. The secret and payload to go with it are below.",
                  )}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </ApiKeyConnectCard>

      {/* Only once connected: the mapping needs GetLead's statuses, which arrive
          with the key. */}
      {connected && <GetLeadMapping meta={meta} />}

      {/* The inbound half. Below the mapping because it reads the same stage
          mapping in reverse, so mapping the board first is the sensible order. */}
      {connected && <GetLeadWebhook />}

      {connected && <SyncActivityPanel integration={IntegratedApps.getlead} />}

      {connected && meta && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Available in GetLead")}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Confirms the key reached the right business, which is the only
              signal available — GetLead exposes no business name. */}
            <dl className="grid max-w-lg grid-cols-2 gap-y-1 text-sm text-muted-foreground">
              <dt>{t("Statuses")}</dt>
              <dd>{meta.statuses.map((s) => s.name).join(", ") || "—"}</dd>
              <dt>{t("Sources")}</dt>
              <dd>{meta.sources.length}</dd>
              <dt>{t("Purposes")}</dt>
              <dd>{meta.purposes.length}</dd>
            </dl>
          </CardContent>
        </Card>
      )}
    </IntegrationShell>
  );
}
