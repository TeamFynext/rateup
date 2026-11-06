import z from "zod";

const orderPaginateSchema = z.object({
  // Zero-based, matching the service's `skip = page * limit` and the dashboard, whose
  // pager holds pageIndex starting at 0. Constrained because a bare z.coerce.number()
  // accepted "-1" and "1.5" — a negative skip is rejected by Prisma at query time, and a
  // fractional one is silently meaningless.
  page: z.coerce.number().int().min(0),
  limit: z.coerce.number().int().positive(),
  storeType: z.string().optional(),
});

export type OrderPaginateSchema = z.infer<typeof orderPaginateSchema>;

// Auto-exported after fastify-zod migration
export { orderPaginateSchema };
