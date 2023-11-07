import { FastifyInstance } from "fastify";
import { webhookSubscribeHandler, whatsappEventHandler } from "./wasurvey.controller";

// TODO: split this module to webhook & sendSurvey
export async function waWebhookRoutes(server: FastifyInstance) {
  server.get(
    "/:orgId",
    webhookSubscribeHandler
  );
  server.post(
    "/:orgId",
    whatsappEventHandler
  );
}
