import { FastifyInstance } from "fastify";
import { webhookSubscribeHandler } from "../whatsapp/whatsappSurvey/wasurvey.controller.js";
import { metaAgentWebhookEventHandler } from "./metaAgent.webhook.controller.js";

export async function metaAgentWebhookRoutes(server: FastifyInstance) {
  server.get("/", webhookSubscribeHandler);
  server.post("/", metaAgentWebhookEventHandler);
}
