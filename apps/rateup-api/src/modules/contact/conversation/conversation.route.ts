import { FastifyInstance } from "fastify";
import { $conversationRef } from "./conversation.schema";
import {
  getConversationOverviewHandler,
  updateConversationHandler,
} from "./conversation.controller";
import { get } from "axios";

export async function conversationRoutes(server: FastifyInstance) {
  server.put(
    "/:conversationId",
    {
      schema: {
        body: $conversationRef("updateConversationSchema"),
        params: $conversationRef("conversationParamsSchema"),
      },
    },
    updateConversationHandler,
  );

  server.get("/overview", getConversationOverviewHandler);
}
