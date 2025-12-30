import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  chatbotMessageHandler,
  createChatbotHanlder,
  deleteChatHistoryHandler,
  deleteEmbeddedSourceHandler,
  deleteManyEmbeddedSourcesHandler,
  deleteSelectedChatbotHandler,
  getAllChatbotsByOrgHandler,
  getChatbotDetailsHandler,
  getChatHitoryByOrgHandler,
  getUploadedSourceHandler,
  updateChatbotDetailsHanlder,
  uploadFileForAIEmbedHandler,
  uploadSourceForEmbedHandler,
} from "./chatbot.controller.js";
import { $chatbotRef } from "./chatbot.schema.js";
import FastifyMultipart from "@fastify/multipart";
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";

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
    "/chatbot/:chatbotId",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
      schema: {
        body: $chatbotRef("updateChatbotSchema"),
      },
    },
    updateChatbotDetailsHanlder,
  );
  server.get(
    "/chatbot/:chatbotId",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    getChatbotDetailsHandler,
  );
  server.get(
    "/chathistory/:chatbotId",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    getChatHitoryByOrgHandler,
  );

  server.get(
    "/chatbots",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    getAllChatbotsByOrgHandler,
  );

  server.delete(
    "/chatbot/:chatbotId",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    deleteSelectedChatbotHandler,
  );
}
