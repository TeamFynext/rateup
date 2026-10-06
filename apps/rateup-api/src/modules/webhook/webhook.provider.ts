import prisma from "../../utils/prisma.js";
import type { IntegrationEventType } from "../integrations/events/integrationEvent.types.js";
import type { IntegrationProvider } from "../integrations/providers/integrationProvider.types.js";
import { toWebhookPayload } from "./webhook.payloads.js";
import { WEBHOOK_EVENTS } from "./webhook.schema.js";
import { enqueueOrgWebhookDispatch } from "./webhook.service.js";

/** Every webhook event that is an integration event — all but the WhatsApp status callback. */
const EVENTS = WEBHOOK_EVENTS.filter(
  (event): event is Exclude<(typeof WEBHOOK_EVENTS)[number], "message_status"> =>
    event !== "message_status",
) satisfies readonly IntegrationEventType[];

/**
 * Forwards integration events to the org's outgoing Webhook, for the events it
 * subscribed to, in the public shape `webhook.payloads.ts` defines. Delivery and
 * signing happen on `outgoingWebhookQueue` (`deliverOutgoingWebhook`).
 */
export const webhookProvider: IntegrationProvider = {
  name: "webhook",
  label: "Webhook",
  auth: "custom",
  connection: "self",
  events: EVENTS,
  // Subscriptions live on the `Webhook` row, which `handleEvent` reads.
  subscribedEvents: () => EVENTS,
  async orgSubscribedEvents(orgId) {
    const webhook = await prisma.webhook.findUnique({
      where: { orgId },
      select: { events: true },
    });
    return EVENTS.filter((event) => webhook?.events.includes(event));
  },
  async handleEvent(event, { orgId }) {
    const webhook = await prisma.webhook.findUnique({
      where: { orgId },
      select: { events: true },
    });
    if (!webhook?.events.includes(event.type)) return;

    const delivery = toWebhookPayload(event);
    if (!delivery) return;
    await enqueueOrgWebhookDispatch(orgId, delivery.event, delivery.payload);
  },
};
