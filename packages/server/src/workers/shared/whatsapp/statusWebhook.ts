import type { WebhookEventInput } from "../../../modules/webhook/webhook.events.js";

/**
 * `message.status` events for one message's batch of receipts, built in
 * `bulkUpdateStatuses` once the receipts are matched to a stored message and
 * written.
 *
 * Only a status that is both *reported* in this batch and *new* for the message
 * is announced. "New" (not already in `WaMessage.stats`) is what makes a
 * redelivered receipt — Meta repeats them, and the consumer's retry loop can
 * too — announce once. "Reported" leaves out the statuses the consumer fills in
 * on its own (a `read` with no `delivered` implies one); a receiver hears what
 * Meta said, not what was inferred.
 *
 * Sent for every outbound message of the org, whatever sent it; `source` says
 * which (`campaign`, `inbox`, `template`, `automated`, … — `WaMessage.sourceMessage`
 * lowercased), and is null for older rows that did not record it.
 */

/** The statuses a receiver can see, in the order they happen. */
export const WEBHOOK_MESSAGE_STATUSES = ["sent", "delivered", "read", "failed"] as const;

export interface MessageStatusWebhookInput {
  orgId: string | null | undefined;
  /** Meta's message id (wamid). */
  messageId: string;
  /** Statuses Meta reported in this batch, before inferred ones were filled in. */
  reported: ReadonlySet<string>;
  /** Statuses that are new for this message, mapped to when they were received. */
  newStatuses: Readonly<Record<string, string>>;
  recipientPhone: string | null | undefined;
  /** The business number (or channel identifier) the message went out on. */
  channel: string | null | undefined;
  templateName: string | null | undefined;
  sourceMessage: string | null | undefined;
  campaignId: string | null | undefined;
  /** The first entry of Meta's `errors` array on the receipt, when there was one. */
  error: { code?: unknown; title?: unknown } | null | undefined;
  /** Human-readable reason, as stored on the message (`metaErrorMessage`). */
  errorMessage: string | null | undefined;
}

export function messageStatusWebhookEvents(input: MessageStatusWebhookInput): WebhookEventInput[] {
  const { orgId } = input;
  if (!orgId) return [];

  const events: WebhookEventInput[] = [];
  for (const status of WEBHOOK_MESSAGE_STATUSES) {
    const at = input.newStatuses[status];
    if (!at || !input.reported.has(status)) continue;
    const failed = status === "failed";
    events.push({
      orgId,
      type: "message.status",
      data: {
        messageId: input.messageId,
        status,
        timestamp: at,
        recipientPhone: input.recipientPhone ?? null,
        channel: input.channel ?? null,
        templateName: input.templateName ?? null,
        source: input.sourceMessage ? input.sourceMessage.toLowerCase() : null,
        campaignId: input.campaignId || null,
        error:
          failed && (input.error || input.errorMessage)
            ? {
                code: typeof input.error?.code === "number" ? input.error.code : null,
                title: typeof input.error?.title === "string" ? input.error.title : null,
                message: input.errorMessage ?? null,
              }
            : null,
      },
    });
  }
  return events;
}
