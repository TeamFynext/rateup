//THIS is for DB & other Updations
//Temporary and will be removed later

import { FastifyInstance } from "fastify";
import {
  updateFreePlanSubscriptionFeaturesHandler,
  updateWebSurveyPagesTheme,
} from "./update.controller";

export async function updatePublicRoutes(server: FastifyInstance) {
  server.post("/updateWebSurveyPagesTheme", updateWebSurveyPagesTheme);

  server.post(
    "/subscription/freeplan",
    updateFreePlanSubscriptionFeaturesHandler,
  );
}
