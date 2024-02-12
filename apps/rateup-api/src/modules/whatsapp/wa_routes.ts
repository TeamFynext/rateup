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

export async function whatsappRoutes(server: FastifyInstance) {
  const modules = [waSettingsSchema, waTemplateSchemas, waFlowSchemas];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }
  server.register(waTemplatesRoutes, { prefix: "/templates" });
  server.register(flowRoutes, { prefix: "/flows" });
  server.register(waSettingsRoutes, { prefix: "/settings" });
  server.register(waWebhookRoutes, { prefix: "/webhook" });
  server.register(flowEnpointRoutes, { prefix: "/endpoint" });
  server.register(waRedirectRoutes, { prefix: "/redirect" });
}
