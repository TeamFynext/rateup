import z from "zod";
import { ShopifyEvents } from "../../../types/enums.js";

const byIdParamsSchema = z.object({
  id: z.string(),
});
const byShopParamsSchema = z.object({
  shop: z.string(),
});

const registerWebhookbyTopicSchema = z.object({
  topic: z.enum(ShopifyEvents),
});

export type IdParamInput = z.infer<typeof byIdParamsSchema>;
export type ShopParamInput = z.infer<typeof byShopParamsSchema>;
export type registerWebhookbyTopicInput = z.infer<
  typeof registerWebhookbyTopicSchema
>;

// Auto-exported after fastify-zod migration
export { byIdParamsSchema, byShopParamsSchema, registerWebhookbyTopicSchema };
