import { FastifyInstance } from "fastify";
import { sendSurveyToWaCustomerGroupHandler, sendSurveyToWaCustomerHandler, webhookSubscribeHandler, whatsappEventHandler } from "./wasurvey.controller";

// TODO: split this module to webhook & sendSurvey
export async function waWebhookRoutes(server: FastifyInstance) {
  server.get(
    "/:orgId",
    webhookSubscribeHandler
  );
  server.post(
    "/:orgId",
    whatsappEventHandler
  );
}

export async function whatsappSurveyRoutes(server: FastifyInstance) {
  server.get("/send/:surveyId/template/:templateId/waCustomer/:waCustomerId", sendSurveyToWaCustomerHandler);
  server.get("/send/:surveyId/template/:templateId/waCustomerGroup/:waCustomerGroupId", sendSurveyToWaCustomerGroupHandler);

}
