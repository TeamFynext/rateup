import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const catalogIdParams = z.object({
  catalogId: z.string(),
});
export const { schemas: waCatalogSchemas, $ref: $WC } = buildJsonSchemas(
  {
    catalogIdParams,
  },
  { $id: "waCatalogSchemas" },
);

export type CatalogIdParam = z.infer<typeof catalogIdParams>;
