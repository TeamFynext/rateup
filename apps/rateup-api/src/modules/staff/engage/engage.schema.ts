import { z } from "zod";
import { broadcastAudienceSchema } from "../../customerComms/audience.js";
import { dripEmailSchema, dripWhatsappSchema } from "../../customerComms/dripContent.js";

export const dripKeyParamSchema = z.object({ key: z.string().min(1).max(64) });
export type DripKeyParam = z.infer<typeof dripKeyParamSchema>;

export const dripToggleSchema = z.object({ enabled: z.boolean() });
export type DripToggleInput = z.infer<typeof dripToggleSchema>;

export const dripEmailInputSchema = z.object({ email: dripEmailSchema });
export type DripEmailInput = z.infer<typeof dripEmailInputSchema>;

export const dripContentSchema = z.object({
  email: dripEmailSchema,
  /** Null sends no WhatsApp for this step. */
  whatsappTemplate: dripWhatsappSchema.shape.template,
});
export type DripContentInput = z.infer<typeof dripContentSchema>;

const channel = z.enum(["EMAIL", "WHATSAPP"]);

export const broadcastInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  channels: z.array(channel).min(1),
  audience: broadcastAudienceSchema,
  emailSubject: z.string().trim().max(200).nullish(),
  emailBody: z.string().max(20_000).nullish(),
  ctaLabel: z.string().trim().max(40).nullish(),
  ctaUrl: z.url().max(500).nullish(),
  waTemplateName: z.string().trim().max(512).nullish(),
  waParams: z.array(z.string().max(500)).max(10).default([]),
});
export type BroadcastInput = z.infer<typeof broadcastInputSchema>;

export const audiencePreviewSchema = z.object({ audience: broadcastAudienceSchema });
export type AudiencePreviewInput = z.infer<typeof audiencePreviewSchema>;

export const scheduleSchema = z.object({
  /** Omitted = now. */
  at: z.coerce.date().optional(),
});
export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const testSendSchema = z.object({
  channel: channel.default("EMAIL"),
  phone: z.string().max(30).optional(),
});
export type TestSendInput = z.infer<typeof testSendSchema>;
