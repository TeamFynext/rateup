import { FastifyInstance } from "fastify";
import {
  deletePublicChatHistoryHandler,
  getChatbotPublicPageStatusHandler,
  publicChatbotMessageHandler,
} from "./chatbot.controller.js";
import {
  publicMessageSchema,
  byUserIdSchema,
  byChatbotIdSchema,
} from "./chatbot.schema.js";

export async function chatbotPublicRoute(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: publicMessageSchema,
      },
    },
    publicChatbotMessageHandler,
  );

  server.delete(
    "/:userId",
    {
      schema: {
        params: byUserIdSchema,
      },
    },
    deletePublicChatHistoryHandler,
  );

  server.get(
    "/:chatbotId",
    {
      schema: {
        params: byChatbotIdSchema,
      },
    },
    getChatbotPublicPageStatusHandler,
  );
}
