import { FastifyInstance } from "fastify";
import fastifyRawBody from "fastify-raw-body";
import { webhookSubscribeHandler } from "../whatsapp/whatsappSurvey/wasurvey.controller.js";
import { metaAgentWebhookEventHandler } from "./metaAgent.webhook.controller.js";

export async function metaAgentWebhookRoutes(server: FastifyInstance) {
  // Meta's x-hub-signature-256 is an HMAC over the bytes it sent, so the parsed
  // object is not enough to check it. Registered scoped to this tree, the way
  // shopify.public.route.ts does. See issues.txt 43.1.
  await server.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  server.get("/", webhookSubscribeHandler);
  server.post("/", { config: { rawBody: true } }, metaAgentWebhookEventHandler);
}
