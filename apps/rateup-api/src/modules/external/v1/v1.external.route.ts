import { FastifyInstance } from "fastify";
import { verifyApiAccessTokenHook } from "../../apiAccessToken/apiAccessToken.auth.js";
import { externalCampaignRoutes } from "./campaign/campaign.external.route.js";
import { extContactGroupRoutes } from "./contact-group/contact-group.external.route.js";
import { externalTeamRoutes } from "./team/team.external.route.js";
import { extWaTemplateRoutes } from "./whatsapp/template/wa_templates.external.route.js";
import { waTemplateExternalSchemas } from "./whatsapp/template/wa_templates.external.schema.js";
import { extContactSchemas } from "./contact/contact.external.schema.js";
import { externalContactRoutes } from "./contact/contact.external.route.js";
import { waTemplateSchemas } from "./whatsapp/internal-copy/whatsapp/messageTemplates/wa_templates.schema.js";
import { contactGroupSchemas } from "./contact/internal-copy/contact/contactGroup/contactGroup.schema.js";
import { extSurveyRoutes } from "./survey/survey.external.routes.js";
import { externalLoyaltyRoutes } from "./loyalty/loyalty.external.routes.js";
import { extLoyaltySchemas } from "./loyalty/loyalty.external.schema.js";

export async function v1ExternalRoutes(server: FastifyInstance) {
  server.addHook("onRequest", verifyApiAccessTokenHook);

  const modules = [
    extContactSchemas,
    waTemplateExternalSchemas,
    waTemplateSchemas,
    contactGroupSchemas,
    extLoyaltySchemas,
  ];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }

  server.register(extSurveyRoutes, { prefix: "/surveys" });
  server.register(externalContactRoutes, { prefix: "/contacts" });
  server.register(extContactGroupRoutes, { prefix: "/contact-groups" });
  server.register(externalLoyaltyRoutes, { prefix: "/loyalty" });
  server.register(externalTeamRoutes, { prefix: "/teams" });
  server.register(externalCampaignRoutes, { prefix: "/campaigns" });
  server.register(extWaTemplateRoutes, { prefix: "/wa/templates" });
}
