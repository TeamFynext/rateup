import { buildJsonSchemas } from "fastify-zod";
import z from "zod";
import { ShopifyEvents } from "../../types/enums";

const shopifySurveySchema = z.object({
  surveyId: z.string().uuid(),
  isProductSpecific: z.boolean().optional(),
  productId: z.string().optional(),
  event: z.nativeEnum(ShopifyEvents),
  shop: z.string().optional(),
});

export const { schemas: shopifySchema, $ref: ShopifyRef } = buildJsonSchemas(
  {
    shopifySurveySchema,
  },
  { $id: "shopifySchema" },
);

export type shopifySurveyInput = z.infer<typeof shopifySurveySchema>;
