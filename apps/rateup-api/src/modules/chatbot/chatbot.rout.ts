import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import {
  chatbotMessageHandler,
  deleteChatHistoryHandler,
  deleteEmbeddedSourceHandler,
  deleteManyEmbeddedSourcesHandler,
  getUploadedSourceHandler,
  uploadFileForAIEmbedHandler,
  uploadSourceForEmbedHandler,
} from "./chatbot.controller";
import { $chatbotRef } from "./chatbot.schema";
import FastifyMultipart from "@fastify/multipart";

export async function chatbotRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.register(FastifyMultipart, {
    limits: {
      fileSize: 1048576 * 10,
    },
    throwFileSizeLimit: true,
  });
  server.post(
    "/embed-doc",
    {
      schema: {
        body: $chatbotRef("dataLoadSchema"),
      },
    },
    uploadSourceForEmbedHandler,
  );

  server.post(
    "/embed-doc/file",
    {
      schema: {
        consumes: ["multipart/form-data"],
      },
    },
    uploadFileForAIEmbedHandler,
  );

  server.post(
    "/",
    {
      schema: {
        body: $chatbotRef("chatbotMessageSchema"),
      },
    },
    chatbotMessageHandler,
  );

  server.get("/", {}, getUploadedSourceHandler);

  server.delete(
    "/delete-source",
    {
      schema: {
        body: $chatbotRef("deleteContentSchema"),
      },
    },
    deleteEmbeddedSourceHandler,
  );

  server.delete(
    "/delete-many-sources",
    {
      schema: {
        body: $chatbotRef("deleteManyContentSchema"),
      },
    },
    deleteManyEmbeddedSourcesHandler,
  );

  server.delete("/delete-chat-history", {}, deleteChatHistoryHandler);
}
