import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { ChatBotDataSourceType } from "../../types/enums";

export const dataLoadSchema = z.object({
  source: z.string(),
  type: z.nativeEnum(ChatBotDataSourceType),
});

export const chatbotMessageSchema = z.object({
  query: z.string(),
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

export const { schemas: chatbotSchemas, $ref: $chatbotRef } = buildJsonSchemas(
  {
    dataLoadSchema,
    chatbotMessageSchema,
    deleteContentSchema,
    deleteManyContentSchema,
    publicMessageSchema,
    byUserIdSchema,
  },
  {
    $id: "chatbotSchema",
  },
);

export type dataSourceUploadInput = z.infer<typeof dataLoadSchema>;
export type chatbotMessageInput = z.infer<typeof chatbotMessageSchema>;
export type deleteContentInput = z.infer<typeof deleteContentSchema>;
export type deleteManyContentInput = z.infer<typeof deleteManyContentSchema>;
export type publicMessageInput = z.infer<typeof publicMessageSchema>;
export type UserIdInput = z.infer<typeof byUserIdSchema>;
