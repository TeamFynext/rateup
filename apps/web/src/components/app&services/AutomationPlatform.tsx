import { IconAlertTriangle, IconRefresh, IconReload, IconTrash } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateIntegrationMutation,
  useDeleteAutomationHook,
  useDeleteIntegrationMutation,
  useIntegrationActivity,
  useIntegrationByType,
  useUpdateIntegrationMutation,
} from "@/backend/appsIntegration/integration.query";
import { ActiveStatusBadge } from "@/components/app&services/Shopify.tsx";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { ApiCopyButton } from "@/components/ExternalApi/ApiCopyButton.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { IntegratedApps, ZapierTriggers } from "@/types/enums.ts";
import type { ZapierIntegration } from "@/types/global";
import { formatToRelativeTime } from "@/utils/dateTime.ts";

/** The automation platforms whose app connects with an org-carrying API key. */
export type AutomationPlatform = IntegratedApps.make | IntegratedApps.pabbly;

type PlatformIntegration = ZapierIntegration | undefined;

/**
 * Each platform's own words: its name, what it calls a workflow, where the key
 * goes. Literal `t()` calls per platform, so the extractor sees every string.
 */
function platformCopy(t: TFunction, platform: AutomationPlatform) {
  switch (platform) {
    case IntegratedApps.make:
      return {
        keyHelp: t(
          "In Make, add a RateUp module to a scenario and paste this key when it asks for a connection. The key already knows your workspace.",
        ),
        createHelp: t("Create an API key to connect RateUp in Make. You paste it once, in Make."),
        rotateWarning: t(
          "The current key stops working at once. Every Make connection using it needs the new key.",
        ),
        disconnectTitle: t("Disconnect Make?"),
        disconnectWarning: t(
          "The API key is deleted and your scenarios stop receiving RateUp triggers. This cannot be undone.",
        ),
        triggersTitle: t("Scenario triggers"),
        triggersDescription: t("RateUp events your Make scenarios are listening to."),
        triggersEmpty: t(
          "No scenario is listening yet. Add a RateUp trigger to a Make scenario and turn it on; it shows up here.",
        ),
        stopWarning: t(
          "The scenario stops receiving it. To start again, turn the scenario off and on in Make.",
        ),
        failed: (count: number) =>
          t(
            "{count, plural, one {The last delivery to Make failed} other {The last # deliveries to Make failed}}",
            { count },
          ),
      };
    case IntegratedApps.pabbly:
      return {
        keyHelp: t(
          "In Pabbly Connect, choose RateUp in a workflow and paste this key when it asks for a connection. The key already knows your workspace.",
        ),
        createHelp: t(
          "Create an API key to connect RateUp in Pabbly Connect. You paste it once, in Pabbly Connect.",
        ),
        rotateWarning: t(
          "The current key stops working at once. Every Pabbly Connect connection using it needs the new key.",
        ),
        disconnectTitle: t("Disconnect Pabbly Connect?"),
        disconnectWarning: t(
          "The API key is deleted and your workflows stop receiving RateUp triggers. This cannot be undone.",
        ),
        triggersTitle: t("Workflow triggers"),
        triggersDescription: t("RateUp events your Pabbly Connect workflows are listening to."),
        triggersEmpty: t(
          "No workflow is listening yet. Add a RateUp trigger to a Pabbly Connect workflow; it shows up here.",
        ),
        stopWarning: t(
          "The workflow stops receiving it. To start again, set the trigger up again in Pabbly Connect.",
        ),
        failed: (count: number) =>
          t(
            "{count, plural, one {The last delivery to Pabbly Connect failed} other {The last # deliveries to Pabbly Connect failed}}",
            { count },
          ),
      };
  }
}

/**
 * An automation platform (Make, Pabbly Connect): one API key that carries the
 * org, pasted once into the platform's RateUp connection, and the triggers its
 * workflows listen on.
 */
export function AutomationPlatformPage({ platform }: Readonly<{ platform: AutomationPlatform }>) {
  const { data: integration, isLoading, isFetched } = useIntegrationByType(platform);

  // Only the first load: a refetch after the key is created must not swap the page
  // for a loader, which would remount it and lose the key on screen.
  if (isLoading && !isFetched) return <RateupLoader />;

  const config = INTEGRATIONS_CONFIG[platform];
  const connected = Boolean(integration?.credential?.accessToken);

  return (
    <IntegrationShell icon={config.icon} name={config.name} connected={connected}>
      <PlatformApiKey platform={platform} integration={integration} />
      {connected && <PlatformTriggers platform={platform} integration={integration} />}
    </IntegrationShell>
  );
}

/**
 * A key just created, per platform, for this browser session. The server keeps only
 * its hash, so this is the one chance to show it; kept outside the component so a
 * remount does not lose it. A page reload does, which is what "shown once" means.
 */
const freshKeys = new Map<AutomationPlatform, string>();

function PlatformApiKey({
  platform,
  integration,
}: Readonly<{ platform: AutomationPlatform; integration: PlatformIntegration }>) {
  const { t } = useTranslation();
  const copy = platformCopy(t, platform);
  const confirm = useConfirm();
  // Shown once, straight after it is created; the server keeps only its hash.
  const [apiKey, setApiKeyState] = useState<string | undefined>(() => freshKeys.get(platform));
  const setApiKey = (key: string | undefined) => {
    if (key) freshKeys.set(platform, key);
    else freshKeys.delete(platform);
    setApiKeyState(key);
  };
  const createMut = useCreateIntegrationMutation(platform);
  const rotateMut = useUpdateIntegrationMutation(platform);
  const deleteMut = useDeleteIntegrationMutation(platform);
  // A key just created counts before the refetch catches up.
  const hasKey = Boolean(apiKey || integration?.credential?.accessToken);
  const inputId = `${platform}-api-key`;

  function handleCreate() {
    createMut.mutate({ credential: {} }, { onSuccess: (data) => setApiKey(data?.apikey) });
  }

  async function handleRotate() {
    const ok = await confirm({
      title: t("Create a new API key?"),
      description: copy.rotateWarning,
      confirmText: t("Create new key"),
    });
    if (!ok || !integration) return;
    rotateMut.mutate(
      { credential: integration.credential, updateKey: true },
      { onSuccess: (data) => setApiKey(data?.apikey) },
    );
  }

  async function handleDisconnect() {
    const ok = await confirm({
      title: copy.disconnectTitle,
      description: copy.disconnectWarning,
      confirmText: t("Disconnect"),
    });
    if (!ok) return;
    deleteMut.mutate(undefined, { onSuccess: () => setApiKey(undefined) });
  }

  return (
    <IntegrationFormCard title={t("API key")} description={copy.keyHelp}>
      {hasKey ? (
        <Field>
          <FieldLabel htmlFor={inputId}>{t("API key")}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id={inputId}
              value={apiKey ?? "•".repeat(40)}
              disabled={!apiKey}
              readOnly
              className="font-mono"
            />
            <InputGroupAddon align="inline-end">
              {apiKey && <ApiCopyButton value={apiKey} />}
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>
            {apiKey
              ? t("Copy it now. It is shown only once.")
              : t("The key is only shown when it is created. Lost it? Create a new one.")}
          </FieldDescription>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleRotate} loading={rotateMut.isPending}>
              <IconReload className="size-4" />
              {t("Create new key")}
            </Button>
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={handleDisconnect}
              loading={deleteMut.isPending}
            >
              <IconTrash className="size-4" />
              {t("Disconnect")}
            </Button>
          </div>
        </Field>
      ) : (
        <Field>
          <FieldDescription>{copy.createHelp}</FieldDescription>
          <Button className="w-fit" onClick={handleCreate} loading={createMut.isPending}>
            {t("Create API key")}
          </Button>
        </Field>
      )}
    </IntegrationFormCard>
  );
}

function PlatformTriggers({
  platform,
  integration,
}: Readonly<{ platform: AutomationPlatform; integration: PlatformIntegration }>) {
  const { t } = useTranslation();
  const copy = platformCopy(t, platform);
  const confirm = useConfirm();
  const removeMut = useDeleteAutomationHook(platform);
  const { data, isFetching, refetch } = useIntegrationActivity(platform);
  const hooks = integration?.credential?.triggerSubscriptions ?? [];
  const health = data?.health;
  const failing = (health?.consecutiveFailures ?? 0) > 0;

  async function handleRemove(hookId: string) {
    const ok = await confirm({
      title: t("Stop sending this trigger?"),
      description: copy.stopWarning,
      confirmText: t("Stop"),
    });
    if (ok) removeMut.mutate(hookId);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.triggersTitle}</CardTitle>
        <CardDescription>{copy.triggersDescription}</CardDescription>
        <CardAction>
          {/* A span, not a <button>: the page's read-only fieldset disables buttons,
              and refreshing is a read. */}
          <Button
            render={<span />}
            variant="ghost"
            size="icon"
            aria-label={t("Refresh")}
            loading={isFetching}
            onClick={() => refetch()}
          >
            <IconRefresh className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {failing && health && (
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertTitle>{copy.failed(health.consecutiveFailures)}</AlertTitle>
            <AlertDescription>
              {health.lastErrorAt && (
                <span>
                  {t("Most recently {time}.", {
                    time: formatToRelativeTime(health.lastErrorAt),
                  })}{" "}
                </span>
              )}
              {health.lastError && (
                <code className="mt-1 block truncate font-mono text-xs" title={health.lastError}>
                  {health.lastError}
                </code>
              )}
            </AlertDescription>
          </Alert>
        )}

        {hooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.triggersEmpty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {hooks.map((hook) => (
              <li
                key={hook.id ?? hook.hookUrl}
                className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">
                    {triggerLabel(t, hook.subscribed_field)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("Listening since {time}", {
                      time: formatToRelativeTime(hook.createdAt),
                    })}
                  </span>
                </div>
                <ActiveStatusBadge active={hook.active} />
                {hook.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    aria-label={t("Stop sending this trigger")}
                    loading={removeMut.isPending && removeMut.variables === hook.id}
                    onClick={() => handleRemove(hook.id!)}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Literal `t()` calls, one per trigger, so the extractor sees every label. */
function triggerLabel(t: TFunction, trigger: ZapierTriggers): string {
  switch (trigger) {
    case ZapierTriggers.CONTACT_CREATE:
      return t("New contact");
    case ZapierTriggers.CONTACT_UPDATED:
      return t("Contact updated");
    case ZapierTriggers.CONTACT_DELETED:
      return t("Contact deleted");
    case ZapierTriggers.CONTACT_ASSIGN:
      return t("Contact assigned");
    case ZapierTriggers.CONTACT_LIFECYCLE_UPDATED:
      return t("Contact lifecycle changed");
    case ZapierTriggers.CONTACT_STAGE_UPDATED:
      return t("Lead moved to a stage");
    case ZapierTriggers.CONTACT_ADDED_TO_GROUP:
      return t("Contact added to a group");
    case ZapierTriggers.CONVERSATION_CLOSED:
      return t("Conversation closed");
    case ZapierTriggers.NEW_MESSAGE:
      return t("New message received");
    case ZapierTriggers.RESPONSE_SUBMITTED:
      return t("Survey response submitted");
    case ZapierTriggers.NEW_TEAM_MEMBER_CREATED:
      return t("Team member joined");
    default:
      return trigger;
  }
}
