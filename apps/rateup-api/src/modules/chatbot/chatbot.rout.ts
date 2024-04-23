import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import {
  chatbotMessageHandler,
  createChatbotHanlder,
  deleteChatHistoryHandler,
  deleteEmbeddedSourceHandler,
  deleteManyEmbeddedSourcesHandler,
  getChatbotDetailsHandler,
  getUploadedSourceHandler,
  updateChatbotDetailsHanlder,
  uploadFileForAIEmbedHandler,
  uploadSourceForEmbedHandler,
} from "./chatbot.controller";
import { $chatbotRef } from "./chatbot.schema";
import FastifyMultipart from "@fastify/multipart";
import { checkRoleHandler } from "../../utils/checkRoleHandler";

export async function chatbotRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.register(FastifyMultipart, {
    limits: {
      fileSize: 1048576 * 50,
    },
    throwFileSizeLimit: true,
  });
  server.post(
    "/embed-doc",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
      schema: {
        body: $chatbotRef("dataLoadSchema"),
      },
    },
    uploadSourceForEmbedHandler,
  );

  server.post(
    "/embed-doc/file",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
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
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
      schema: {
        body: $chatbotRef("deleteContentSchema"),
      },
    },
    deleteEmbeddedSourceHandler,
  );

  server.delete(
    "/delete-many-sources",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
      schema: {
        body: $chatbotRef("deleteManyContentSchema"),
      },
    },
    deleteManyEmbeddedSourcesHandler,
  );

  server.delete("/delete-chat-history", {}, deleteChatHistoryHandler);

  server.post(
    "/chatbot",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    createChatbotHanlder,
  );

  server.put(
    "/chatbot",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
      schema: {
        body: $chatbotRef("updateChatbotSchema"),
      },
    },
    updateChatbotDetailsHanlder,
  );
  server.get(
    "/chatbot",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    getChatbotDetailsHandler,
  );
}
