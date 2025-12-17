import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

// Import all schemas
import { orgSchemas } from "./modules/org/org.schema.js";
import { questionSchemas } from "./modules/question/question.schema.js";
import { responseSchemas } from "./modules/response/response.schema.js";
import { surveySchemas } from "./modules/survey/survey.schema.js";
import { teamSchemas } from "./modules/team/team.schema.js";
import { uploadSchemas } from "./modules/fileUpload/fileUpload.schema.js";
import { userSchemas } from "./modules/user/user.schema.js";
import { menuSchemas } from "./modules/menu/menu.schema.js";
import { menuCategorySchemas } from "./modules/menu/category/category.schema.js";
import { menuItemSchemas } from "./modules/menu/item/item.schema.js";
import { contactFormSchemas } from "./modules/contactForm/contact.schema.js";
import { contactSchemas } from "./modules/contact/contact.schema.js";
import { campaignSchemas } from "./modules/campaign/campaign.schema.js";
import { reviewSuggestionSchemas } from "./modules/reviewSuggestion/reviewSuggestion.schema.js";
import { menuBannerSchemas } from "./modules/menu/banner/banner.schema.js";
import { unsplashSchemas } from "./modules/unsplash/unsplash.schema.js";
import { surveyThemeSchemas } from "./modules/surveyTheme/surveyTheme.schema.js";
import { paymentSchemas } from "./modules/payment/payment.schema.js";
import { paymentStripeSchemas } from "./modules/payment/stripe/stripe.schema.js";
import { testimonialSchemas } from "./modules/testimonial/testimonial.schema.js";
import { testimonialCollectionSchemas } from "./modules/testimonial/testimonialCollection/testimonialCollection.schema.js";
import { ticketSchemas } from "./modules/ticket/ticket.schema.js";
import { subscriptionSchemas } from "./modules/subscription/subscription.schema.js";
import { landingPageSchemas } from "./modules/landingPage/landingPage.schema.js";
import { linktreeSchemas } from "./modules/linktree/linktree.schema.js";
import { statsSchemas } from "./modules/stats/stats.schema.js";
import { chatbotSchemas } from "./modules/chatbot/chatbot.schema.js";
import { orgWsSchemas } from "./modules/org/ws/org.ws.schema.js";
import { campaignParticipantsSchemas } from "./modules/campaign/campaignParticipants/campaignParticipants.schema.js";
import { emailSchema } from "./modules/email/email.schema.js";
import { generateQrSchemas } from "./modules/generateQr/generateQr.schema.js";
import { integrationSchemas } from "./modules/integrations/integrations.schema.js";
import { loyaltyActionSchemas } from "./modules/loyalty/actions/actions.schema.js";
import { loyaltyRewardSchemas } from "./modules/loyalty/rewards/rewards.schema.js";
import { loyaltyCustomerSchemas } from "./modules/loyalty/customer/customer.schema.js";
import { loyaltyRedeemSchemas } from "./modules/loyalty/redeems/redeem.schema.js";
import { loyaltySettingSchemas } from "./modules/loyalty/settings/settings.schema.js";
import { customerGroupSchemas } from "./modules/loyalty/customer/customerGroup/customerGroup.schema.js";
import { boardSchemas } from "./modules/ticket/ticketBoard/board.schema.js";
import { columnSchemas } from "./modules/ticket/ticketColumn/column.schema.js";
import { cardSchemas } from "./modules/ticket/ticketCard/card.schema.js";
import { loyaltyApiSettingSchemas } from "./modules/loyalty/apiSetting/apiSetting.schema.js";
import { expoSchemas } from "./modules/mobileNotification/mobile.schema.js";
import { notificationSchema } from "./modules/notification/notification.schema.js";
import { lifecycleSchema } from "./modules/lifecycle/lifecycle.schema.js";
import { bookDemoSchemas } from "./modules/BookDemo/bookDemo.schema.js";
import { zapierSchemas } from "./modules/integrations/external/zapier/zapier.schema.js";
import { businessHourSchemas } from "./modules/org/businessHour.schema.js";

// Import all routes
import { orgRoutes } from "./modules/org/org.route.js";
import { questionRoutes } from "./modules/question/question.route.js";
import { responsePublicRoutes } from "./modules/response/response.public.route.js";
import { responseRoutes } from "./modules/response/response.route.js";
import { surveyPublicRoutes } from "./modules/survey/survey.public.routes.js";
import { surveyRoutes } from "./modules/survey/survey.route.js";
import { teamRoutes } from "./modules/team/team.route.js";
import { userRoutes } from "./modules/user/user.route.js";
import { fileUploadPublicRoutes } from "./modules/fileUpload/fileUpload.public.route.js";
import { menuRoutes } from "./modules/menu/menu.route.js";
import { menuCategoryRoutes } from "./modules/menu/category/category.route.js";
import { menuItemRoutes } from "./modules/menu/item/item.route.js";
import { menuPublicRoutes } from "./modules/menu/menu.public.route.js";
import { contactFormPublicRoutes } from "./modules/contactForm/contact.public.route.js";
import { whatsappRoutes } from "./modules/whatsapp/wa_routes.js";
import { contactRoutes } from "./modules/contact/contact.route.js";
import { campaignRoutes } from "./modules/campaign/campaign.route.js";
import { reviewSuggestionRoutes } from "./modules/reviewSuggestion/reviewSuggestion.route.js";
import { userPublicRoutes } from "./modules/user/user.public.routes.js";
import shareSettingsRoutes from "./modules/shareSettings/shareSettings.route.js";
import { menuBannerRoutes } from "./modules/menu/banner/banner.route.js";
import { menuBannerPublicRoutes } from "./modules/menu/banner/banner.public.route.js";
import { subscriptionRoutes } from "./modules/subscription/subscription.route.js";
import { unsplashRoutes } from "./modules/unsplash/unsplash.route.js";
import { surveyThemeRoutes } from "./modules/surveyTheme/surveyTheme.routes.js";
import { paymentRoutes } from "./modules/payment/payment.route.js";
import { paymentPublicRoutes } from "./modules/payment/payment.public.route.js";
import { testimonialRoutes } from "./modules/testimonial/testimonials.route.js";
import { testimonialCollectionRoutes } from "./modules/testimonial/testimonialCollection/testimonialCollection.route.js";
import { ticketRoutes } from "./modules/ticket/ticket.route.js";
import { testimonialPublicRoutes } from "./modules/testimonial/testimonialPublic.route.js";
import { loyaltyRoutes } from "./modules/loyalty/loyalty.routes.js";
import landingPageRoutes from "./modules/landingPage/landingPage.routes.js";
import linktreeRoutes from "./modules/linktree/linktree.routes.js";
import { statsRoutes } from "./modules/stats/stats.route.js";
import { chatbotRoutes } from "./modules/chatbot/chatbot.rout.js";
import { chatbotPublicRoute } from "./modules/chatbot/chatbot.public.route.js";
import { paymentStripeRoutes } from "./modules/payment/stripe/stripe.route.js";
import { apiAccessTokenRoutes } from "./modules/apiAccessToken/apiAccessToken.route.js";
import { externalRoutes } from "./modules/external/external.route.js";
import { orgWsRoutes } from "./modules/org/ws/org.ws.routes.js";
import { stripePublicRoutes } from "./modules/payment/stripe/stripe.public.route.js";
import { emailPublicRoutes } from "./modules/email/email.public.route.js";
import { updatePublicRoutes } from "./modules/update/update.public.route.js";
import { servicePublicRoutes } from "./modules/services/services.public.route.js";
import generateQrRoutes from "./modules/generateQr/generateQr.routes.js";
import { integrationsRoutes } from "./modules/integrations/integrations.route.js";
import { integrationPublicRoutes } from "./modules/integrations/integration.public.route.js";
import { loyaltyPublicRoutes } from "./modules/loyalty/loyalty.public.route.js";
import { mobileNotificationRoutes } from "./modules/mobileNotification/mobile.route.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.route.js";
import { notificationRoutes } from "./modules/notification/notification.route.js";
import { instagramWebhookRoutes } from "./modules/whatsapp/instagram/instagram.webhook.route.js";
import { lifecycleRoutes } from "./modules/lifecycle/lifecycle.route.js";
import { bookDemoRoutes } from "./modules/BookDemo/bookDemo.route.js";
import { supportUserWebhookRoutes } from "./modules/whatsapp/support-user/suport-user.webhook.route.js";
import { externalIntegrationRoutes } from "./modules/integrations/external/external.route.js";
import healthRoutes from "./routes/health.js";

// Schema collections
const schemaModules = [
  surveySchemas,
  questionSchemas,
  orgSchemas,
  teamSchemas,
  responseSchemas,
  uploadSchemas,
  userSchemas,
  menuSchemas,
  menuCategorySchemas,
  menuItemSchemas,
  contactFormSchemas,
  contactSchemas,
  campaignSchemas,
  reviewSuggestionSchemas,
  menuBannerSchemas,
  unsplashSchemas,
  surveyThemeSchemas,
  paymentSchemas,
  paymentStripeSchemas,
  testimonialSchemas,
  testimonialCollectionSchemas,
  ticketSchemas,
  subscriptionSchemas,
  landingPageSchemas,
  linktreeSchemas,
  statsSchemas,
  chatbotSchemas,
  orgWsSchemas,
  campaignParticipantsSchemas,
  emailSchema,
  generateQrSchemas,
  integrationSchemas,
  loyaltyActionSchemas,
  loyaltyRewardSchemas,
  loyaltyCustomerSchemas,
  loyaltyRedeemSchemas,
  loyaltySettingSchemas,
  customerGroupSchemas,
  boardSchemas,
  columnSchemas,
  cardSchemas,
  loyaltyApiSettingSchemas,
  expoSchemas,
  notificationSchema,
  lifecycleSchema,
  bookDemoSchemas,
  zapierSchemas,
  businessHourSchemas,
];

// Route configurations
const routeConfigs = [
  // health check
  { plugin: healthRoutes, prefix: "/api/health" },
  // Public routes
  { plugin: updatePublicRoutes, prefix: "/api/public/update" },
  { plugin: servicePublicRoutes, prefix: "/api/public/services" },
  { plugin: surveyPublicRoutes, prefix: "/api/public/survey" },
  { plugin: responsePublicRoutes, prefix: "/api/public/response" },
  { plugin: fileUploadPublicRoutes, prefix: "/api/public/upload" },
  { plugin: menuPublicRoutes, prefix: "/api/public/menu" },
  { plugin: menuBannerPublicRoutes, prefix: "/api/public/mbanner" },
  { plugin: contactFormPublicRoutes, prefix: "/api/public/contact" },
  { plugin: paymentPublicRoutes, prefix: "/api/public/payment" },
  { plugin: stripePublicRoutes, prefix: "/api/public/payment/stripe" },
  { plugin: testimonialPublicRoutes, prefix: "/api/public/testimonials" },
  { plugin: chatbotPublicRoute, prefix: "/api/public/chatbot" },
  { plugin: integrationPublicRoutes, prefix: "/api/public/integrations" },
  { plugin: loyaltyPublicRoutes, prefix: "/api/public/loyalty" },
  { plugin: userPublicRoutes, prefix: "/api/public/user" },

  // Protected routes
  { plugin: surveyRoutes, prefix: "/api/survey" },
  { plugin: shareSettingsRoutes, prefix: "/api/shareSettings" },
  { plugin: questionRoutes, prefix: "/api/question/:surveyId" },
  { plugin: userRoutes, prefix: "/api/user" },
  { plugin: orgRoutes, prefix: "/api/org" },
  { plugin: teamRoutes, prefix: "/api/team" },
  { plugin: responseRoutes, prefix: "/api/response" },
  { plugin: whatsappRoutes, prefix: "/api/wa" },
  { plugin: menuRoutes, prefix: "/api/menu" },
  { plugin: menuCategoryRoutes, prefix: "/api/mcategory" },
  { plugin: menuItemRoutes, prefix: "/api/mitem" },
  { plugin: menuBannerRoutes, prefix: "/api/mbanner" },
  { plugin: unsplashRoutes, prefix: "/api/unsplash" },
  { plugin: contactRoutes, prefix: "/api/contact" },
  { plugin: campaignRoutes, prefix: "/api/campaign" },
  { plugin: reviewSuggestionRoutes, prefix: "/api/reviewSuggestion" },
  { plugin: subscriptionRoutes, prefix: "/api/subscription" },
  { plugin: paymentRoutes, prefix: "/api/payment" },
  { plugin: paymentStripeRoutes, prefix: "/api/payment/stripe" },
  { plugin: surveyThemeRoutes, prefix: "/api/surveyTheme" },
  { plugin: testimonialRoutes, prefix: "/api/testimonials" },
  {
    plugin: testimonialCollectionRoutes,
    prefix: "/api/testimonial/collections",
  },
  { plugin: ticketRoutes, prefix: "/api/tickets" },
  { plugin: loyaltyRoutes, prefix: "/api/loyalty/" },
  { plugin: landingPageRoutes, prefix: "/api/landingPages" },
  { plugin: linktreeRoutes, prefix: "/api/linktrees" },
  { plugin: statsRoutes, prefix: "/api/stats" },
  { plugin: chatbotRoutes, prefix: "/api/chatbot" },
  { plugin: orgWsRoutes, prefix: "/api/org/ws" },
  { plugin: apiAccessTokenRoutes, prefix: "/api/api-access-token" },
  { plugin: externalRoutes, prefix: "/api/external" },
  { plugin: emailPublicRoutes, prefix: "/api/email" },
  { plugin: generateQrRoutes, prefix: "/api/generateQr" },
  { plugin: integrationsRoutes, prefix: "/api/integrations" },
  { plugin: mobileNotificationRoutes, prefix: "/api/mobilenotification" },
  { plugin: dashboardRoutes, prefix: "/api/dashboard" },
  { plugin: notificationRoutes, prefix: "/api/notification" },
  { plugin: instagramWebhookRoutes, prefix: "/api/instagram/webhook" },
  { plugin: supportUserWebhookRoutes, prefix: "/api/support" },
  { plugin: lifecycleRoutes, prefix: "/api/lifecycles" },
  { plugin: bookDemoRoutes, prefix: "/api/bookdemo" },
  { plugin: externalIntegrationRoutes, prefix: "/api/integration/external" },
];

async function registerSchemas(server: FastifyInstance): Promise<void> {
  for (const schemas of schemaModules) {
    for (const schema of schemas) {
      server.addSchema(schema);
    }
  }
}

async function routes(server: FastifyInstance): Promise<void> {
  // Register all schemas first
  await registerSchemas(server);

  // Register all routes
  for (const { plugin, prefix } of routeConfigs) {
    await server.register(plugin, { prefix });
  }
}

export const registerRoutes = fp(routes, {
  name: "routes",
});

export default registerRoutes;
