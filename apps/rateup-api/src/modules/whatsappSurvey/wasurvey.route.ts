import { FastifyInstance } from "fastify";
import { getTemplatesHandler, sendSurveyToRGroupHandler, sendSurveyToRespondentHandler, webhookSubscribeHandler, whatsappEventHandler } from "./wasurvey.controller";

export async function waWebhookRoutes(server: FastifyInstance) {
  server.get("/", webhookSubscribeHandler);
  server.post("/", whatsappEventHandler);
}

export async function whatsappRoutes(server: FastifyInstance) {
  server.get("/send/:surveyId/resp/:respondentId", sendSurveyToRespondentHandler );
  server.get("/send/:surveyId/rgroup/:rgroupId", sendSurveyToRGroupHandler);
  server.get("/templates", getTemplatesHandler);
}
