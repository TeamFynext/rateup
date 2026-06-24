import { z } from "zod";

// Param schemas
export const instagramAutomationIdParamSchema = z.object({
  id: z.uuid(),
});

// Body schemas
export const createInstagramAutomationBodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  matchData: z.any(),
  whatsappSettingsPhoneId: z.string().nullish(),
  sendOnceIn24Hours: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateInstagramAutomationBodySchema = z.object({
  name: z.string().min(1).optional(),
  matchData: z.any().optional(),
  whatsappSettingsPhoneId: z.string().nullish(),
  sendOnceIn24Hours: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const initiateInstagramAutomationBodySchema = z.object({
  igsId: z.string().min(1, "Instagram Scoped ID (igsId) is required"),
});

// Type exports
export type InstagramAutomationIdParam = z.infer<typeof instagramAutomationIdParamSchema>;
export type CreateInstagramAutomationBody = z.infer<typeof createInstagramAutomationBodySchema>;
export type UpdateInstagramAutomationBody = z.infer<typeof updateInstagramAutomationBodySchema>;
export type InitiateInstagramAutomationBody = z.infer<typeof initiateInstagramAutomationBodySchema>;
