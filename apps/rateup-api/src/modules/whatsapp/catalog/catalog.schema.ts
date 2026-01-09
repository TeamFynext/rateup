import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const catalogIdParams = z.object({
  catalogId: z.string(),
});

const catalogWhatsappSettingSchema = z.object({
  catalogId: z.string(),
  whatsappSettingsId: z.string(),
});

const updateCatalogSchema = z.object({
  wabaId: z.string().optional(),
  name: z.string().optional(),
});

const productSetIdParamSchema = z.object({
  productSetId: z.string(),
});

const syncProductSetsSchema = z.object({
  catalogId: z.string(),
});

export const { schemas: waCatalogSchemas, $ref: $WC } = buildJsonSchemas(
  {
    catalogIdParams,
    catalogWhatsappSettingSchema,
    updateCatalogSchema,
    productSetIdParamSchema,
    syncProductSetsSchema,
  },
  { $id: "waCatalogSchemas" },
);

export type CatalogIdParam = z.infer<typeof catalogIdParams>;
export type CatalogWhatsappSettingSchema = z.infer<
  typeof catalogWhatsappSettingSchema
>;
export type UpdateCatalogSchema = z.infer<typeof updateCatalogSchema>;
export type ProductSetIdParam = z.infer<typeof productSetIdParamSchema>;
export type SyncProductSetsSchema = z.infer<typeof syncProductSetsSchema>;
