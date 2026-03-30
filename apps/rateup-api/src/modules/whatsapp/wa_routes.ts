import { FastifyInstance } from "fastify";
import { waTemplatesRoutes } from "./messageTemplates/wa_templates.route.js";
import { waSettingsRoutes } from "./settings/wa_settings.route.js";
import { waWebhookRoutes } from "./whatsappSurvey/wasurvey.route.js";
import { waRedirectRoutes } from "./redirect/wa_redirect.route.js";
import { flowRoutes } from "./flows/flow.route.js";
import { flowEnpointRoutes } from "./flows/flow.endpoint-routes.js";
import { waAutomatedReplyRoutes } from "./automatedReply/wa_automatedReply.route.js";
import { instagramAutomationRoutes } from "./automatedReply/instagram_automatedReply.route.js";
import { waInboxRoutes } from "./inbox/wainbox.routes.js";
import { waAuthRoutes } from "./auth/wa_auth.route.js";
import { handleWhatsappError } from "./wa_error_handler.js";
import { waCatalogRoutes } from "./catalog/catalog.route.js";

export async function whatsappRoutes(server: FastifyInstance) {
  server.setErrorHandler(handleWhatsappError);

  server.register(waTemplatesRoutes, { prefix: "/templates" });
  server.register(flowRoutes, { prefix: "/flows" });
  server.register(waSettingsRoutes, { prefix: "/settings" });
  server.register(waAuthRoutes, { prefix: "/auth" });
  server.register(waWebhookRoutes, { prefix: "/webhook" });
  server.register(flowEnpointRoutes, { prefix: "/endpoint" });
  server.register(waRedirectRoutes, { prefix: "/redirect" });
  server.register(waAutomatedReplyRoutes, { prefix: "/automated-reply" });
  server.register(instagramAutomationRoutes, {
    prefix: "/instagram-automation",
  });
  server.register(waInboxRoutes, { prefix: "/inbox" });
  server.register(waCatalogRoutes, { prefix: "/catalog" });
}
