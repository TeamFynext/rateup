import { FastifyInstance } from "fastify";
import { webhookSubscribeHandler } from "../whatsappSurvey/wasurvey.controller.js";
import { instagramWebhookEventHandler } from "./instagram.controller.js";

export async function instagramWebhookRoutes(server: FastifyInstance) {
  server.get("/", webhookSubscribeHandler);
  server.post("/", instagramWebhookEventHandler);
}
