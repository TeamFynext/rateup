import { FastifyInstance } from "fastify";
import {
  deletePublicChatHistoryHandler,
  publicChatbotMessageHandler,
} from "./chatbot.controller";
import { $chatbotRef } from "./chatbot.schema";

export async function chatbotPublicRoute(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $chatbotRef("publicMessageSchema"),
      },
    },
    publicChatbotMessageHandler,
  );

  server.delete(
    "/:userId",
    {
      schema: {
        params: $chatbotRef("byUserIdSchema"),
      },
    },
    deletePublicChatHistoryHandler,
  );
}
