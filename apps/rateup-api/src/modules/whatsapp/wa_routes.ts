import { FastifyInstance } from "fastify";
import { waTemplatesRoutes } from "./messageTemplates/wa_templates.route";
import { waSettingsRoutes } from "./settings/wa_settings.route";
import { waSettingsSchema } from "./settings/wa_settings.schema";
import { waTemplateSchemas } from "./messageTemplates/wa_templates.schema";
import { waWebhookRoutes } from "./whatsappSurvey/wasurvey.route";
import { waRedirectRoutes } from "./redirect/wa_redirect.route";
import { flowRoutes } from "./flows/flow.route";
import { waFlowSchemas } from "./flows/flow.schema";
import { flowEnpointRoutes } from "./flows/flow.endpoint-routes";
import { waAutomatedReplySchemas } from "./automatedReply/wa_automatedReply.schema";
import { waAutomatedReplyRoutes } from "./automatedReply/wa_automatedReply.route";
import { waInboxRoutes } from "./inbox/wainbox.routes";
import { waAuthRoutes } from "./auth/wa_auth.route";
import { handleWhatsappError } from "./wa_error_handler";
import { waCatalogRoutes } from "./catalog/catalog.route";
import { catalogProductSchema } from "./catalog/products/product.schema";
import { waCatalogSchemas } from "./catalog/catalog.schema";
import { waCatalogOrderSchemas } from "./catalog/orders/catalogOrder.schema";
import { waRuleSchemas } from "./automatedReply/wa_rule.schema";

export async function whatsappRoutes(server: FastifyInstance) {
  const modules = [
    waSettingsSchema,
    waTemplateSchemas,
    waFlowSchemas,
    waAutomatedReplySchemas,
    catalogProductSchema,
    waCatalogSchemas,
    waCatalogOrderSchemas,
    waRuleSchemas,
  ];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }

  server.setErrorHandler(handleWhatsappError);

  server.register(waTemplatesRoutes, { prefix: "/templates" });
  server.register(flowRoutes, { prefix: "/flows" });
  server.register(waSettingsRoutes, { prefix: "/settings" });
  server.register(waAuthRoutes, { prefix: "/auth" });
  server.register(waWebhookRoutes, { prefix: "/webhook" });
  server.register(flowEnpointRoutes, { prefix: "/endpoint" });
  server.register(waRedirectRoutes, { prefix: "/redirect" });
  server.register(waAutomatedReplyRoutes, { prefix: "/automated-reply" });
  server.register(waInboxRoutes, { prefix: "/inbox" });
  server.register(waCatalogRoutes, { prefix: "/catalog" });
}
