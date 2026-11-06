import z from "zod";

/**
 * Events posted in the envelope shape `{ id, type, createdAt, orgId, data }`
 * (`webhook.events.ts`), emitted straight from the code that made the change
 * rather than fanned out as integration events. `message.status` is the richer
 * successor of `message_status`: it is emitted once the status consumer has
 * matched the receipt to a stored message, so it knows the recipient, template
 * and source.
 */
export const ENVELOPE_WEBHOOK_EVENTS = [
  "message.status",
  "survey.response.created",
  // A WhatsApp Flow was completed. Also announced as survey.response.created (a Flow is a
  // survey underneath), so subscribe to one or the other, not both.
  "flow.response.created",
  "loyalty.points.earned",
  "loyalty.points.redeemed",
  "loyalty.points.adjusted",
] as const;

export type EnvelopeWebhookEventName = (typeof ENVELOPE_WEBHOOK_EVENTS)[number];

/**
 * What an org's webhook can subscribe to. `message_status` is a WhatsApp status
 * callback; then the integration events, delivered through
 * `webhook.provider.ts` in the shape `webhook.payloads.ts` documents; then the
 * envelope events above. Each name is a public contract once a receiver depends
 * on it.
 */
export const WEBHOOK_EVENTS = [
  "message_status",
  "message.received",
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "contact.merged",
  "contact.assigned",
  "contact.lifecycle_changed",
  "contact_group.members_added",
  "conversation.closed",
  "lead.created",
  "lead.stage_changed",
  "survey.response_submitted",
  "team.member_joined",
  ...ENVELOPE_WEBHOOK_EVENTS,
] as const;

export type WebhookEventName = (typeof WEBHOOK_EVENTS)[number];

const eventsSchema = z.array(z.enum(WEBHOOK_EVENTS)).min(1);

export const saveWebhookSchema = z.object({
  url: z
    .url()
    .max(2048)
    .refine((u) => u.startsWith("https://"), {
      message: "Webhook URL must use HTTPS",
    }),
  events: eventsSchema,
  verifyToken: z.string().min(1).max(256),
});

export type SaveWebhookInput = z.infer<typeof saveWebhookSchema>;

/** Changing what is sent does not move the endpoint, so it needs no new challenge. */
export const updateWebhookEventsSchema = z.object({ events: eventsSchema });

export type UpdateWebhookEventsInput = z.infer<typeof updateWebhookEventsSchema>;
