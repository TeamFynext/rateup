import { z } from "zod";
import { matchDataSchema } from "./wa_automatedReply.schema.js";

// Param schemas
export const instagramAutomationIdParamSchema = z.object({
  id: z.uuid(),
});

// Body schemas
export const createInstagramAutomationBodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  // Same shape as WhatsApp automations: the Meta editors send { json, caseSensitive, … }.
  matchData: matchDataSchema,
  whatsappSettingsPhoneId: z.string().nullish(),
});

export const updateInstagramAutomationBodySchema = z.object({
  name: z.string().min(1).optional(),
  matchData: matchDataSchema.optional(),
  whatsappSettingsPhoneId: z.string().nullish(),
});

/**
 * Who to start the flow for, and on which account. `recipientId` is the igsId on
 * Instagram and the psid on Messenger; `accountId` is the IBA id or the Page id. The
 * Instagram-only `igsId` / `ibaId` names are still accepted.
 */
export const initiateMetaAutomationBodySchema = z
  .object({
    recipientId: z.string().min(1).optional(),
    accountId: z.string().min(1).optional(),
    igsId: z.string().min(1).optional(),
    ibaId: z.string().min(1).optional(),
  })
  .transform(({ recipientId, accountId, igsId, ibaId }) => ({
    recipientId: recipientId ?? igsId ?? "",
    accountId: accountId ?? ibaId ?? "",
  }))
  .refine((body) => body.recipientId, { message: "recipientId is required" })
  .refine((body) => body.accountId, { message: "accountId is required" });

export const cloneMetaAutomationBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
});

// Type exports
export type InstagramAutomationIdParam = z.infer<typeof instagramAutomationIdParamSchema>;
export type CreateInstagramAutomationBody = z.infer<typeof createInstagramAutomationBodySchema>;
export type UpdateInstagramAutomationBody = z.infer<typeof updateInstagramAutomationBodySchema>;
export type InitiateMetaAutomationBody = z.output<typeof initiateMetaAutomationBodySchema>;
