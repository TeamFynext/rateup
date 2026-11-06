import { FastifyInstance } from "fastify";
import { facebookWebhookEventHandler } from "./facebook.controller.js";
import { webhookSubscribeHandler } from "../whatsappSurvey/wasurvey.controller.js";
import {
  registerMetaWebhookRawBody,
  verifyMetaWebhookSignature,
} from "../meta/metaWebhookSignature.js";
import { declareAccess } from "../../../authz/registry.js";

export async function facebookWebhookRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "public" });
  server.get("/", webhookSubscribeHandler);
  await registerMetaWebhookRawBody(server);
  server.post(
    "/",
    { config: { rawBody: true }, preHandler: verifyMetaWebhookSignature },
    facebookWebhookEventHandler,
  );
}
