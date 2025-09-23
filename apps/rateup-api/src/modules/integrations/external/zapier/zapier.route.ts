import { FastifyInstance } from "fastify";
import {
  assignContactLabelsHandler,
  createContactHandler,
  getSampleContactsHandler,
  sendTextMessageHandler,
  subscribeTriggerHandler,
  unsubscribeTriggerHandler,
  zapierAuthenticationHandler,
} from "./zapier.controller";

export async function zapierRoutes(server: FastifyInstance) {
  server.post("/auth", zapierAuthenticationHandler);
  server.post("/create-contact", {}, createContactHandler);
  server.post("/send-message", {}, sendTextMessageHandler);
  server.post("/subscribe", {}, subscribeTriggerHandler);
  server.delete("/subscribe", {}, unsubscribeTriggerHandler);
  server.post("/assign-label", {}, assignContactLabelsHandler);
  server.get("/sample-contacts", getSampleContactsHandler);
}
