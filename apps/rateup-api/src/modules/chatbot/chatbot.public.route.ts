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
  publicMessageInput,
  UserIdInput,
} from "./chatbot.schema.js";
import { rateLimit } from "../../utils/rateLimit.js";

export async function chatbotPublicRoute(server: FastifyInstance) {
  server.post<{ Body: publicMessageInput }>(
    "/",
    {
      preHandler: rateLimit({ max: 60, windowSeconds: 60 * 60, key: "publicChatbotMessage" }),
      schema: {
        body: publicMessageSchema,
      },
    },
    publicChatbotMessageHandler,
  );

  server.delete<{ Params: UserIdInput }>(
    "/:userId",
    {
      preHandler: rateLimit({ max: 20, windowSeconds: 60 * 60, key: "publicChatbotHistoryDelete" }),
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
