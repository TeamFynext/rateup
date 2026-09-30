import prisma from "../../utils/prisma.js";
import type { IntegrationEventType } from "../integrations/events/integrationEvent.types.js";
import type { IntegrationProvider } from "../integrations/providers/integrationProvider.types.js";
import { enqueueOrgWebhookDispatch } from "./webhook.service.js";

const EVENTS: readonly IntegrationEventType[] = [
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "conversation.closed",
  "lead.created",
  "lead.stage_changed",
];

/**
 * Forwards integration events to the org's outgoing Webhook, for the events it
 * subscribed to.
 *
 * `WEBHOOK_EVENTS` offers only `message_status` today, so no org can have
 * subscribed to any of these yet and this delivers nothing. Phase 3 widens that
 * list — and adds signing — at which point this starts delivering with no change
 * at the call sites.
 */
export const webhookProvider: IntegrationProvider = {
  name: "webhook",
  label: "Webhook",
  auth: "custom",
  connection: "self",
  events: EVENTS,
  // Subscriptions live on the `Webhook` row, which `handleEvent` reads.
  subscribedEvents: () => EVENTS,
  // Delivered from `outgoingWebhookQueue`, so there is no `processJob` here.
  async handleEvent(event, { orgId }) {
    const webhook = await prisma.webhook.findUnique({
      where: { orgId },
      select: { events: true },
    });
    if (!webhook?.events.includes(event.type)) return;

    const { type, ...payload } = event;
    await enqueueOrgWebhookDispatch(orgId, type, payload);
  },
};
