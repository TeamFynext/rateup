import { FastifyInstance } from "fastify";

import {
  assignConversationTagsHandler,
  createConversationTagHandler,
  deleteConversationTagHandler,
  getAllConversationTagsHandler,
  getConversationTagByIdHandler,
  getConversationTagsHandler,
  updateConversationTagHandler,
} from "./conversationTag.controller.js";
import {
  assignTagsToConversationSchema,
  byConversationIdSchema,
  byTagIdSchema,
  conversationTagResponseSchema,
  createConversationTagSchema,
  updateConversationTagSchema,
} from "./conversationTag.schema.js";

export async function conversationTagRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: createConversationTagSchema,
        response: { 201: conversationTagResponseSchema },
      },
    },
    createConversationTagHandler,
  );

  server.get(
    "/",
    {
      config: { fallbackEmptyArray: true },
      schema: { response: { 200: conversationTagResponseSchema.array() } },
    },
    getAllConversationTagsHandler,
  );

  // Literal segment, declared before "/:tagId" so it is not swallowed by it.
  server.get(
    "/by-conversation/:conversationId",
    {
      config: { fallbackEmptyArray: true },
      schema: {
        params: byConversationIdSchema,
        response: { 200: conversationTagResponseSchema.array() },
      },
    },
    getConversationTagsHandler,
  );

  server.put(
    "/by-conversation/:conversationId",
    {
      schema: {
        params: byConversationIdSchema,
        body: assignTagsToConversationSchema,
        response: { 200: conversationTagResponseSchema.array() },
      },
    },
    assignConversationTagsHandler,
  );

  server.get(
    "/:tagId",
    {
      schema: {
        params: byTagIdSchema,
        response: { 200: conversationTagResponseSchema },
      },
    },
    getConversationTagByIdHandler,
  );

  server.put(
    "/:tagId",
    {
      schema: {
        params: byTagIdSchema,
        body: updateConversationTagSchema,
        response: { 200: conversationTagResponseSchema },
      },
    },
    updateConversationTagHandler,
  );

  server.delete("/:tagId", { schema: { params: byTagIdSchema } }, deleteConversationTagHandler);
}
