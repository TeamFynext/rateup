import z from "zod";

export const saveWebhookSchema = z.object({
  url: z.url().refine((u) => u.startsWith("https://"), {
    message: "Webhook URL must use HTTPS",
  }),
  events: z.array(z.string()),
  verifyToken: z.string().optional(),
});

export type SaveWebhookInput = z.infer<typeof saveWebhookSchema>;
