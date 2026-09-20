import { FastifyInstance } from "fastify";
import { webhookSubscribeHandler } from "../whatsappSurvey/wasurvey.controller.js";
import { instagramWebhookEventHandler } from "./instagram.controller.js";
import { declareAccess } from "../../../authz/registry.js";

export async function instagramWebhookRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "public" });
  server.get("/", webhookSubscribeHandler);
  server.post("/", instagramWebhookEventHandler);
}
