import { buildJsonSchemas } from "fastify-zod";
import z from "zod";
import {
  LoyaltyTemplateTypes,
  WaAutomatedReplyResponseType,
} from "../../../types/enums";

const loyaltyTemplateSchema = z.object({
  waTemplateId: z.string(),
  type: z.nativeEnum(LoyaltyTemplateTypes),
  requestMessage: z.string(),
  content: z.any().optional(),
  responseType: z.nativeEnum(WaAutomatedReplyResponseType).optional(),
  actionId: z.string().optional(),
  whatsappSettingsPhoneId: z.string().optional(),
});

const byTypeQuerySchema = z.object({
  type: z.nativeEnum(LoyaltyTemplateTypes),
});

const updateLoyaltyTemplateSchema = loyaltyTemplateSchema
  .omit({ type: true })
  .partial();

const byIdSchema = z.object({
  id: z.string(),
});

export const { schemas: loyaltySettingSchemas, $ref: $lsRef } =
  buildJsonSchemas(
    {
      loyaltyTemplateSchema,
      byTypeQuerySchema,
      updateLoyaltyTemplateSchema,
      byIdSchema,
    },
    { $id: "loyaltySettingSchemas" },
  );

export type LoyaltyTemplateInput = z.infer<typeof loyaltyTemplateSchema>;
export type UpdateLoyaltyTemplateInput = z.infer<
  typeof updateLoyaltyTemplateSchema
>;
export type ByTypeQueryInput = z.infer<typeof byTypeQuerySchema>;
export type IdParamInput = z.infer<typeof byIdSchema>;
