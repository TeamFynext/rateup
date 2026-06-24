import { z } from "zod";

const matchDataSchema = z.object({
  json: z.any(),
  caseSensitive: z.boolean().optional(),
});
const createAutomatedReplySchema = z.object({
  name: z.string().min(1),
  matchData: matchDataSchema,
  whatsappSettingsPhoneId: z.string().optional(),
  platform: z.string().optional(),
});

const byWaAutomatedReplyIdParams = z.object({
  waAutomatedReplyId: z.string(),
});

const cloneAutomatedReplyBody = z.object({
  name: z.string().min(1).optional(),
});

const initiateAutomatedReplyBody = z.object({
  phone: z.string(),
});

export type CreateAutomatedReplySchema = z.infer<typeof createAutomatedReplySchema>;
export type ByWaAutomatedReplyIdParams = z.infer<typeof byWaAutomatedReplyIdParams>;
export type CloneAutomatedReplyBody = z.infer<typeof cloneAutomatedReplyBody>;
export type InitiateAutomatedReplyBody = z.infer<typeof initiateAutomatedReplyBody>;

// Auto-exported after fastify-zod migration
export {
  createAutomatedReplySchema,
  byWaAutomatedReplyIdParams,
  cloneAutomatedReplyBody,
  initiateAutomatedReplyBody,
};
