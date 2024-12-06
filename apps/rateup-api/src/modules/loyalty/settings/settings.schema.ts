import { buildJsonSchemas } from "fastify-zod";
import z from "zod";
import { LoyaltyTemplateTypes } from "../../../types/enums";

const loyaltyTemplateSchema = z.object({
  waTemplateId: z.string(),
  type: z.nativeEnum(LoyaltyTemplateTypes),
});

const byTypeQuerySchema = z.object({
  type: z.nativeEnum(LoyaltyTemplateTypes),
});

const updateLoyaltyTemplateSchema = z.object({
  waTemplateId: z.string().optional(),
});

export const { schemas: loyaltySettingSchemas, $ref: $lsRef } =
  buildJsonSchemas(
    {
      loyaltyTemplateSchema,
      byTypeQuerySchema,
      updateLoyaltyTemplateSchema,
    },
    { $id: "loyaltySettingSchemas" },
  );

export type LoyaltyTemplateInput = z.infer<typeof loyaltyTemplateSchema>;
export type UpdateLoyaltyTemplateInput = z.infer<
  typeof updateLoyaltyTemplateSchema
>;
export type ByTypeQueryInput = z.infer<typeof byTypeQuerySchema>;
