import { z } from "zod";

import { INSIGHTS_RANGES } from "./instagram_insights.service.js";

export const instagramInsightsParamsSchema = z.object({
  ibaId: z.string().min(1).max(100),
});

export const instagramInsightsQuerySchema = z.object({
  range: z.enum(INSIGHTS_RANGES).default("30d"),
  /** The analytics Refresh button: skip the hour-long cache. */
  fresh: z.union([z.literal("1"), z.literal("true")]).optional(),
});

export type InstagramInsightsParams = z.infer<typeof instagramInsightsParamsSchema>;
export type InstagramInsightsQuery = z.infer<typeof instagramInsightsQuerySchema>;
