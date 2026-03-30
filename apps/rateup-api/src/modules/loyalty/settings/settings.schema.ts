import z from "zod";
import {
  LoyaltyTemplateTypes,
  WaAutomatedReplyResponseType,
  LoyaltyEventType,
} from "../../../types/enums.js";

const loyaltyTemplateSchema = z.object({
  waTemplateId: z.string(),
  type: z.enum(LoyaltyTemplateTypes),
  requestMessage: z.string(),
  content: z.any().optional(),
  responseType: z.enum(WaAutomatedReplyResponseType).optional(),
  actionId: z.string().optional(),
  whatsappSettingsPhoneId: z.string().optional(),
});

const byTypeQuerySchema = z.object({
  type: z.enum(LoyaltyTemplateTypes),
});

const updateLoyaltyTemplateSchema = loyaltyTemplateSchema
  .omit({ type: true })
  .partial();

const byIdSchema = z.object({
  id: z.string(),
});

const eventTriggerSchema = z.object({
  programId: z.string(),
  eventType: z.enum(LoyaltyEventType),
  enabled: z.boolean().optional(),
  triggerDays: z.number().optional(),
  waTemplateId: z.string().optional(),
  rewardId: z.string().optional(),
});

const updateEventTriggerSchema = eventTriggerSchema
  .omit({ programId: true })
  .partial();

const programIdQuerySchema = z.object({
  programId: z.string().optional(),
});

export type LoyaltyTemplateInput = z.infer<typeof loyaltyTemplateSchema>;
export type UpdateLoyaltyTemplateInput = z.infer<
  typeof updateLoyaltyTemplateSchema
>;
export type ByTypeQueryInput = z.infer<typeof byTypeQuerySchema>;
export type IdParamInput = z.infer<typeof byIdSchema>;
export type EventTriggerInput = z.infer<typeof eventTriggerSchema>;
export type UpdateEventTriggerInput = z.infer<typeof updateEventTriggerSchema>;
export type ProgramIdQueryInput = z.infer<typeof programIdQuerySchema>;

// Auto-exported after fastify-zod migration
export {
  loyaltyTemplateSchema,
  byTypeQuerySchema,
  updateLoyaltyTemplateSchema,
  byIdSchema,
  eventTriggerSchema,
  updateEventTriggerSchema,
  programIdQuerySchema,
};
