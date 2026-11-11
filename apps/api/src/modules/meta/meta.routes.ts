import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { waTemplatesRoutes } from "./whatsapp/templates/templates.route.js";
import { waIceBreakerRoutes, waSettingsRoutes } from "./whatsapp/settings/settings.route.js";
import { waWebhookRoutes } from "./whatsapp/webhook/whatsapp.route.js";
import { waRedirectRoutes } from "./whatsapp/redirect/redirect.route.js";
import { flowRoutes } from "./whatsapp/flows/flow.route.js";
import { flowEnpointRoutes } from "./whatsapp/flows/flow.endpoint-routes.js";
import { waAutomatedReplyRoutes } from "../automation/rules/rules.route.js";
import { instagramProfileRoutes } from "./instagram/instagram_profile.route.js";
import { instagramCommentsRoutes } from "./instagram/instagram_comments.route.js";
import { instagramInsightsRoutes } from "./instagram/instagram_insights.route.js";
import { messengerProfileRoutes } from "./messenger/messenger_profile.route.js";
import { waInboxRoutes } from "../inbox/inbox.routes.js";
import { waAuthRoutes } from "./whatsapp/auth/auth.route.js";
import { handleWhatsappError } from "./whatsapp/wa_error_handler.js";
import { waCatalogRoutes } from "../commerce/catalogs/catalog.route.js";
import { waCallingRoutes } from "../inbox/calls/calling.route.js";

/**
 * Wraps a WhatsApp/Meta route group so its errors go through `handleWhatsappError`, as they
 * did when every group was mounted under `/api/wa`. Each group is now mounted at its own
 * prefix in registerRoutes.ts (the old URLs are rewritten, see routes/legacyPaths.ts).
 */
function withWhatsappErrors(plugin: FastifyPluginAsync): FastifyPluginAsync {
  return async (server) => {
    server.setErrorHandler(handleWhatsappError);
    await server.register(plugin);
  };
}

/** `/api/whatsapp`: templates, flows, numbers (settings), sign-up, ice breakers. */
export const whatsappRoutes = withWhatsappErrors(async (server: FastifyInstance) => {
  server.register(waTemplatesRoutes, { prefix: "/templates" });
  server.register(flowRoutes, { prefix: "/flows" });
  server.register(waSettingsRoutes, { prefix: "/settings" });
  server.register(waIceBreakerRoutes, { prefix: "/ice-breakers" });
  server.register(waAuthRoutes, { prefix: "/auth" });
});

/**
 * `/api/wa`: only what Meta and customers' phones call. These URLs are registered with
 * Meta (the webhook, each flow's endpoint URI) or sent out in messages (redirect links),
 * so they keep their old paths.
 */
export const waExternalRoutes = withWhatsappErrors(async (server: FastifyInstance) => {
  server.register(waWebhookRoutes, { prefix: "/webhook" });
  server.register(flowEnpointRoutes, { prefix: "/endpoint" });
  server.register(waRedirectRoutes, { prefix: "/redirect" });
});

/** `/api/inbox` (messages, quick replies…) and `/api/inbox/calls`. */
export const inboxRoutes = withWhatsappErrors(waInboxRoutes);
export const inboxCallRoutes = withWhatsappErrors(waCallingRoutes);

/** `/api/automation/rules`. */
export const automationRuleRoutes = withWhatsappErrors(waAutomatedReplyRoutes);

/** `/api/commerce/catalogs`: the WhatsApp (Meta) catalogs. */
export const catalogRoutes = withWhatsappErrors(waCatalogRoutes);

/** `/api/instagram`: profile (ice breakers, menu), comments, insights. */
export const instagramRoutes = withWhatsappErrors(async (server: FastifyInstance) => {
  server.register(instagramProfileRoutes, { prefix: "/profile" });
  server.register(instagramInsightsRoutes, { prefix: "/insights" });
  server.register(instagramCommentsRoutes);
});

/** `/api/messenger/profile`. */
export const messengerRoutes = withWhatsappErrors(messengerProfileRoutes);
