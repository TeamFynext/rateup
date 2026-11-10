import { FastifyInstance } from "fastify";
import { webhookSubscribeHandler } from "../whatsapp/webhook/whatsapp.controller.js";
import { instagramWebhookEventHandler } from "./instagram.controller.js";
import {
  registerMetaWebhookRawBody,
  verifyMetaWebhookSignature,
} from "../shared/metaWebhookSignature.js";
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
