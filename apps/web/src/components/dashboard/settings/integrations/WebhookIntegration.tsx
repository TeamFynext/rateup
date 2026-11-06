import { Button } from "@rateup/ui/components/button";
import { Card, CardContent, CardHeader } from "@rateup/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rateup/ui/components/empty";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { IconWebhook } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { WebhookEvent } from "@/backend/webhook/webhook.api";
import { useUpdateWebhookEventsMutation, useWebhook } from "@/backend/webhook/webhook.query";
import { usePermissions } from "@/hooks/usePermission.ts";

import { INTEGRATIONS_CONFIG } from "./integrations.config.ts";
import { IntegrationShell } from "./IntegrationShell.tsx";
import { WebhookEndpointCard } from "./webhook/WebhookEndpointCard.tsx";
import { WebhookEventsCard } from "./webhook/WebhookEventsCard.tsx";
import { WebhookSigningCard } from "./webhook/WebhookSigningCard.tsx";

/** What a new webhook starts with: delivery receipts, the event most integrations want first. */
const DEFAULT_EVENTS: WebhookEvent[] = ["message.status"];

function LoadingCards() {
  return (
    <>
      {[0, 1].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-9 w-full max-w-xl" />
            <Skeleton className="h-9 w-full max-w-xl" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

/** The host of a stored URL for the status line, or the URL itself if it does not parse. */
function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * The organisation's one webhook: every event it subscribes to, signed with one secret. Not
 * set up yet, the page offers just that; once it exists, the endpoint, the events and the
 * signing secret each get a card.
 */
export default function WebhookIntegration() {
  const { t } = useTranslation();
  const { data: webhook, isLoading } = useWebhook();
  const updateEvents = useUpdateWebhookEventsMutation();
  const permissions = usePermissions();
  // As IntegrationShell does: not read-only while the permissions are still loading, so the
  // page does not flash "ask someone" at the people who can.
  const canManage = permissions.isPending || permissions.can("webhooks.manage");
  const [settingUp, setSettingUp] = useState(false);
  const [events, setEvents] = useState<WebhookEvent[]>(DEFAULT_EVENTS);

  // Follows the stored list whenever it changes on the server (a save, or another tab).
  useEffect(() => {
    if (webhook) setEvents(webhook.events);
  }, [webhook]);

  const config = INTEGRATIONS_CONFIG.webhook;

  let body;
  if (isLoading || permissions.isPending) {
    body = <LoadingCards />;
  } else if (!webhook && !settingUp) {
    body = (
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconWebhook />
              </EmptyMedia>
              <EmptyTitle>{t("No webhook yet")}</EmptyTitle>
              <EmptyDescription>
                {t(
                  "Send messages, contacts, leads, survey responses and loyalty points to your own server the moment they happen. One endpoint receives every event you pick, signed so you can trust it.",
                )}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {canManage ? (
                <Button onClick={() => setSettingUp(true)}>{t("Set up webhook")}</Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("Ask someone who can manage webhooks to set one up.")}
                </p>
              )}
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    );
  } else {
    body = (
      <>
        <WebhookEndpointCard
          key={webhook?.url ?? "new"}
          url={webhook?.url}
          events={events}
          readOnly={!canManage}
          onCancel={
            webhook
              ? undefined
              : () => {
                  setSettingUp(false);
                  setEvents(DEFAULT_EVENTS);
                }
          }
        />
        <WebhookEventsCard
          value={events}
          onChange={setEvents}
          saved={webhook?.events}
          onSave={webhook ? (next) => updateEvents.mutate(next) : undefined}
          saving={updateEvents.isPending}
          readOnly={!canManage}
        />
        {webhook && <WebhookSigningCard canManage={canManage} />}
      </>
    );
  }

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      own
      connected={Boolean(webhook?.url)}
      detail={webhook?.url ? hostOf(webhook.url) : undefined}
    >
      {body}
    </IntegrationShell>
  );
}
