import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const catalogIdParams = z.object({
  catalogId: z.string(),
});

const businessIdParams = z.object({
  businessId: z.string(),
});

const updateCatalogSchema = z.object({
  isWhatsappConnected: z.boolean().optional(),
});
export const { schemas: waCatalogSchemas, $ref: $WC } = buildJsonSchemas(
  {
    catalogIdParams,
    businessIdParams,
    updateCatalogSchema,
  },
  { $id: "waCatalogSchemas" },
);

export type CatalogIdParam = z.infer<typeof catalogIdParams>;
export type BusinessIdParams = z.infer<typeof businessIdParams>;
export type UpdateCatalogSchema = z.infer<typeof updateCatalogSchema>;
