import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const orderPaginateSchema = z.object({
  page: z.number(),
  limit: z.number(),
});
export const { schemas: waCatalogOrderSchemas, $ref: $WCOrder } =
  buildJsonSchemas(
    {
      orderPaginateSchema,
    },
    { $id: "waCatalogOrderSchemas" },
  );

export type OrderPaginateSchema = z.infer<typeof orderPaginateSchema>;
