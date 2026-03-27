import z from "zod";

const orderPaginateSchema = z.object({
  page: z.coerce.number(),
  limit: z.coerce.number(),
});

export type OrderPaginateSchema = z.infer<typeof orderPaginateSchema>;

// Auto-exported after fastify-zod migration
export { orderPaginateSchema };
