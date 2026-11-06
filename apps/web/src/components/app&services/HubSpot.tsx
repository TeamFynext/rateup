import { IconAlertTriangle, IconExternalLink, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  useHubSpotStatus,
  useUpdateHubSpotSettings,
} from "@/backend/appsIntegration/hubspot/hubspot.query";
import { useDeleteIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import { OAuthConnectButton } from "@/components/dashboard/settings/integrations/connect/OAuthConnectButton.tsx";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { IntegratedApps } from "@/types/enums.ts";
import { formatIsoDateStringWithTime } from "@/utils/dateTime.ts";

import { HubSpotBulkSync } from "./HubSpotBulkSync.tsx";
import { HubSpotDeals } from "./HubSpotDeals.tsx";

/**
 * HubSpot's settings page: connecting, the connection itself and what RateUp sends —
 * contacts, and Leads board deals.
 */
export function HubSpot() {
  const { t } = useTranslation();
  const { data: status, isPending } = useHubSpotStatus();
  const disconnect = useDeleteIntegrationMutation(IntegratedApps.hubspot);
  const settings = useUpdateHubSpotSettings();
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

      <IntegrationFormCard title={t("Contacts")}>
        <Field orientation="horizontal" className="rounded-lg border border-border p-3">
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="hubspot-sync-contacts" className="text-sm font-medium">
              {t("Send contacts to HubSpot")}
            </FieldLabel>
            <FieldDescription className="text-xs">
              {t(
                "New and edited contacts with an email or phone number are sent to HubSpot, and edits made in HubSpot come back. Someone HubSpot already has, by email or phone, is linked, not duplicated. Deleting a contact on either side leaves the other.",
              )}
            </FieldDescription>
          </div>
          <Switch
            id="hubspot-sync-contacts"
            checked={status.settings.syncContacts}
            disabled={settings.isPending}
            onCheckedChange={(on) => settings.mutate({ syncContacts: on })}
          />
        </Field>
        <Field orientation="horizontal" className="mt-3 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="hubspot-import-contacts" className="text-sm font-medium">
              {t("Add new HubSpot contacts to RateUp")}
            </FieldLabel>
            <FieldDescription className="text-xs">
              {t(
                "Contacts created in HubSpot with a phone number, including its country code, become RateUp contacts. A number or email RateUp already has is linked, not duplicated.",
              )}
            </FieldDescription>
          </div>
          <Switch
            id="hubspot-import-contacts"
            checked={status.settings.importContacts}
            disabled={settings.isPending}
            onCheckedChange={(on) => settings.mutate({ importContacts: on })}
          />
        </Field>
      </IntegrationFormCard>

      <HubSpotDeals settings={status.settings} />

      <HubSpotBulkSync runs={status.bulk} />

      <IntegrationFormCard
        title={t("Activity")}
        description={t(
          "Logged as notes on the person's HubSpot contact, which is added to HubSpot if it is not there yet.",
        )}
      >
        <div className="flex flex-col gap-3">
          <Field orientation="horizontal" className="rounded-lg border border-border p-3">
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="hubspot-log-conversations" className="text-sm font-medium">
                {t("Log closed conversations in HubSpot")}
              </FieldLabel>
              <FieldDescription className="text-xs">
                {t(
                  "When a conversation is closed: who closed it, why, the resolution, and its last 50 messages.",
                )}
              </FieldDescription>
            </div>
            <Switch
              id="hubspot-log-conversations"
              checked={status.settings.logConversations}
              disabled={settings.isPending}
              onCheckedChange={(on) => settings.mutate({ logConversations: on })}
            />
          </Field>
          <Field orientation="horizontal" className="rounded-lg border border-border p-3">
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="hubspot-log-surveys" className="text-sm font-medium">
                {t("Log survey responses in HubSpot")}
              </FieldLabel>
              <FieldDescription className="text-xs">
                {t(
                  "Each response from a known contact, with its questions and answers. Encrypted answers stay in RateUp.",
                )}
              </FieldDescription>
            </div>
            <Switch
              id="hubspot-log-surveys"
              checked={status.settings.logSurveyResponses}
              disabled={settings.isPending}
              onCheckedChange={(on) => settings.mutate({ logSurveyResponses: on })}
            />
          </Field>
        </div>
      </IntegrationFormCard>
    </IntegrationShell>
  );
}
