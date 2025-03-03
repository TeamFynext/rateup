import { FastifyInstance } from "fastify";
import { webhookSubscribeHandler } from "./wasurvey.controller";
import { getWhatsappSurveyVerifySubscriptionHandler } from "./wasurvey.auth";

// TODO: split this module to webhook & sendSurvey
export async function waWebhookRoutes(server: FastifyInstance) {
  server.addHook("preHandler", getWhatsappSurveyVerifySubscriptionHandler);
  server.get("/", webhookSubscribeHandler);
  // server.post("/", whatsappEventHandler);
}
