import z from "zod";
import {
  CatalogStoreType,
  CatalogPaymentMethod,
} from "../../../types/enums.js";

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
  autoCheckoutEnabled: z.boolean().optional(),
  checkoutMessage: z.string().optional(),
});

const productSetIdParamSchema = z.object({
  productSetId: z.string(),
});

const syncProductSetsSchema = z.object({
  catalogId: z.string(),
});

// Catalog Settings (store type / payment / address flow / delivery)

const deliveryOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  charge: z.number(),
  days: z.string().optional(),
  enabled: z.boolean(),
});

const updateCatalogSettingsSchema = z.object({
  storeType: z.nativeEnum(CatalogStoreType).optional(),
  paymentMethod: z.nativeEnum(CatalogPaymentMethod).optional(),
  standardPaymentConfig: z.record(z.string(), z.any()).optional(),
  collectAddress: z.boolean().optional(),
  collectDelivery: z.boolean().optional(),
  fixedDeliveryCharge: z.boolean().optional(),
  fixedDeliveryAmount: z.number().optional(),
  deliveryOptions: z.array(deliveryOptionSchema).optional(),
});

const createAddressFlowSchema = z.object({
  json: z.any().optional(),
  map: z.any().optional(),
});

export type CatalogIdParam = z.infer<typeof catalogIdParams>;
export type CatalogWhatsappSettingSchema = z.infer<
  typeof catalogWhatsappSettingSchema
>;
export type UpdateCatalogSchema = z.infer<typeof updateCatalogSchema>;
export type ProductSetIdParam = z.infer<typeof productSetIdParamSchema>;
export type SyncProductSetsSchema = z.infer<typeof syncProductSetsSchema>;
export type UpdateCatalogSettingsSchema = z.infer<
  typeof updateCatalogSettingsSchema
>;
export type DeliveryOptionSchema = z.infer<typeof deliveryOptionSchema>;
export type CreateAddressFlowSchema = z.infer<typeof createAddressFlowSchema>;

// Auto-exported after fastify-zod migration
export {
  catalogIdParams,
  catalogWhatsappSettingSchema,
  updateCatalogSchema,
  productSetIdParamSchema,
  syncProductSetsSchema,
  updateCatalogSettingsSchema,
  deliveryOptionSchema,
  createAddressFlowSchema,
};
