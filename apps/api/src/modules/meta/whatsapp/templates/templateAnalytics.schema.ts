import { z } from "zod";

import { MAX_LOOKBACK_DAYS } from "./templateAnalytics.service.js";

/** The channel (WhatsApp number) whose account the analytics belong to. */
export const templateAnalyticsAccountSchema = z.object({
  phoneId: z.string().min(1),
});

export const templateAnalyticsQuerySchema = z.object({
  phoneId: z.string().min(1),
  /** RateUp template ids, comma-separated or repeated. */
  templateIds: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.uuid()).min(1).max(100)),
  days: z.coerce.number().int().min(1).max(MAX_LOOKBACK_DAYS).default(30),
});

export type TemplateAnalyticsAccount = z.infer<typeof templateAnalyticsAccountSchema>;
export type TemplateAnalyticsQuery = z.infer<typeof templateAnalyticsQuerySchema>;
