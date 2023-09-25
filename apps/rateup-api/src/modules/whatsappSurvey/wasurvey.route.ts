import { FastifyInstance } from "fastify";
import { sendSurveyToRGroupHandler, sendSurveyToRespondentHandler, webhookSubscribeHandler, whatsappEventHandler } from "./wasurvey.controller";

export async function waWebhookRoutes(server: FastifyInstance) {
  server.get("/", webhookSubscribeHandler);
  server.post("/", whatsappEventHandler);
}

export async function whatsappSurveyRoutes(server: FastifyInstance) {
  server.get("/send/:surveyId/template/:templateId/resp/:respondentId", sendSurveyToRespondentHandler );
  server.get("/send/:surveyId/template/:templateId/rgroup/:rgroupId", sendSurveyToRGroupHandler);

}
