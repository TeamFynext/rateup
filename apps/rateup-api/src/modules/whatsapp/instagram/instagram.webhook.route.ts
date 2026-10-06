import { FastifyInstance } from "fastify";
import { webhookSubscribeHandler } from "../whatsappSurvey/wasurvey.controller.js";
import { instagramWebhookEventHandler } from "./instagram.controller.js";
import {
  registerMetaWebhookRawBody,
  verifyMetaWebhookSignature,
} from "../meta/metaWebhookSignature.js";
import { declareAccess } from "../../../authz/registry.js";

export async function instagramWebhookRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "public" });
  server.get("/", webhookSubscribeHandler);
  await registerMetaWebhookRawBody(server);
  server.post(
    "/",
    { config: { rawBody: true }, preHandler: verifyMetaWebhookSignature },
    instagramWebhookEventHandler,
  );
}
