import type { FastifyInstance } from "fastify";
import { declareAccess } from "../../authz/registry.js";
import {
  cloneChatbotHandler,
  createChatbotHandler,
  deleteChatbotHandler,
  getChatbotHandler,
  listChatbotRulesHandler,
  listChatbotsHandler,
  updateChatbotHandler,
} from "./chatbots.controller.js";
import {
  chatbotIdParamsSchema,
  cloneChatbotBodySchema,
  createChatbotBodySchema,
  listChatbotsQuerySchema,
  updateChatbotBodySchema,
} from "./chatbots.schema.js";

/**
 * `/api/chatbots`: chatbots on every channel in one place. The channel's subscription is
 * checked per chatbot in the handlers, not as a route hook, so one closed channel never
 * blocks the others.
 */
export async function chatbotRoutes(server: FastifyInstance) {
  // The same permissions as the per-channel routes. Moving to chatbots.* would take editing
  // away from STAFF, who hold automation.manage but not chatbots.manage.
  declareAccess(server, { read: "automation.read", write: "automation.manage" });

  server.get("/", { schema: { querystring: listChatbotsQuerySchema } }, listChatbotsHandler);
  server.get("/:id", { schema: { params: chatbotIdParamsSchema } }, getChatbotHandler);
  server.get("/:id/rules", { schema: { params: chatbotIdParamsSchema } }, listChatbotRulesHandler);
  server.post("/", { schema: { body: createChatbotBodySchema } }, createChatbotHandler);
  server.put(
    "/:id",
    { schema: { params: chatbotIdParamsSchema, body: updateChatbotBodySchema } },
    updateChatbotHandler,
  );
  server.delete("/:id", { schema: { params: chatbotIdParamsSchema } }, deleteChatbotHandler);
  server.post(
    "/:id/clone",
    { schema: { params: chatbotIdParamsSchema, body: cloneChatbotBodySchema } },
    cloneChatbotHandler,
  );
}
