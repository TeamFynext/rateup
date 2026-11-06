import { z } from "zod";
import { PlatformType } from "../../generated/prisma/enums.js";
import { matchDataSchema } from "../whatsapp/automatedReply/wa_automatedReply.schema.js";
import type { ChatbotPlatform } from "./chatbotBlocks.js";
import { CHATBOT_START_KINDS } from "./chatbotStart.js";

/**
 * A chatbot's channel. Stored as WHATSAPP / INSTAGRAM / FACEBOOK; the UI keeps lowercase
 * values and says "messenger", so case is ignored and "messenger" means FACEBOOK.
 */
export const chatbotPlatformSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const upper = value.trim().toUpperCase();
    return upper === "MESSENGER" ? PlatformType.FACEBOOK : upper;
  },
  z.enum([PlatformType.WHATSAPP, PlatformType.INSTAGRAM, PlatformType.FACEBOOK]),
) as unknown as z.ZodType<ChatbotPlatform>;

export const listChatbotsQuerySchema = z.object({
  platform: chatbotPlatformSchema.optional(),
  /** "true": each chatbot comes with its graph. */
  withGraph: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  /** Part of the name, any case. */
  search: z.string().trim().max(100).optional(),
});

export const chatbotIdParamsSchema = z.object({
  id: z.uuid(),
});

export const createChatbotBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  platform: chatbotPlatformSchema,
  matchData: matchDataSchema,
  whatsappSettingsPhoneId: z.string().max(100).nullish(),
  /**
   * How it starts: a rule is made for it, switched off, so the editor can finish it. Omitted,
   * no rule is made.
   */
  start: z
    .object({
      kind: z.enum(CHATBOT_START_KINDS),
      /** The account the rule runs on; omitted, every connected one on the channel. */
      accountId: z.string().max(100).nullish(),
    })
    .optional(),
});

/**
 * Partial: the editor resends the row it loaded, so unknown keys are stripped. `platform`
 * is accepted only so a request that tries to change it can be refused by name.
 */
export const updateChatbotBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  platform: chatbotPlatformSchema.optional(),
  matchData: matchDataSchema.optional(),
  whatsappSettingsPhoneId: z.string().max(100).nullish(),
  /** Off: rules and lead ads stop starting it. */
  isActive: z.boolean().optional(),
});

export const cloneChatbotBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
  })
  .optional();

/**
 * Who to start the chatbot for, from the inbox. `recipientId` is the phone number on
 * WhatsApp, the igsId on Instagram and the psid on Messenger. `accountId` (the Instagram
 * account id or the Page id) is required on Instagram and Messenger.
 */
export const initiateChatbotBodySchema = z.object({
  recipientId: z.string().trim().min(1).max(100),
  accountId: z.string().trim().min(1).max(100).optional(),
});

export type ListChatbotsQuery = z.infer<typeof listChatbotsQuerySchema>;
export type ChatbotIdParams = z.infer<typeof chatbotIdParamsSchema>;
export type CreateChatbotBody = z.infer<typeof createChatbotBodySchema>;
export type UpdateChatbotBody = z.infer<typeof updateChatbotBodySchema>;
export type CloneChatbotBody = z.infer<typeof cloneChatbotBodySchema>;
export type InitiateChatbotBody = z.infer<typeof initiateChatbotBodySchema>;
