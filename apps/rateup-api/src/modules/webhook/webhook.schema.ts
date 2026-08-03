import z from "zod";

export const WEBHOOK_EVENTS = ["message_status"] as const;

export const saveWebhookSchema = z.object({
  url: z
    .url()
    .max(2048)
    .refine((u) => u.startsWith("https://"), {
      message: "Webhook URL must use HTTPS",
    }),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  verifyToken: z.string().min(1).max(256),
});

export type SaveWebhookInput = z.infer<typeof saveWebhookSchema>;
