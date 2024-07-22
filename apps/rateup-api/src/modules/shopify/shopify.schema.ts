import { buildJsonSchemas } from "fastify-zod";
import z from "zod";
import { ShopifyEvents, ShopifySendAfter } from "../../types/enums";

const shopifySurveySchema = z.object({
  waTemplateId: z.string().uuid(),
  teamId: z.string().uuid(),
  surveyId: z.string().uuid().optional(),
  isProductSpecific: z.boolean().optional(),
  productId: z.string().optional().nullable(),
  event: z.nativeEnum(ShopifyEvents),
  //in case an org have multiple shops
  shop: z.string().optional(),
  sendAfter: z.nativeEnum(ShopifySendAfter),
});

const shopifySurveyUpdateSchema = z.object({
  waTemplateId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  surveyId: z.string().uuid().optional().optional(),
  isProductSpecific: z.boolean().optional(),
  productId: z.string().optional().nullable(),
  active: z.boolean().optional(),
  //in case an org have multiple shops
  shop: z.string().optional(),
  sendAfter: z.nativeEnum(ShopifySendAfter).optional(),
});

const byIdParamsSchema = z.object({
  id: z.string(),
});
const byShopParamsSchema = z.object({
  shop: z.string(),
});

const registerWebhookbyTopicSchema = z.object({
  topic: z.nativeEnum(ShopifyEvents),
});

export const { schemas: shopifySchema, $ref: ShopifyRef } = buildJsonSchemas(
  {
    shopifySurveySchema,
    byIdParamsSchema,
    byShopParamsSchema,
    shopifySurveyUpdateSchema,
    registerWebhookbyTopicSchema,
  },
  { $id: "shopifySchema" },
);

export type shopifySurveyInput = z.infer<typeof shopifySurveySchema>;
export type IdParamInput = z.infer<typeof byIdParamsSchema>;
export type ShopParamInput = z.infer<typeof byShopParamsSchema>;
export type shopifySurveyUpdateInput = z.infer<
  typeof shopifySurveyUpdateSchema
>;
export type registerWebhookbyTopicInput = z.infer<
  typeof registerWebhookbyTopicSchema
>;
