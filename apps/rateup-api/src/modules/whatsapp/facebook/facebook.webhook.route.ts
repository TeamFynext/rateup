import { FastifyInstance } from "fastify";
import { facebookWebhookEventHandler } from "./facebook.controller.js";
import { webhookSubscribeHandler } from "../whatsappSurvey/wasurvey.controller.js";

export async function facebookWebhookRoutes(server: FastifyInstance) {
  server.get("/", webhookSubscribeHandler);
  server.post("/", facebookWebhookEventHandler);
}
