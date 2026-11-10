import { FastifyInstance } from "fastify";
import { authorize } from "./authz/authorize.js";
import { registerAuthzRouteRegistry } from "./authz/registry.js";

// Import all routes
import { orgRoutes } from "./modules/settings/org/org.route.js";
import { questionRoutes } from "./modules/surveys/questions/question.route.js";
import { responsePublicRoutes } from "./modules/surveys/responses/response.public.route.js";
import { responseRoutes } from "./modules/surveys/responses/response.route.js";
import { surveyPublicRoutes } from "./modules/surveys/survey.public.routes.js";
import { surveyRoutes } from "./modules/surveys/survey.route.js";
import { teamRoutes } from "./modules/settings/teams/team.route.js";
import { userRoutes } from "./modules/settings/user/user.route.js";
import { fileUploadPublicRoutes } from "./modules/platform/fileUpload/fileUpload.public.route.js";
import {
  automationRuleRoutes,
  catalogRoutes,
  inboxCallRoutes,
  inboxRoutes,
  instagramRoutes,
  messengerRoutes,
  waExternalRoutes,
  whatsappRoutes,
} from "./modules/meta/meta.routes.js";
import { contactRoutes, inboxConversationRoutes } from "./modules/contacts/contact.route.js";
import { campaignRoutes } from "./modules/campaigns/campaign.route.js";
import { reviewSuggestionRoutes } from "./modules/surveys/reviewSuggestions/reviewSuggestion.route.js";
import { userPublicRoutes } from "./modules/settings/user/user.public.routes.js";
import shareSettingsRoutes from "./modules/surveys/shareSettings/shareSettings.route.js";
import { subscriptionRoutes } from "./modules/settings/subscription/subscription.route.js";
import { unsplashRoutes } from "./modules/platform/unsplash/unsplash.route.js";
import { surveyThemeRoutes } from "./modules/surveys/themes/surveyTheme.routes.js";
import { paymentRoutes } from "./modules/settings/billing/payment.route.js";
import { paymentPublicRoutes } from "./modules/settings/billing/payment.public.route.js";
import { testimonialRoutes } from "./modules/surveys/testimonials/testimonials.route.js";
import { testimonialCollectionRoutes } from "./modules/surveys/testimonials/collections/testimonialCollection.route.js";
import { pipelineRoutes } from "./modules/pipelines/pipeline.route.js";
import { testimonialPublicRoutes } from "./modules/surveys/testimonials/testimonialPublic.route.js";
import { loyaltyRoutes } from "./modules/loyalty/loyalty.routes.js";
import linktreeRoutes from "./modules/links/linkPages/linkPage.routes.js";
import { statsRoutes } from "./modules/analytics/stats/stats.route.js";
import { paymentStripeRoutes } from "./modules/settings/billing/stripe/stripe.route.js";
import { apiAccessTokenRoutes } from "./modules/settings/apiKeys/apiKey.route.js";
import { externalV1Routes } from "./external/v1/index.js";
import { externalV2Routes } from "./external/v2/index.js";
import { externalMcpRoutes, MCP_PATH } from "./external/mcp/mcp.route.js";
import { orgWsRoutes } from "./modules/settings/org/ws/org.ws.routes.js";
import { stripePublicRoutes } from "./modules/settings/billing/stripe/stripe.public.route.js";
import { emailPublicRoutes } from "./modules/platform/email/email.public.route.js";
import { servicePublicRoutes } from "./modules/platform/services/services.public.route.js";
import generateQrRoutes from "./modules/links/qrCodes/qrCode.routes.js";
import { integrationsRoutes } from "./modules/integrations/integrations.route.js";
import { integrationPublicRoutes } from "./modules/integrations/integration.public.route.js";
import { mobileNotificationRoutes } from "./modules/settings/mobileNotifications/mobile.route.js";
import { dashboardRoutes } from "./modules/analytics/dashboard/dashboard.route.js";
import { commerceRoutes } from "./modules/commerce/commerce.route.js";
import { shopRoutes } from "./modules/commerce/shop/shop.route.js";
import { shopPublicRoutes } from "./modules/commerce/shop/shop.public.route.js";
import { notificationRoutes } from "./modules/settings/notifications/notification.route.js";
import { instagramWebhookRoutes } from "./modules/meta/instagram/instagram.webhook.route.js";
import { facebookWebhookRoutes } from "./modules/meta/messenger/facebook.webhook.route.js";
import { lifecycleRoutes } from "./modules/contacts/lifecycle/lifecycle.route.js";
import { bookDemoRoutes } from "./modules/platform/bookDemo/bookDemo.route.js";
import { supportUserWebhookRoutes } from "./modules/inbox/webchat/webchat.route.js";
import { externalIntegrationRoutes } from "./modules/integrations/external/external.route.js";
import healthRoutes from "./routes/health.js";
import { customerAccountPublicRoutes } from "./modules/loyalty/accounts/account.public.route.js";
import { loyaltyProgramPublicRoutes } from "./modules/loyalty/program/program.public.route.js";
import { loyaltyFeedbackPublicRoutes } from "./modules/loyalty/feedback/feedback.public.route.js";
import { customerCommsPublicRoutes } from "./modules/platform/customerComms/customerComms.public.route.js";
import { customerCommsRoutes } from "./modules/platform/customerComms/customerComms.route.js";
import { shopifyLinkPublicRoutes } from "./modules/integrations/shopify/shopify.link.route.js";
import { loyaltyCardPublicRoutes } from "./modules/loyalty/accounts/card.public.route.js";
import { apiAnalyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { webhookRoutes } from "./modules/settings/webhooks/webhook.route.js";
import { referralRoutes } from "./modules/platform/referrals/referrals.route.js";
import { metaAgentRoutes } from "./modules/meta/agent/metaAgent.route.js";
import { metaChannelRoutes } from "./modules/meta/channels/metaChannel.route.js";
import { channelRoutes } from "./modules/settings/channels/channel.route.js";
import { chatbotRoutes } from "./modules/automation/journeys/journeys.route.js";
import { rateupToolsRoutes } from "./modules/meta/agent/rateupTools/rateupTools.route.js";
import { maintenanceRoutes } from "./modules/platform/maintenance/maintenance.route.js";
import { adminRoutes } from "./modules/platform/admin/admin.route.js";
import { staffPlugin } from "./modules/platform/staff/staff.plugin.js";

// Route configurations. URLs renamed on 2026-11-10 still answer at their old path through
// routes/legacyPaths.ts; add a row there when renaming a prefix here.
const routeConfigs = [
  // health check
  { plugin: healthRoutes, prefix: "/api/health" },
  // Public routes
  { plugin: servicePublicRoutes, prefix: "/api/public/services" },
  { plugin: surveyPublicRoutes, prefix: "/api/public/survey" },
  { plugin: responsePublicRoutes, prefix: "/api/public/response" },
  { plugin: fileUploadPublicRoutes, prefix: "/api/public/upload" },
  { plugin: paymentPublicRoutes, prefix: "/api/public/payment" },
  { plugin: stripePublicRoutes, prefix: "/api/public/payment/stripe" },
  { plugin: testimonialPublicRoutes, prefix: "/api/public/testimonials" },
  { plugin: integrationPublicRoutes, prefix: "/api/public/integrations" },
  { plugin: userPublicRoutes, prefix: "/api/public/user" },
  {
    plugin: customerAccountPublicRoutes,
    prefix: "/api/public/loyalty/accounts",
  },
  { plugin: loyaltyProgramPublicRoutes, prefix: "/api/public/loyalty/programs" },
  { plugin: loyaltyFeedbackPublicRoutes, prefix: "/api/public/loyalty/feedback" },
  { plugin: customerCommsPublicRoutes, prefix: "/api/public/customer-comms" },
  { plugin: shopifyLinkPublicRoutes, prefix: "/api/public/r" },
  { plugin: loyaltyCardPublicRoutes, prefix: "/api/public/loyalty/cards" },
  { plugin: shopPublicRoutes, prefix: "/api/public/shop" },

  // // Protected routes
  { plugin: surveyRoutes, prefix: "/api/surveys" },
  { plugin: shareSettingsRoutes, prefix: "/api/share-settings" },
  { plugin: questionRoutes, prefix: "/api/surveys/:surveyId/questions" },
  { plugin: userRoutes, prefix: "/api/user" },
  { plugin: orgRoutes, prefix: "/api/org" },
  { plugin: teamRoutes, prefix: "/api/teams" },
  { plugin: responseRoutes, prefix: "/api/surveys/responses" },
  // Inbox
  { plugin: inboxRoutes, prefix: "/api/inbox" },
  { plugin: inboxCallRoutes, prefix: "/api/inbox/calls" },
  { plugin: inboxConversationRoutes, prefix: "/api/inbox" },
  // Meta channels. `/api/wa` keeps only the URLs Meta and customers call.
  { plugin: whatsappRoutes, prefix: "/api/whatsapp" },
  { plugin: waExternalRoutes, prefix: "/api/wa" },
  { plugin: instagramRoutes, prefix: "/api/instagram" },
  { plugin: messengerRoutes, prefix: "/api/messenger/profile" },
  { plugin: unsplashRoutes, prefix: "/api/unsplash" },
  { plugin: contactRoutes, prefix: "/api/contacts" },
  { plugin: campaignRoutes, prefix: "/api/campaigns" },
  { plugin: reviewSuggestionRoutes, prefix: "/api/review-suggestions" },
  { plugin: subscriptionRoutes, prefix: "/api/subscription" },
  { plugin: adminRoutes, prefix: "/api/admin" },
  // The staff console: its own Google login and guards, never SuperTokens (staff.plugin.ts).
  { plugin: staffPlugin, prefix: "/api/staff" },
  { plugin: maintenanceRoutes, prefix: "/api/maintenance" },
  { plugin: paymentRoutes, prefix: "/api/payment" },
  { plugin: paymentStripeRoutes, prefix: "/api/payment/stripe" },
  { plugin: surveyThemeRoutes, prefix: "/api/surveys/themes" },
  { plugin: testimonialRoutes, prefix: "/api/surveys/testimonials" },
  {
    plugin: testimonialCollectionRoutes,
    prefix: "/api/surveys/testimonials/collections",
  },
  { plugin: pipelineRoutes, prefix: "/api/pipelines" },
  { plugin: loyaltyRoutes, prefix: "/api/loyalty" },
  { plugin: linktreeRoutes, prefix: "/api/link-pages" },
  { plugin: statsRoutes, prefix: "/api/stats" },
  { plugin: orgWsRoutes, prefix: "/api/org/ws" },
  { plugin: apiAccessTokenRoutes, prefix: "/api/api-keys" },
  { plugin: externalV1Routes, prefix: "/api/external/v1/:orgId" },
  { plugin: externalV2Routes, prefix: "/api/external/v2" },
  // The v2 API as an MCP server; a sibling of v2, so it runs none of v2's per-route hooks itself.
  { plugin: externalMcpRoutes, prefix: MCP_PATH },
  { plugin: emailPublicRoutes, prefix: "/api/email" },
  { plugin: generateQrRoutes, prefix: "/api/qr-codes" },
  { plugin: integrationsRoutes, prefix: "/api/integrations" },
  { plugin: mobileNotificationRoutes, prefix: "/api/mobile-notifications" },
  { plugin: dashboardRoutes, prefix: "/api/dashboard" },
  { plugin: commerceRoutes, prefix: "/api/commerce" },
  { plugin: catalogRoutes, prefix: "/api/commerce/catalogs" },
  { plugin: shopRoutes, prefix: "/api/shop" },
  { plugin: notificationRoutes, prefix: "/api/notifications" },
  { plugin: customerCommsRoutes, prefix: "/api/customer-comms" },
  { plugin: instagramWebhookRoutes, prefix: "/api/instagram/webhook" },
  { plugin: facebookWebhookRoutes, prefix: "/api/facebook/webhook" },
  { plugin: supportUserWebhookRoutes, prefix: "/api/support" },
  { plugin: lifecycleRoutes, prefix: "/api/lifecycles" },
  { plugin: bookDemoRoutes, prefix: "/api/book-demo" },
  { plugin: externalIntegrationRoutes, prefix: "/api/integration/external" },
  { plugin: apiAnalyticsRoutes, prefix: "/api/analytics" },
  { plugin: webhookRoutes, prefix: "/api/webhooks" },
  { plugin: referralRoutes, prefix: "/api/referrals" },
  { plugin: metaAgentRoutes, prefix: "/api/meta-agent" },
  { plugin: metaChannelRoutes, prefix: "/api/meta/channels" },
  { plugin: channelRoutes, prefix: "/api/channels" },
  // Automation: rules, and journeys (chatbots) on every channel.
  { plugin: automationRuleRoutes, prefix: "/api/automation/rules" },
  { plugin: chatbotRoutes, prefix: "/api/automation/journeys" },
  // Called by Meta, with the key the built-in RateUp connector was installed with.
  { plugin: rateupToolsRoutes, prefix: "/api/public/meta-agent-tools" },
];

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Both must be on the root instance before any route registers: the registry sees every
  // route's config as it is added, and a root preHandler runs ahead of the plugin-level
  // checkSession hooks the modules still carry.
  registerAuthzRouteRegistry(server);
  server.addHook("preHandler", authorize);

  for (const { plugin, prefix } of routeConfigs) {
    await server.register(plugin, { prefix });
  }
}
