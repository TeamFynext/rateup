import z from "zod";

/** Two comma-separated ends, each one something `new Date` can read. */
const dateRangeSchema = z
  .string()
  .refine((value) => {
    const parts = value.split(",");
    return parts.length === 2 && parts.every((part) => !Number.isNaN(new Date(part).getTime()));
  }, "dateRange must be two comma-separated dates")
  .optional();

/** A team id, or one of the two spellings the dashboard uses for "every team". */
const teamIdSchema = z
  .string()
  .refine(
    (value) =>
      value === "all" || value === "null" || value === "" || z.uuid().safeParse(value).success,
    "teamId must be a uuid, or 'all'",
  )
  .optional();

const apiTypeSchema = z.enum(["all", "external", "whatsapp"]).optional();

const statsQuerySchema = z.object({
  dateKey: z.string().optional(),
  dateRange: dateRangeSchema,
  days: z.number().optional(),
  teamId: teamIdSchema,
  apiType: apiTypeSchema,
});

const trendQuerySchema = z.object({
  dateKey: z.string().optional(),
  dateRange: dateRangeSchema,
  days: z.number().optional(),
  teamId: teamIdSchema,
  granularity: z.enum(["hour", "day"]).optional(),
  apiType: apiTypeSchema,
});

export type StatsQuerySchema = z.infer<typeof statsQuerySchema>;
export type TrendQuerySchema = z.infer<typeof trendQuerySchema>;

// Auto-exported after fastify-zod migration
export { statsQuerySchema, trendQuerySchema };
