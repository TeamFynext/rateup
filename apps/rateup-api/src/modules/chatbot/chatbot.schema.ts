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

export const { schemas: chatbotSchemas, $ref: $chatbotRef } = buildJsonSchemas(
  {
    dataLoadSchema,
    chatbotMessageSchema,
  },
  {
    $id: "chatbotSchema",
  },
);

export type dataSourceUploadInput = z.infer<typeof dataLoadSchema>;
export type chatbotMessageInput = z.infer<typeof chatbotMessageSchema>;
