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

const updateLoyaltyTemplateSchema = loyaltyTemplateSchema.omit({ type: true }).partial();

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

const updateEventTriggerSchema = eventTriggerSchema.omit({ programId: true }).partial();

const programIdQuerySchema = z.object({
  programId: z.string().optional(),
});

/** `PUT /event-message/:eventType` — the notification's text, saved the way the wizard does. */
const eventMessageParamsSchema = z.object({
  eventType: z.enum(LoyaltyEventType),
});

const eventMessageBodySchema = z.object({
  body: z.string().trim().min(1, "Write the message"),
  enabled: z.boolean().optional(),
});

/**
 * `PUT /reminder/:eventType` — when a scheduled reminder sends, and to whom.
 *
 * Every field is optional so the Reminders page can save one control at a time, the way
 * the Messages page saves a body. The wording is not here: it stays with the message, on
 * `PUT /event-message/:eventType`.
 */
const reminderBodySchema = z.object({
  enabled: z.boolean().optional(),
  /** Quiet days before the inactivity nudge. */
  triggerDays: z.number().int().min(1).max(3650).nullable().optional(),
  /** Days ahead of a dated occasion to send. */
  leadDays: z.number().int().min(0).max(365).nullable().optional(),
  /** Local hour to send at, in the programme's own timezone. */
  sendHour: z.number().int().min(0).max(23).nullable().optional(),
  /** A gift to issue alongside the greeting. */
  rewardId: z.string().uuid().nullable().optional(),
});

export type ReminderBodyInput = z.infer<typeof reminderBodySchema>;

export { reminderBodySchema };

export type LoyaltyTemplateInput = z.infer<typeof loyaltyTemplateSchema>;
export type UpdateLoyaltyTemplateInput = z.infer<typeof updateLoyaltyTemplateSchema>;
export type ByTypeQueryInput = z.infer<typeof byTypeQuerySchema>;
export type IdParamInput = z.infer<typeof byIdSchema>;
export type EventTriggerInput = z.infer<typeof eventTriggerSchema>;
export type UpdateEventTriggerInput = z.infer<typeof updateEventTriggerSchema>;
export type ProgramIdQueryInput = z.infer<typeof programIdQuerySchema>;
export type EventMessageParamsInput = z.infer<typeof eventMessageParamsSchema>;
export type EventMessageBodyInput = z.infer<typeof eventMessageBodySchema>;

// Auto-exported after fastify-zod migration
export {
  loyaltyTemplateSchema,
  byTypeQuerySchema,
  updateLoyaltyTemplateSchema,
  byIdSchema,
  eventTriggerSchema,
  updateEventTriggerSchema,
  programIdQuerySchema,
  eventMessageParamsSchema,
  eventMessageBodySchema,
};
