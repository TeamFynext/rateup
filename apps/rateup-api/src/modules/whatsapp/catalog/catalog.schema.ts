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

export const { schemas: waCatalogSchemas, $ref: $WC } = buildJsonSchemas(
  {
    catalogIdParams,
    catalogWhatsappSettingSchema,
    updateCatalogSchema,
  },
  { $id: "waCatalogSchemas" },
);

export type CatalogIdParam = z.infer<typeof catalogIdParams>;
export type CatalogWhatsappSettingSchema = z.infer<
  typeof catalogWhatsappSettingSchema
>;
export type UpdateCatalogSchema = z.infer<typeof updateCatalogSchema>;
