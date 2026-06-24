import { FastifyInstance } from "fastify";
import { webhookSubscribeHandler, whatsappEventHandler } from "./wasurvey.controller.js";

// TODO: split this module to webhook & sendSurvey
export async function waWebhookRoutes(server: FastifyInstance) {
  // server.addHook("preHandler", getWhatsappSurveyVerifySubscriptionHandler);
  server.get("/", webhookSubscribeHandler);
  server.post("/", whatsappEventHandler);
}
