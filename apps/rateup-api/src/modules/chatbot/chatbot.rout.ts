import { FastifyInstance } from "fastify";
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
import FastifyMultipart from "@fastify/multipart";
import {
  chatbotMessageSchema,
  createChatbotSchema,
  createChatbotInput,
  dataLoadSchema,
  dataSourceUploadInput,
  deleteContentSchema,
  deleteContentInput,
  deleteManyContentSchema,
  deleteManyContentInput,
  updateChatbotSchema,
  updateChatbotInput,
} from "./chatbot.schema.js";

import { declareAccess } from "../../authz/registry.js";

export async function chatbotRoutes(server: FastifyInstance) {
  declareAccess(server, { read: "chatbots.read" });
  server.register(FastifyMultipart, {
    limits: {
      fileSize: 1048576 * 50,
    },
    throwFileSizeLimit: true,
  });
  server.post<{ Body: dataSourceUploadInput }>(
    "/embed-doc",
    {
      config: { permission: "chatbots.manage" },
      schema: {
        body: dataLoadSchema,
      },
    },
    uploadSourceForEmbedHandler,
  );

  server.post(
    "/embed-doc/file",
    {
      config: { permission: "chatbots.manage" },
      schema: {
        consumes: ["multipart/form-data"],
      },
    },
    uploadFileForAIEmbedHandler,
  );

  server.post(
    "/",
    {
      config: { permission: "chatbots.read" },
      schema: {
        body: chatbotMessageSchema,
      },
    },
    chatbotMessageHandler,
  );

  server.get("/", {}, getUploadedSourceHandler);

  server.delete<{ Body: deleteContentInput }>(
    "/delete-source",
    {
      config: { permission: "chatbots.manage" },
      schema: {
        body: deleteContentSchema,
      },
    },
    deleteEmbeddedSourceHandler,
  );

  server.delete<{ Body: deleteManyContentInput }>(
    "/delete-many-sources",
    {
      config: { permission: "chatbots.manage" },
      schema: {
        body: deleteManyContentSchema,
      },
    },
    deleteManyEmbeddedSourcesHandler,
  );

  server.delete(
    "/delete-chat-history",
    {
      config: { permission: "chatbots.read" },
    },
    deleteChatHistoryHandler,
  );

  server.post<{ Body: createChatbotInput }>(
    "/chatbot",
    {
      config: { permission: "chatbots.manage" },
      schema: {
        body: createChatbotSchema,
      },
    },
    createChatbotHanlder,
  );

  server.put<{ Params: { chatbotId: string }; Body: updateChatbotInput }>(
    "/chatbot/:chatbotId",
    {
      config: { permission: "chatbots.manage" },
      schema: {
        body: updateChatbotSchema,
      },
    },
    updateChatbotDetailsHanlder,
  );
  server.get<{ Params: { chatbotId: string } }>(
    "/chatbot/:chatbotId",
    {
      config: { permission: "chatbots.manage" },
    },
    getChatbotDetailsHandler,
  );
  server.get<{ Params: { chatbotId: string } }>(
    "/chathistory/:chatbotId",
    {
      config: { permission: "chatbots.manage" },
    },
    getChatHitoryByOrgHandler,
  );

  server.get(
    "/chatbots",
    {
      config: { permission: "chatbots.manage" },
    },
    getAllChatbotsByOrgHandler,
  );

  server.delete<{ Params: { chatbotId: string } }>(
    "/chatbot/:chatbotId",
    {
      config: { permission: "chatbots.manage" },
    },
    deleteSelectedChatbotHandler,
  );
}
