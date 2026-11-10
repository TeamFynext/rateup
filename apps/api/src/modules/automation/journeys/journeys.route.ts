import type { FastifyInstance } from "fastify";
import { declareAccess } from "../../../authz/registry.js";
import {
  cloneChatbotHandler,
  createChatbotHandler,
  deleteChatbotHandler,
  getChatbotHandler,
  initiateChatbotHandler,
  listChatbotRulesHandler,
  listChatbotsHandler,
  updateChatbotHandler,
} from "./journeys.controller.js";
import {
  chatbotIdParamsSchema,
  cloneChatbotBodySchema,
  createChatbotBodySchema,
  initiateChatbotBodySchema,
  listChatbotsQuerySchema,
  updateChatbotBodySchema,
} from "./journeys.schema.js";

/**
 * `/api/automation/journeys` (was `/api/chatbots`): journeys (chatbots) on every channel in one place. The channel's subscription is
 * checked per chatbot in the handlers, not as a route hook, so one closed channel never
 * blocks the others.
 */
export async function chatbotRoutes(server: FastifyInstance) {
  // The automation permissions, as chatbots always had. Moving to chatbots.* would take editing
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
  server.post(
    "/:id/initiate",
    { schema: { params: chatbotIdParamsSchema, body: initiateChatbotBodySchema } },
    initiateChatbotHandler,
  );
}
