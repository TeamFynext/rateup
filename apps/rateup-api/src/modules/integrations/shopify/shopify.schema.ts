import { buildJsonSchemas } from "fastify-zod";
import z from "zod";
import { ShopifyEvents } from "../../../types/enums.js";

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
    byIdParamsSchema,
    byShopParamsSchema,
    registerWebhookbyTopicSchema,
  },
  { $id: "shopifySchema" },
);

export type IdParamInput = z.infer<typeof byIdParamsSchema>;
export type ShopParamInput = z.infer<typeof byShopParamsSchema>;
export type registerWebhookbyTopicInput = z.infer<
  typeof registerWebhookbyTopicSchema
>;
