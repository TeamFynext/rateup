import z from "zod";

/**
 * Every event the platform actually emits. `message_status` is the only one:
 * wasurvey.controller.ts holds the single call site of enqueueWebhookDispatch.
 *
 * `events` used to be `z.array(z.string())`, so subscribing to "order.created"
 * or a misspelled "mesage_status" was accepted and simply never fired, with
 * nothing to indicate the name matched nothing. See issues.txt 34.7.
 */
export const WEBHOOK_EVENTS = ["message_status"] as const;

export const saveWebhookSchema = z.object({
  url: z
    .url()
    .max(2048)
    .refine((u) => u.startsWith("https://"), {
      message: "Webhook URL must use HTTPS",
    }),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  // Was `.optional()`, which the contract advertised and the behaviour did not
  // honour: `encodeURIComponent(undefined)` sent the literal string "undefined"
  // as the challenge, and the echo was then compared against undefined, which no
  // string satisfies — so a save with no token always failed with a message
  // blaming the receiver. See issues.txt 34.4.
  verifyToken: z.string().min(1).max(256),
});

export type SaveWebhookInput = z.infer<typeof saveWebhookSchema>;
