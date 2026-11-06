import { Alert, AlertAction, AlertDescription, AlertTitle } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { IconAlertTriangle, IconExternalLink, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useDeleteIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import {
  usePipedriveStatus,
  useRepairPipedriveWebhooks,
  useUpdatePipedriveSettings,
} from "@/backend/appsIntegration/pipedrive/pipedrive.query";
import { OAuthConnectButton } from "@/components/dashboard/settings/integrations/connect/OAuthConnectButton.tsx";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { IntegratedApps } from "@/types/enums.ts";
import { formatIsoDateStringWithTime } from "@/utils/dateTime.ts";

import { PipedriveBulkSync } from "./PipedriveBulkSync.tsx";
import { PipedriveDeals } from "./PipedriveDeals.tsx";

/**
 * Pipedrive's settings page: connecting, the connection itself and what RateUp
 * sends — contacts as persons, Leads board deals, and notes — plus the first-time sync.
 */
export function Pipedrive() {
  const { t } = useTranslation();
  const { data: status, isPending } = usePipedriveStatus();
  const disconnect = useDeleteIntegrationMutation(IntegratedApps.pipedrive);
  const settings = useUpdatePipedriveSettings();
  const repair = useRepairPipedriveWebhooks();
  const config = INTEGRATIONS_CONFIG.pipedrive;

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
          title={t("Connect your Pipedrive company")}
          description={t(
            "You'll sign in to Pipedrive and approve RateUp for your company. One Pipedrive company can be connected to one RateUp workspace.",
          )}
          actions={<OAuthConnectButton integration={IntegratedApps.pipedrive} />}
        >
          <p className="text-sm text-muted-foreground">
            {t(
              "RateUp asks for access to persons, deals and notes, so it can keep them in step with your contacts and your Leads board.",
            )}
          </p>
        </IntegrationFormCard>
      </IntegrationShell>
    );
  }

  const company = status.companyName ?? String(status.companyId);
  const missing = status.webhooks.filter((webhook) => !webhook.registered);
  const companyUrl = status.companyDomain ? `https://${status.companyDomain}.pipedrive.com` : null;

  return (
    <IntegrationShell icon={config.icon} name={config.name} connected detail={company}>
      {missing.length > 0 && (
        <Alert variant="destructive">
          <IconAlertTriangle />
          <AlertTitle>
            {t(
              "{count, plural, one {One webhook is not registered} other {# webhooks are not registered}}",
              { count: missing.length },
            )}
          </AlertTitle>
          <AlertDescription>
            {t(
              "Until it is, changes made in Pipedrive do not reach RateUp. Pipedrive removes a webhook RateUp could not be reached on for three days.",
            )}
          </AlertDescription>
          <AlertAction>
            <Button
              size="sm"
              variant="outline"
              loading={repair.isPending}
              onClick={() => repair.mutate()}
            >
              {t("Register again")}
            </Button>
          </AlertAction>
        </Alert>
      )}

      {missing.length === 0 && status.health.consecutiveFailures > 0 && (
        <Alert variant="destructive">
          <IconAlertTriangle />
          <AlertTitle>{t("RateUp could not reach Pipedrive recently")}</AlertTitle>
          <AlertDescription>
            {status.health.lastError && (
              <code className="block truncate font-mono text-xs" title={status.health.lastError}>
                {status.health.lastError}
              </code>
            )}
            {t("If access was removed in Pipedrive, disconnect and connect again.")}
          </AlertDescription>
        </Alert>
      )}

      <IntegrationFormCard
        title={t("Connection")}
        description={t(
          "To remove RateUp's access from Pipedrive's side, uninstall it under Tools and apps › Marketplace apps in Pipedrive.",
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
          <dt className="text-muted-foreground">{t("Pipedrive company")}</dt>
          <dd className="min-w-0">
            {companyUrl ? (
              <a
                href={companyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 truncate underline-offset-2 hover:underline"
              >
                {company}
                <IconExternalLink className="size-3.5 shrink-0" />
              </a>
            ) : (
              company
            )}
          </dd>
          <dt className="text-muted-foreground">{t("Company ID")}</dt>
          <dd>{status.companyId}</dd>
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
            <FieldLabel htmlFor="pipedrive-sync-contacts" className="text-sm font-medium">
              {t("Send contacts to Pipedrive")}
            </FieldLabel>
            <FieldDescription className="text-xs">
              {t(
                "New and edited contacts with an email or phone number are sent to Pipedrive as persons, and edits made in Pipedrive come back. Someone Pipedrive already has, by email or phone, is linked, not duplicated. Deleting a contact on either side leaves the other.",
              )}
            </FieldDescription>
          </div>
          <Switch
            id="pipedrive-sync-contacts"
            checked={status.settings.syncContacts}
            disabled={settings.isPending}
            onCheckedChange={(on) => settings.mutate({ syncContacts: on })}
          />
        </Field>
        <Field orientation="horizontal" className="mt-3 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="pipedrive-import-contacts" className="text-sm font-medium">
              {t("Add new Pipedrive persons to RateUp")}
            </FieldLabel>
            <FieldDescription className="text-xs">
              {t(
                "Persons created in Pipedrive with a phone number, including its country code, become RateUp contacts. A number or email RateUp already has is linked, not duplicated.",
              )}
            </FieldDescription>
          </div>
          <Switch
            id="pipedrive-import-contacts"
            checked={status.settings.importContacts}
            disabled={settings.isPending}
            onCheckedChange={(on) => settings.mutate({ importContacts: on })}
          />
        </Field>
      </IntegrationFormCard>

      <PipedriveDeals settings={status.settings} />

      <PipedriveBulkSync runs={status.bulk} />

      <IntegrationFormCard
        title={t("Activity")}
        description={t(
          "Logged as notes on the person in Pipedrive, who is added to Pipedrive if not there yet.",
        )}
      >
        <div className="flex flex-col gap-3">
          <Field orientation="horizontal" className="rounded-lg border border-border p-3">
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="pipedrive-log-conversations" className="text-sm font-medium">
                {t("Log closed conversations in Pipedrive")}
              </FieldLabel>
              <FieldDescription className="text-xs">
                {t(
                  "When a conversation is closed: who closed it, why, the resolution, and its last 50 messages.",
                )}
              </FieldDescription>
            </div>
            <Switch
              id="pipedrive-log-conversations"
              checked={status.settings.logConversations}
              disabled={settings.isPending}
              onCheckedChange={(on) => settings.mutate({ logConversations: on })}
            />
          </Field>
          <Field orientation="horizontal" className="rounded-lg border border-border p-3">
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="pipedrive-log-surveys" className="text-sm font-medium">
                {t("Log survey responses in Pipedrive")}
              </FieldLabel>
              <FieldDescription className="text-xs">
                {t(
                  "Each response from a known contact, with its questions and answers. Encrypted answers stay in RateUp.",
                )}
              </FieldDescription>
            </div>
            <Switch
              id="pipedrive-log-surveys"
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
