import z from "zod";

const statsQuerySchema = z.object({
  dateKey: z.string().optional(),
  dateRange: z.string().optional(),
  days: z.number().optional(),
  teamId: z.string().optional(),
  apiType: z.string().optional(),
});

const trendQuerySchema = z.object({
  dateKey: z.string().optional(),
  dateRange: z.string().optional(),
  days: z.number().optional(),
  teamId: z.string().optional(),
  granularity: z.enum(["hour", "day"]).optional(),
  apiType: z.string().optional(),
});

export type StatsQuerySchema = z.infer<typeof statsQuerySchema>;
export type TrendQuerySchema = z.infer<typeof trendQuerySchema>;

// Auto-exported after fastify-zod migration
export { statsQuerySchema, trendQuerySchema };
