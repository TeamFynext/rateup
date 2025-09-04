import { FastifyInstance } from "fastify";
import { orgRoutes } from "./modules/org/org.route";
import { orgSchemas } from "./modules/org/org.schema";
import { questionRoutes } from "./modules/question/question.route";
import { questionSchemas } from "./modules/question/question.schema";
import { responsePublicRoutes } from "./modules/response/response.public.route";
import { responseRoutes } from "./modules/response/response.route";
import { responseSchemas } from "./modules/response/response.schema";
import { surveyPublicRoutes } from "./modules/survey/survey.public.routes";
import { surveyRoutes } from "./modules/survey/survey.route";
import { surveySchemas } from "./modules/survey/survey.schema";
import { teamRoutes } from "./modules/team/team.route";
import { teamSchemas } from "./modules/team/team.schema";
import { userRoutes } from "./modules/user/user.route";
import { fileUploadPublicRoutes } from "./modules/fileUpload/fileUpload.public.route";
import { uploadSchemas } from "./modules/fileUpload/fileUpload.schema";
import { userSchemas } from "./modules/user/user.schema";
import { menuSchemas } from "./modules/menu/menu.schema";
import { menuRoutes } from "./modules/menu/menu.route";
import { menuCategorySchemas } from "./modules/menu/category/category.schema";
import { menuCategoryRoutes } from "./modules/menu/category/category.route";
import { menuItemSchemas } from "./modules/menu/item/item.schema";
import { menuItemRoutes } from "./modules/menu/item/item.route";
import { menuPublicRoutes } from "./modules/menu/menu.public.route";
import { contactFormSchemas } from "./modules/contactForm/contact.schema";
import { contactFormPublicRoutes } from "./modules/contactForm/contact.public.route";
import { whatsappRoutes } from "./modules/whatsapp/wa_routes";
import { contactSchemas } from "./modules/contact/contact.schema";
import { contactRoutes } from "./modules/contact/contact.route";
import { campaignSchemas } from "./modules/campaign/campaign.schema";
import { campaignRoutes } from "./modules/campaign/campaign.route";
import { reviewSuggestionSchemas } from "./modules/reviewSuggestion/reviewSuggestion.schema";
import { reviewSuggestionRoutes } from "./modules/reviewSuggestion/reviewSuggestion.route";
import { userPublicRoutes } from "./modules/user/user.public.routes";
import shareSettingsRoutes from "./modules/shareSettings/shareSettings.route";
import { menuBannerRoutes } from "./modules/menu/banner/banner.route";
import { menuBannerSchemas } from "./modules/menu/banner/banner.schema";
import { menuBannerPublicRoutes } from "./modules/menu/banner/banner.public.route";
import { subscriptionRoutes } from "./modules/subscription/subscription.route";
import { unsplashRoutes } from "./modules/unsplash/unsplash.route";
import { unsplashSchemas } from "./modules/unsplash/unsplash.schema";
import { subscriptionSchemas } from "./modules/subscription/subscription.schema";
import { surveyThemeRoutes } from "./modules/surveyTheme/surveyTheme.routes";
import { surveyThemeSchemas } from "./modules/surveyTheme/surveyTheme.schema";
import { paymentRoutes } from "./modules/payment/payment.route";
import { paymentSchemas } from "./modules/payment/payment.schema";
import { paymentPublicRoutes } from "./modules/payment/payment.public.route";
import { testimonialRoutes } from "./modules/testimonial/testimonials.route";
import { testimonialSchemas } from "./modules/testimonial/testimonial.schema";
import { testimonialCollectionRoutes } from "./modules/testimonial/testimonialCollection/testimonialCollection.route";
import { testimonialCollectionSchemas } from "./modules/testimonial/testimonialCollection/testimonialCollection.schema";
import { ticketRoutes } from "./modules/ticket/ticket.route";
import { ticketSchemas } from "./modules/ticket/ticket.schema";
import { testimonialPublicRoutes } from "./modules/testimonial/testimonialPublic.route";
import { loyaltyRoutes } from "./modules/loyalty/loyalty.routes";
import landingPageRoutes from "./modules/landingPage/landingPage.routes";
import { landingPageSchemas } from "./modules/landingPage/landingPage.schema";
import linktreeRoutes from "./modules/linktree/linktree.routes";
import { linktreeSchemas } from "./modules/linktree/linktree.schema";
import { statsSchemas } from "./modules/stats/stats.schema";
import { statsRoutes } from "./modules/stats/stats.route";
import { chatbotRoutes } from "./modules/chatbot/chatbot.rout";
import { chatbotPublicRoute } from "./modules/chatbot/chatbot.public.route";
import { chatbotSchemas } from "./modules/chatbot/chatbot.schema";
import { paymentStripeRoutes } from "./modules/payment/stripe/stripe.route";
import { apiAccessTokenRoutes } from "./modules/apiAccessToken/apiAccessToken.route";
import { campaignParticipantsSchemas } from "./modules/campaign/campaignParticipants/campaignParticipants.schema";
import { externalRoutes } from "./modules/external/external.route";
import { orgWsRoutes } from "./modules/org/ws/org.ws.routes";
import { orgWsSchemas } from "./modules/org/ws/org.ws.schema";
import { paymentStripeSchemas } from "./modules/payment/stripe/stripe.schema";
import { stripePublicRoutes } from "./modules/payment/stripe/stripe.public.route";
import { emailPublicRoutes } from "./modules/email/email.public.route";
import { emailSchema } from "./modules/email/email.schema";
import { updatePublicRoutes } from "./modules/update/update.public.route";
import { servicePublicRoutes } from "./modules/services/services.public.route";
import generateQrRoutes from "./modules/generateQr/generateQr.routes";
import { generateQrSchemas } from "./modules/generateQr/generateQr.schema";
import { integrationSchemas } from "./modules/integrations/integrations.schema";
import { integrationsRoutes } from "./modules/integrations/integrations.route";
import { integrationPublicRoutes } from "./modules/integrations/integration.public.route";
import { loyaltyPublicRoutes } from "./modules/loyalty/loyalty.public.route";
import { loyaltyActionSchemas } from "./modules/loyalty/actions/actions.schema";
import { loyaltyCustomerSchemas } from "./modules/loyalty/customer/customer.schema";
import { loyaltyRewardSchemas } from "./modules/loyalty/rewards/rewards.schema";
import { loyaltyRedeemSchemas } from "./modules/loyalty/redeems/redeem.schema";
import { loyaltySettingSchemas } from "./modules/loyalty/settings/settings.schema";
import { customerGroupSchemas } from "./modules/loyalty/customer/customerGroup/customerGroup.schema";
import { columnSchemas } from "./modules/ticket/ticketColumn/column.schema";
import { cardSchemas } from "./modules/ticket/ticketCard/card.schema";
import { boardSchemas } from "./modules/ticket/ticketBoard/board.schema";
import { loyaltyApiSettingSchemas } from "./modules/loyalty/apiSetting/apiSetting.schema";
import { mobileNotificationRoutes } from "./modules/mobileNotification/mobile.route";
import { expoSchemas } from "./modules/mobileNotification/mobile.schema";
import { dashboardRoutes } from "./modules/dashboard/dashboard.route";
import { notificationRoutes } from "./modules/notification/notification.route";
import { notificationSchema } from "./modules/notification/notification.schema";
import { instagramWebhookRoutes } from "./modules/whatsapp/instagram/instagram.webhook.route";
import { labelRoutes } from "./modules/label/label.route";
import { labelSchema } from "./modules/label/label.schema";

export function registerRoutes(server: FastifyInstance): void {
  const modules = [
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
    labelSchema,
  ];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }

  server.register(updatePublicRoutes, {
    prefix: "api/public/update",
  }); //for db & other temporary updations
  server.register(servicePublicRoutes, {
    prefix: "api/public/services",
  }); //for JOBS api triggers

  server.register(surveyRoutes, { prefix: "api/survey" });
  server.register(shareSettingsRoutes, {
    prefix: "api/shareSettings",
  });
  server.register(questionRoutes, { prefix: "api/question/:surveyId" });
  server.register(userRoutes, { prefix: "api/user" });
  server.register(userPublicRoutes, { prefix: "api/public/user" });
  server.register(orgRoutes, { prefix: "api/org" });
  server.register(teamRoutes, { prefix: "api/team" });
  server.register(responseRoutes, { prefix: "api/response" });
  server.register(surveyPublicRoutes, { prefix: "api/public/survey" });
  server.register(responsePublicRoutes, { prefix: "api/public/response" });
  server.register(fileUploadPublicRoutes, { prefix: "api/public/upload" });
  server.register(whatsappRoutes, { prefix: "api/wa" });
  server.register(menuRoutes, { prefix: "api/menu" });
  server.register(menuPublicRoutes, { prefix: "api/public/menu" });
  server.register(menuCategoryRoutes, { prefix: "api/mcategory" });
  server.register(menuItemRoutes, { prefix: "api/mitem" });
  server.register(menuBannerRoutes, { prefix: "api/mbanner" });
  server.register(menuBannerPublicRoutes, { prefix: "api/public/mbanner" });
  server.register(unsplashRoutes, { prefix: "api/unsplash" });
  server.register(contactFormPublicRoutes, { prefix: "api/public/contact" });
  server.register(contactRoutes, { prefix: "api/contact" });
  server.register(campaignRoutes, { prefix: "api/campaign" });
  server.register(reviewSuggestionRoutes, { prefix: "api/reviewSuggestion" });
  server.register(subscriptionRoutes, { prefix: "api/subscription" });
  server.register(paymentRoutes, { prefix: "api/payment" });
  server.register(paymentPublicRoutes, { prefix: "api/public/payment" });
  server.register(paymentStripeRoutes, { prefix: "api/payment/stripe" });
  server.register(stripePublicRoutes, { prefix: "api/public/payment/stripe" });
  server.register(surveyThemeRoutes, { prefix: "api/surveyTheme" });
  server.register(testimonialRoutes, { prefix: "api/testimonials" });
  server.register(testimonialCollectionRoutes, {
    prefix: "api/testimonial/collections",
  });
  server.register(ticketRoutes, { prefix: "api/tickets" });
  server.register(testimonialPublicRoutes, {
    prefix: "api/public/testimonials",
  });
  server.register(loyaltyRoutes, { prefix: "api/loyalty/" });
  server.register(landingPageRoutes, { prefix: "/api/landingPages" });
  server.register(linktreeRoutes, { prefix: "/api/linktrees" });
  server.register(statsRoutes, { prefix: "/api/stats" });
  server.register(chatbotRoutes, { prefix: "api/chatbot" });
  server.register(chatbotPublicRoute, { prefix: "api/public/chatbot" });
  server.register(orgWsRoutes, { prefix: "api/org/ws" });
  server.register(apiAccessTokenRoutes, { prefix: "api/api-access-token" });
  server.register(externalRoutes, { prefix: "api/external" });
  server.register(emailPublicRoutes, { prefix: "api/email" });
  server.register(generateQrRoutes, { prefix: "/api/generateQr" });
  server.register(integrationPublicRoutes, {
    prefix: "/api/public/integrations",
  });
  server.register(integrationsRoutes, { prefix: "api/integrations" });
  server.register(loyaltyPublicRoutes, { prefix: "api/public/loyalty" });
  server.register(mobileNotificationRoutes, {
    prefix: "api/mobilenotification",
  });
  server.register(dashboardRoutes, { prefix: "api/dashboard" });
  server.register(notificationRoutes, { prefix: "api/notification" });
  server.register(instagramWebhookRoutes, { prefix: "api/instagram/webhook" });
  server.register(labelRoutes, { prefix: "api/labels" });
}
