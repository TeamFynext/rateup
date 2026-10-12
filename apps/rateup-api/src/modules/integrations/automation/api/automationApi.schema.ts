import z from "zod";

import { WaMessageAssignStatus } from "../../../../types/enums.js";
import { contactCoreSchema } from "../../../contact/contact.schema.js";
import { ZapierTriggers } from "../../external/zapier/zapier.types.js";

// Customers' Make scenarios and Pabbly workflows are built on these shapes;
// changing one breaks them.

/**
 * A phone with its country code. Scenarios map numbers as they find them
 * ("+91 98765 43210"), so everything but the digits is dropped first.
 */
const phoneSchema = z
  .string()
  .transform((phone) => phone.replace(/\D/g, ""))
  .pipe(z.string().regex(/^\d{6,15}$/, "Phone must be digits with the country code"));

export const automationHookBodySchema = z.object({
  url: z.url().refine((u) => u.startsWith("https://"), { message: "Hook URL must use HTTPS" }),
  event: z.enum(ZapierTriggers),
});

export const automationHookParamsSchema = z.object({ id: z.string().min(1) });

export const automationSampleQuerySchema = z.object({ event: z.enum(ZapierTriggers) });

export const automationContactParamsSchema = z.object({ id: z.uuid() });

export const automationCreateContactSchema = z.object({
  name: z.string().min(1),
  phone: phoneSchema,
  email: z.email().optional(),
  /** `LOYALTY` registers the contact in the loyalty programme. */
  source: z.string().default("INDIVIDUAL"),
});

export const automationUpdateContactSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.email().optional(),
    /** Open or close the contact's conversation. */
    waMessageAssignStatus: z.enum(WaMessageAssignStatus).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update" });

export const automationContactSearchSchema = z
  .object({
    phone: z.string().optional(),
    email: z.string().optional(),
  })
  .refine((q) => !!q.phone || !!q.email, { message: "Give a phone or an email" });

export const automationLifecycleBodySchema = z.object({ lifecycleId: z.string().min(1) });

export const automationGroupParamsSchema = z.object({ groupId: z.string().min(1) });

export const automationGroupMembersSchema = z.object({
  contacts: z.array(contactCoreSchema.partial().required({ name: true, source: true })).min(1),
});

export const automationGroupsQuerySchema = z.object({ teamId: z.string().optional() });

export const automationTextMessageSchema = z.object({
  phone: phoneSchema,
  message: z.string().min(1),
});

export const automationTemplateMessageSchema = z.object({
  phone: phoneSchema,
  templateId: z.string().min(1),
  /** The body's {{1}}, {{2}}, … in order. */
  variables: z.array(z.string()).default([]),
  /** Only needed for a template whose button opens a survey flow. */
  teamId: z.string().optional(),
});

export type AutomationHookBody = z.infer<typeof automationHookBodySchema>;
export type AutomationCreateContact = z.infer<typeof automationCreateContactSchema>;
export type AutomationUpdateContact = z.infer<typeof automationUpdateContactSchema>;
export type AutomationContactSearch = z.infer<typeof automationContactSearchSchema>;
export type AutomationGroupMembers = z.infer<typeof automationGroupMembersSchema>;
export type AutomationTextMessage = z.infer<typeof automationTextMessageSchema>;
export type AutomationTemplateMessage = z.infer<typeof automationTemplateMessageSchema>;
