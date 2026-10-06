import { FastifyInstance } from "fastify";
import { webhookSubscribeHandler, whatsappEventHandler } from "./wasurvey.controller.js";
import {
  registerMetaWebhookRawBody,
  verifyMetaWebhookSignature,
} from "../meta/metaWebhookSignature.js";
import { declareAccess } from "../../../authz/registry.js";

// TODO: split this module to webhook & sendSurvey
export async function waWebhookRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "public" });
  // server.addHook("preHandler", getWhatsappSurveyVerifySubscriptionHandler);
  server.get("/", webhookSubscribeHandler);
  await registerMetaWebhookRawBody(server);
  server.post(
    "/",
    { config: { rawBody: true }, preHandler: verifyMetaWebhookSignature },
    whatsappEventHandler,
  );
}
