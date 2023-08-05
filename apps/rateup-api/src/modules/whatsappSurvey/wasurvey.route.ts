import { FastifyInstance } from "fastify";
import { webhookSubscribeHandler, whatsappEventHandler } from "./wasurvey.controller";

export async function wasurveyRoutes(server: FastifyInstance) {
  server.get("/", webhookSubscribeHandler);
  server.post("/", whatsappEventHandler);
}