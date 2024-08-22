import { FastifyInstance } from "fastify";
import { verifyApiAccessTokenHook } from "../../apiAccessToken/apiAccessToken.auth";
import { externalCampaignRoutes } from "./campaign/campaign.external.route";
import { extContactGroupRoutes } from "./contact-group/contact-group.external.route";
import { externalTeamRoutes } from "./team/team.external.route";
import { extWaTemplateRoutes } from "./whatsapp/template/wa_templates.external.route";
import { waTemplateExternalSchemas } from "./whatsapp/template/wa_templates.external.schema";
import { extContactSchemas } from "./contact/contact.external.schema";
import { externalContactRoutes } from "./contact/contact.external.route";
import { externalLoyaltyRoutes } from "./loyalty/external.loyalty.routes";
import { waTemplateSchemas } from "./whatsapp/internal-copy/whatsapp/messageTemplates/wa_templates.schema";
import { contactGroupSchemas } from "./contact/internal-copy/contact/contactGroup/contactGroup.schema";
import { extSurveyRoutes } from "./survey/survey.external.routes";

export async function v1ExternalRoutes(server: FastifyInstance) {
  server.addHook("onRequest", verifyApiAccessTokenHook);

  const modules = [
    extContactSchemas,
    waTemplateExternalSchemas,
    waTemplateSchemas,
    contactGroupSchemas,
  ];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }

  server.register(extSurveyRoutes, { prefix: "/wa/surveys" });
  server.register(externalContactRoutes, { prefix: "/contacts" });
  server.register(extContactGroupRoutes, { prefix: "/contact-groups" });
  server.register(externalLoyaltyRoutes, { prefix: "/loyalty" });
  server.register(externalTeamRoutes, { prefix: "/teams" });
  server.register(externalCampaignRoutes, { prefix: "/campaigns" });
  server.register(extWaTemplateRoutes, { prefix: "/wa/templates" });
}
