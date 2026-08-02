import { z } from "zod";
import { ChatBotDataSourceType, ChatbotPublicPageStatus } from "../../types/enums.js";

export const dataLoadSchema = z.object({
  source: z.string(),
  type: z.enum(ChatBotDataSourceType),
  chatbotId: z.string(),
});

export const chatbotMessageSchema = z.object({
  query: z.string(),
  chatbotId: z.string(),
});

export const deleteContentSchema = z.object({
  contentSource: z.string(),
  contentType: z.string(),
});

export const publicMessageSchema = chatbotMessageSchema.extend({
  chatbotId: z.string(),
  userId: z.string(),
});

export const deleteManyContentSchema = z.array(deleteContentSchema);

export const byUserIdSchema = z.object({
  userId: z.string(),
});

export const byChatbotIdSchema = z.object({
  chatbotId: z.string(),
});

// The create route declared no body schema, so `name` was whatever arrived —
// including undefined, which prisma filled from the column default.
// See issues.txt 21.13.
export const createChatbotSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const updateChatbotSchema = z.object({
  publicPageStatus: z.enum(ChatbotPublicPageStatus).optional(),
  enableWaChat: z.boolean().optional(),
  waCommand: z.string().optional(),
  waPrompt: z.string().optional(),
  enableAllWaChat: z.boolean().optional(),
});

export type dataSourceUploadInput = z.infer<typeof dataLoadSchema>;
export type chatbotMessageInput = z.infer<typeof chatbotMessageSchema>;
export type deleteContentInput = z.infer<typeof deleteContentSchema>;
export type deleteManyContentInput = z.infer<typeof deleteManyContentSchema>;
export type publicMessageInput = z.infer<typeof publicMessageSchema>;
export type UserIdInput = z.infer<typeof byUserIdSchema>;
export type ChatbotIdInput = z.infer<typeof byChatbotIdSchema>;
export type updateChatbotInput = z.infer<typeof updateChatbotSchema>;
export type createChatbotInput = z.infer<typeof createChatbotSchema>;
