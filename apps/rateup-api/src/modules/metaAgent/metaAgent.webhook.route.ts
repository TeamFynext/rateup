import { FastifyInstance } from "fastify";
import fastifyRawBody from "fastify-raw-body";
import { webhookSubscribeHandler } from "../whatsapp/whatsappSurvey/wasurvey.controller.js";
import { metaAgentWebhookEventHandler } from "./metaAgent.webhook.controller.js";

export async function metaAgentWebhookRoutes(server: FastifyInstance) {
  await server.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  server.get("/", webhookSubscribeHandler);
  server.post("/", { config: { rawBody: true } }, metaAgentWebhookEventHandler);
}
