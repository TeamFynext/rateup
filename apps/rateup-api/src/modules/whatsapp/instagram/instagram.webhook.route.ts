import { FastifyInstance } from "fastify";
import { webhookSubscribeHandler } from "../whatsappSurvey/wasurvey.controller";
import { instagramWebhookEventHandler } from "./instagram.controller";

export async function instagramWebhookRoutes(server: FastifyInstance) {
  server.get("/", webhookSubscribeHandler);
  server.post("/", instagramWebhookEventHandler);
}
