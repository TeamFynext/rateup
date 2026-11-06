import { z } from "zod/v4";

export const overviewQuerySchema = z.object({
  /** How far back the time series runs. Capped so one request cannot scan years. */
  months: z.coerce.number().int().min(3).max(36).optional().default(12),
});
export type OverviewQueryInput = z.infer<typeof overviewQuerySchema>;
