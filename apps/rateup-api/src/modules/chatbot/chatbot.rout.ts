import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import {
  chatbotMessageHandler,
  uploadFileForAIEmbedHandler,
  uploadSourceForEmbedHandler,
} from "./chatbot.controller";
import { $chatbotRef, chatbotSchemas } from "./chatbot.schema";
import FastifyMultipart from "@fastify/multipart";

export async function chatbotRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.register(FastifyMultipart, {
    limits: {
      fileSize: 1048576 * 10,
    },
    throwFileSizeLimit: true,
  });
  chatbotSchemas.forEach((schema) => server.addSchema(schema));
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
}
