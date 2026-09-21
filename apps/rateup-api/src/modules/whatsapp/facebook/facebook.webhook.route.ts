import { FastifyInstance } from "fastify";
import { facebookWebhookEventHandler } from "./facebook.controller.js";
import { webhookSubscribeHandler } from "../whatsappSurvey/wasurvey.controller.js";
import { declareAccess } from "../../../authz/registry.js";

export async function facebookWebhookRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "public" });
  server.get("/", webhookSubscribeHandler);
  server.post("/", facebookWebhookEventHandler);
}
