import { IconAlertTriangle, IconExternalLink, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useHubSpotStatus } from "@/backend/appsIntegration/hubspot/hubspot.query";
import { useDeleteIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import { OAuthConnectButton } from "@/components/dashboard/settings/integrations/connect/OAuthConnectButton.tsx";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { IntegratedApps } from "@/types/enums.ts";
import { formatIsoDateStringWithTime } from "@/utils/dateTime.ts";

/**
 * HubSpot's settings page. Step 2.1: connecting and the connection itself; contact and deal
 * sync settings join it as those steps land.
 */
export function HubSpot() {
  const { t } = useTranslation();
  const { data: status, isPending } = useHubSpotStatus();
  const disconnect = useDeleteIntegrationMutation(IntegratedApps.hubspot);
  const config = INTEGRATIONS_CONFIG.hubspot;

  if (isPending) {
    return (
      <IntegrationShell icon={config.icon} name={config.name}>
        <Skeleton className="h-48 rounded-xl" />
      </IntegrationShell>
    );
  }

  if (!status?.connected) {
    return (
      <IntegrationShell icon={config.icon} name={config.name} connected={false}>
        <IntegrationFormCard
          title={t("Connect your HubSpot account")}
          description={t(
            "You'll sign in to HubSpot and choose the account to connect. One HubSpot account can be connected to one RateUp workspace.",
          )}
          actions={<OAuthConnectButton integration={IntegratedApps.hubspot} />}
        >
          <p className="text-sm text-muted-foreground">
            {t(
              "RateUp asks for access to contacts and deals, so it can keep them in step with your contacts and your Leads board.",
            )}
          </p>
        </IntegrationFormCard>
      </IntegrationShell>
    );
  }

  const account = status.hubDomain ?? String(status.portalId);

  return (
    <IntegrationShell icon={config.icon} name={config.name} connected detail={account}>
      {status.health.consecutiveFailures > 0 && (
        <Alert variant="destructive">
          <IconAlertTriangle />
          <AlertTitle>{t("RateUp could not reach HubSpot recently")}</AlertTitle>
          <AlertDescription>
            {status.health.lastError && (
              <code className="block truncate font-mono text-xs" title={status.health.lastError}>
                {status.health.lastError}
              </code>
            )}
            {t("If access was removed in HubSpot, disconnect and connect again.")}
          </AlertDescription>
        </Alert>
      )}

      <IntegrationFormCard
        title={t("Connection")}
        description={t(
          "To remove RateUp's access from HubSpot's side, uninstall it under Settings › Integrations › Connected apps in HubSpot.",
        )}
        actions={
          <Button
            variant="ghost"
            loading={disconnect.isPending}
            onClick={() => disconnect.mutate()}
          >
            <IconTrash data-icon="inline-start" />
            {t("Disconnect")}
          </Button>
        }
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{t("HubSpot account")}</dt>
          <dd className="min-w-0">
            {status.hubDomain ? (
              <a
                href={`https://app.hubspot.com/contacts/${status.portalId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 truncate underline-offset-2 hover:underline"
              >
                {status.hubDomain}
                <IconExternalLink className="size-3.5 shrink-0" />
              </a>
            ) : (
              status.portalId
            )}
          </dd>
          <dt className="text-muted-foreground">{t("Account ID")}</dt>
          <dd>{status.portalId}</dd>
          {status.connectedBy && (
            <>
              <dt className="text-muted-foreground">{t("Connected by")}</dt>
              <dd className="truncate">{status.connectedBy}</dd>
            </>
          )}
          <dt className="text-muted-foreground">{t("Connected")}</dt>
          <dd>{formatIsoDateStringWithTime(status.connectedAt)}</dd>
        </dl>
      </IntegrationFormCard>
    </IntegrationShell>
  );
}
