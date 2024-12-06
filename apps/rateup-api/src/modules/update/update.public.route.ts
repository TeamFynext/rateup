//THIS is for DB & other Updations
//Temporary and will be removed later

import { FastifyInstance } from "fastify";
import {
  updateGoogleReviewQuestions,
  updateLoyaltySubscriptionHandler,
  updateWebSurveyThemePageTitleHandler,
} from "./update.controller";

export async function updatePublicRoutes(server: FastifyInstance) {
  server.post("/updateGoogleReviewQuestions", updateGoogleReviewQuestions);

  //update title and subtitle structure of welcome, language and thank you page
  server.post("/update-theme-title", updateWebSurveyThemePageTitleHandler);

  server.post("/loyalty-subscription", updateLoyaltySubscriptionHandler);
}
