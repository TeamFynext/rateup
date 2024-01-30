import { FastifyInstance } from "fastify";

import { orgRoutes } from "./modules/org/org.route";
import { orgSchemas } from "./modules/org/org.schema";
import { questionRoutes } from "./modules/question/question.route";
import { questionSchemas } from "./modules/question/question.schema";
import { responsePublicRoutes } from "./modules/response/response.public.route";
import { responseRoutes } from "./modules/response/response.route";
import { responseSchemas } from "./modules/response/response.schema";
import { surveyPublicRoutes } from "./modules/survey/survey.public.routes";
import { landingPagePublicRoutes } from "./modules/landingPage/landingpage.public.routes";
import { surveyRoutes } from "./modules/survey/survey.route";
import { surveySchemas } from "./modules/survey/survey.schema";
import { landingPageSchemas } from "./modules/landingPage/landingpage.schema";
import { teamRoutes } from "./modules/team/team.route";
import { teamSchemas } from "./modules/team/team.schema";
import { userRoutes } from "./modules/user/user.route";
import { fileUploadPublicRoutes } from "./modules/fileUpload/fileUpload.public.route";
import { uploadSchemas } from "./modules/fileUpload/fileUpload.schema";
import { userSchemas } from "./modules/user/user.schema";
import { LandingThemeSchema } from "./modules/landingWelcomeTheme/landingTheme.schema";
import { LandingPageRoutes } from "./modules/landingPage/landingpage.route";
import { LandingThemeRoutes } from "./modules/landingWelcomeTheme/landingTheme.routes";
import { LandingThemePublicRoutes } from "./modules/landingWelcomeTheme/landingTheme.public.routes";
import { menuSchemas } from "./modules/menu/menu.schema";
import { menuRoutes } from "./modules/menu/menu.route";
import { menuCategorySchemas } from "./modules/menu/category/category.schema";
import { menuCategoryRoutes } from "./modules/menu/category/category.route";
import { menuItemSchemas } from "./modules/menu/item/item.schema";
import { menuItemRoutes } from "./modules/menu/item/item.route";
import { menuPublicRoutes } from "./modules/menu/menu.public.route";
import { contactFormSchemas } from "./modules/contactForm/contact.schema";
import { contactFormPublicRoutes } from "./modules/contactForm/contact.public.route";
import { electionPublicRoutes } from "./modules/election/election.public.routes";
import { whatsappRoutes } from "./modules/whatsapp/wa_routes";
import { contactSchemas } from "./modules/contact/contact.schema";
import { contactRoutes } from "./modules/contact/contact.route";
import { campaignSchemas } from "./modules/campaign/campaign.schema";
import { campaignRoutes } from "./modules/campaign/campaign.route";
import { reviewSuggestionSchemas } from "./modules/reviewSuggestion/reviewSuggestion.schema";
import { reviewSuggestionRoutes } from "./modules/reviewSuggestion/reviewSuggestion.route";
import { userPublicRoutes } from "./modules/user/user.public.routes";
import { reputationManagementRoutes } from "./modules/reputation_management/registerRMRoutes";
import surveyMenuShareSettingsRoutes from "./modules/surveyMenuShareSettings/surveyMenuShareSettings.route";
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

export function registerRoutes(server: FastifyInstance): void {
  const modules = [
    surveySchemas,
    questionSchemas,
    orgSchemas,
    teamSchemas,
    responseSchemas,
    uploadSchemas,
    userSchemas,
    landingPageSchemas,
    LandingThemeSchema,
    menuSchemas,
    menuCategorySchemas,
    menuItemSchemas,
    contactFormSchemas,
    contactSchemas,
    campaignSchemas,
    reviewSuggestionSchemas,
    menuBannerSchemas,
    unsplashSchemas,
    subscriptionSchemas,
    surveyThemeSchemas,
    paymentSchemas,
  ];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }
  server.register(surveyRoutes, { prefix: "api/survey" });
  server.register(LandingPageRoutes, { prefix: "api/landingpage" });
  server.register(surveyMenuShareSettingsRoutes, {
    prefix: "api/shareSettings",
  });
  server.register(LandingThemeRoutes, { prefix: "api/landingtheme" });
  server.register(LandingThemePublicRoutes, {
    prefix: "api/public/landingtheme",
  });
  server.register(questionRoutes, { prefix: "api/question/:surveyId" });
  server.register(userRoutes, { prefix: "api/user" });
  server.register(userPublicRoutes, { prefix: "api/public/user" });
  server.register(orgRoutes, { prefix: "api/org" });
  server.register(teamRoutes, { prefix: "api/team" });
  server.register(responseRoutes, { prefix: "api/response" });
  server.register(surveyPublicRoutes, { prefix: "api/public/survey" });
  server.register(landingPagePublicRoutes, {
    prefix: "api/public/landingpage",
  });
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
  server.register(electionPublicRoutes, { prefix: "api/public/election" });
  server.register(contactRoutes, { prefix: "api/contact" });
  server.register(campaignRoutes, { prefix: "api/campaign" });
  server.register(reviewSuggestionRoutes, { prefix: "api/reviewSuggestion" });
  server.register(reputationManagementRoutes, { prefix: "api/rm" });
  server.register(subscriptionRoutes, { prefix: "api/subscription" });
  server.register(paymentRoutes, { prefix: "api/payment" });
  server.register(paymentPublicRoutes, { prefix: "api/public/payment" });
  server.register(surveyThemeRoutes, { prefix: "api/surveyTheme" });
}
