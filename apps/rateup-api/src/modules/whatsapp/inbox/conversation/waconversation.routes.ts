import { FastifyInstance } from "fastify";
import {
  assignConversationHandler,
  closeConversationHandler,
  getConversationCountsHandler,
  getConversationMessagesHandler,
  getFilteredConversationsHandler,
  markConversationReadHandler,
  reopenConversationHandler,
  sendConversationMessageHandler,
} from "./waconversation.controller.js";
import {
  assignConversationBodySchema,
  byConversationIdSchema,
  closeConversationBodySchema,
  conversationFilterSchema,
  conversationMessagesQuerySchema,
  reopenConversationBodySchema,
} from "./waconversation.schema.js";

/// The conversation-keyed inbox API (`/api/wa/inbox/conversation`): the
/// session-centric successor of the contact-keyed routes under `/message`,
/// which remain as facades until the UI has fully migrated.
export async function waConversationRoutes(server: FastifyInstance) {
  server.post(
    "/filtered",
    { schema: { body: conversationFilterSchema } },
    getFilteredConversationsHandler,
  );

  server.get("/count", getConversationCountsHandler);

  server.get(
    "/:conversationId/messages",
    {
      schema: {
        params: byConversationIdSchema,
        querystring: conversationMessagesQuerySchema,
      },
    },
    getConversationMessagesHandler,
  );

  server.post(
    "/:conversationId/message",
    { schema: { params: byConversationIdSchema } },
    sendConversationMessageHandler,
  );

  server.post(
    "/:conversationId/close",
    {
      schema: {
        params: byConversationIdSchema,
        body: closeConversationBodySchema,
      },
    },
    closeConversationHandler,
  );

  server.post(
    "/:conversationId/reopen",
    {
      schema: {
        params: byConversationIdSchema,
        body: reopenConversationBodySchema,
      },
    },
    reopenConversationHandler,
  );

  server.post(
    "/:conversationId/assign",
    {
      schema: {
        params: byConversationIdSchema,
        body: assignConversationBodySchema,
      },
    },
    assignConversationHandler,
  );

  server.post(
    "/:conversationId/read",
    { schema: { params: byConversationIdSchema } },
    markConversationReadHandler,
  );
}
