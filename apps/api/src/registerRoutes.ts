import { FastifyInstance } from "fastify";
import { authorize } from "@rateup/server/authz/authorize.js";
import { registerAuthzRouteRegistry } from "@rateup/server/authz/registry.js";

// Import all routes
import { orgRoutes } from "@rateup/server/modules/org/org.route.js";
import { questionRoutes } from "@rateup/server/modules/question/question.route.js";
import { responsePublicRoutes } from "@rateup/server/modules/response/response.public.route.js";
import { responseRoutes } from "@rateup/server/modules/response/response.route.js";
import { surveyPublicRoutes } from "@rateup/server/modules/survey/survey.public.routes.js";
import { surveyRoutes } from "@rateup/server/modules/survey/survey.route.js";
import { teamRoutes } from "@rateup/server/modules/team/team.route.js";
import { userRoutes } from "@rateup/server/modules/user/user.route.js";
import { fileUploadPublicRoutes } from "@rateup/server/modules/fileUpload/fileUpload.public.route.js";
import { whatsappRoutes } from "@rateup/server/modules/whatsapp/wa_routes.js";
import { contactRoutes } from "@rateup/server/modules/contact/contact.route.js";
import { campaignRoutes } from "@rateup/server/modules/campaign/campaign.route.js";
import { reviewSuggestionRoutes } from "@rateup/server/modules/reviewSuggestion/reviewSuggestion.route.js";
import { userPublicRoutes } from "@rateup/server/modules/user/user.public.routes.js";
import shareSettingsRoutes from "@rateup/server/modules/shareSettings/shareSettings.route.js";
import { subscriptionRoutes } from "@rateup/server/modules/subscription/subscription.route.js";
import { unsplashRoutes } from "@rateup/server/modules/unsplash/unsplash.route.js";
import { surveyThemeRoutes } from "@rateup/server/modules/surveyTheme/surveyTheme.routes.js";
import { paymentRoutes } from "@rateup/server/modules/payment/payment.route.js";
import { paymentPublicRoutes } from "@rateup/server/modules/payment/payment.public.route.js";
import { testimonialRoutes } from "@rateup/server/modules/testimonial/testimonials.route.js";
import { testimonialCollectionRoutes } from "@rateup/server/modules/testimonial/testimonialCollection/testimonialCollection.route.js";
import { pipelineRoutes } from "@rateup/server/modules/pipeline/pipeline.route.js";
import { testimonialPublicRoutes } from "@rateup/server/modules/testimonial/testimonialPublic.route.js";
import { loyaltyRoutes } from "@rateup/server/modules/loyalty/loyalty.routes.js";
import linktreeRoutes from "@rateup/server/modules/linktree/linktree.routes.js";
import { statsRoutes } from "@rateup/server/modules/stats/stats.route.js";
import { paymentStripeRoutes } from "@rateup/server/modules/payment/stripe/stripe.route.js";
import { apiAccessTokenRoutes } from "@rateup/server/modules/apiAccessToken/apiAccessToken.route.js";
import { externalV1Routes } from "@rateup/server/external/v1/index.js";
import { externalV2Routes } from "@rateup/server/external/v2/index.js";
import { orgWsRoutes } from "@rateup/server/modules/org/ws/org.ws.routes.js";
import { stripePublicRoutes } from "@rateup/server/modules/payment/stripe/stripe.public.route.js";
import { emailPublicRoutes } from "@rateup/server/modules/email/email.public.route.js";
import { servicePublicRoutes } from "@rateup/server/modules/services/services.public.route.js";
import generateQrRoutes from "@rateup/server/modules/generateQr/generateQr.routes.js";
import { integrationsRoutes } from "@rateup/server/modules/integrations/integrations.route.js";
import { integrationPublicRoutes } from "@rateup/server/modules/integrations/integration.public.route.js";
import { mobileNotificationRoutes } from "@rateup/server/modules/mobileNotification/mobile.route.js";
import { dashboardRoutes } from "@rateup/server/modules/dashboard/dashboard.route.js";
import { commerceRoutes } from "@rateup/server/modules/commerce/commerce.route.js";
import { shopRoutes } from "@rateup/server/modules/commerce/shop/shop.route.js";
import { shopPublicRoutes } from "@rateup/server/modules/commerce/shop/shop.public.route.js";
import { notificationRoutes } from "@rateup/server/modules/notification/notification.route.js";
import { instagramWebhookRoutes } from "@rateup/server/modules/whatsapp/instagram/instagram.webhook.route.js";
import { facebookWebhookRoutes } from "@rateup/server/modules/whatsapp/facebook/facebook.webhook.route.js";
import { lifecycleRoutes } from "@rateup/server/modules/lifecycle/lifecycle.route.js";
import { bookDemoRoutes } from "@rateup/server/modules/BookDemo/bookDemo.route.js";
import { supportUserWebhookRoutes } from "@rateup/server/modules/whatsapp/support-user/suport-user.webhook.route.js";
import { externalIntegrationRoutes } from "@rateup/server/modules/integrations/external/external.route.js";
import healthRoutes from "./routes/health.js";
import { customerAccountPublicRoutes } from "@rateup/server/modules/loyalty/accounts/account.public.route.js";
import { loyaltyProgramPublicRoutes } from "@rateup/server/modules/loyalty/program/program.public.route.js";
import { loyaltyFeedbackPublicRoutes } from "@rateup/server/modules/loyalty/feedback/feedback.public.route.js";
import { customerCommsPublicRoutes } from "@rateup/server/modules/customerComms/customerComms.public.route.js";
import { customerCommsRoutes } from "@rateup/server/modules/customerComms/customerComms.route.js";
import { shopifyLinkPublicRoutes } from "@rateup/server/modules/integrations/shopify/shopify.link.route.js";
import { loyaltyCardPublicRoutes } from "@rateup/server/modules/loyalty/accounts/card.public.route.js";
import { apiAnalyticsRoutes } from "@rateup/server/modules/apiAnalytics/apianalytics.routes.js";
import { webhookRoutes } from "@rateup/server/modules/webhook/webhook.route.js";
import { referralRoutes } from "@rateup/server/modules/referrals/referrals.route.js";
import { metaAgentRoutes } from "@rateup/server/modules/metaAgent/metaAgent.route.js";
import { metaChannelRoutes } from "@rateup/server/modules/whatsapp/metaChannel/metaChannel.route.js";
import { channelRoutes } from "@rateup/server/modules/channel/channel.route.js";
import { chatbotRoutes } from "@rateup/server/modules/chatbots/chatbots.route.js";
import { metaAgentWebhookRoutes } from "@rateup/server/modules/metaAgent/metaAgent.webhook.route.js";
import { rateupToolsRoutes } from "@rateup/server/modules/metaAgent/rateupTools/rateupTools.route.js";
import { maintenanceRoutes } from "@rateup/server/modules/maintenance/maintenance.route.js";
import { adminRoutes } from "@rateup/server/modules/admin/admin.route.js";
import { staffPlugin } from "@rateup/server/modules/staff/staff.plugin.js";

// Route configurations
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
  { plugin: surveyRoutes, prefix: "/api/survey" },
  { plugin: shareSettingsRoutes, prefix: "/api/shareSettings" },
  { plugin: questionRoutes, prefix: "/api/question/:surveyId" },
  { plugin: userRoutes, prefix: "/api/user" },
  { plugin: orgRoutes, prefix: "/api/org" },
  { plugin: teamRoutes, prefix: "/api/team" },
  { plugin: responseRoutes, prefix: "/api/response" },
  { plugin: whatsappRoutes, prefix: "/api/wa" },
  { plugin: unsplashRoutes, prefix: "/api/unsplash" },
  { plugin: contactRoutes, prefix: "/api/contact" },
  { plugin: campaignRoutes, prefix: "/api/campaign" },
  { plugin: reviewSuggestionRoutes, prefix: "/api/reviewSuggestion" },
  { plugin: subscriptionRoutes, prefix: "/api/subscription" },
  { plugin: adminRoutes, prefix: "/api/admin" },
  // The staff console: its own Google login and guards, never SuperTokens (staff.plugin.ts).
  { plugin: staffPlugin, prefix: "/api/staff" },
  { plugin: maintenanceRoutes, prefix: "/api/maintenance" },
  { plugin: paymentRoutes, prefix: "/api/payment" },
  { plugin: paymentStripeRoutes, prefix: "/api/payment/stripe" },
  { plugin: surveyThemeRoutes, prefix: "/api/surveyTheme" },
  { plugin: testimonialRoutes, prefix: "/api/testimonials" },
  {
    plugin: testimonialCollectionRoutes,
    prefix: "/api/testimonial/collections",
  },
  { plugin: pipelineRoutes, prefix: "/api/pipelines" },
  { plugin: loyaltyRoutes, prefix: "/api/loyalty" },
  { plugin: linktreeRoutes, prefix: "/api/linktrees" },
  { plugin: statsRoutes, prefix: "/api/stats" },
  { plugin: orgWsRoutes, prefix: "/api/org/ws" },
  { plugin: apiAccessTokenRoutes, prefix: "/api/api-access-token" },
  { plugin: externalV1Routes, prefix: "/api/external/v1/:orgId" },
  { plugin: externalV2Routes, prefix: "/api/external/v2" },
  { plugin: emailPublicRoutes, prefix: "/api/email" },
  { plugin: generateQrRoutes, prefix: "/api/generateQr" },
  { plugin: integrationsRoutes, prefix: "/api/integrations" },
  { plugin: mobileNotificationRoutes, prefix: "/api/mobilenotification" },
  { plugin: dashboardRoutes, prefix: "/api/dashboard" },
  { plugin: commerceRoutes, prefix: "/api/commerce" },
  { plugin: shopRoutes, prefix: "/api/shop" },
  { plugin: notificationRoutes, prefix: "/api/notification" },
  { plugin: customerCommsRoutes, prefix: "/api/customer-comms" },
  { plugin: instagramWebhookRoutes, prefix: "/api/instagram/webhook" },
  { plugin: facebookWebhookRoutes, prefix: "/api/facebook/webhook" },
  { plugin: supportUserWebhookRoutes, prefix: "/api/support" },
  { plugin: lifecycleRoutes, prefix: "/api/lifecycles" },
  { plugin: bookDemoRoutes, prefix: "/api/bookdemo" },
  { plugin: externalIntegrationRoutes, prefix: "/api/integration/external" },
  { plugin: apiAnalyticsRoutes, prefix: "/api/apianalytics" },
  { plugin: webhookRoutes, prefix: "/api/webhook" },
  { plugin: referralRoutes, prefix: "/api/referrals" },
  { plugin: metaAgentRoutes, prefix: "/api/meta-agent" },
  { plugin: metaChannelRoutes, prefix: "/api/meta/channels" },
  { plugin: channelRoutes, prefix: "/api/channels" },
  // Chatbots on every channel.
  { plugin: chatbotRoutes, prefix: "/api/chatbots" },
  { plugin: metaAgentWebhookRoutes, prefix: "/api/meta-agent/webhook" },
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
