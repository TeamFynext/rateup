import z from "zod";

/**
 * What an org's webhook can subscribe to. `message_status` is a WhatsApp status
 * callback; the rest are integration events, delivered through
 * `webhook.provider.ts` in the shape `webhook.payloads.ts` documents. Each name
 * is a public contract once a receiver depends on it.
 */
export const WEBHOOK_EVENTS = [
  "message_status",
  "message.received",
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "contact.assigned",
  "contact.lifecycle_changed",
  "contact_group.members_added",
  "conversation.closed",
  "lead.created",
  "lead.stage_changed",
  "survey.response_submitted",
  "team.member_joined",
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
