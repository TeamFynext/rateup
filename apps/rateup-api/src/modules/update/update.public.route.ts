//THIS is for DB & other Updations
//Temporary and will be removed later

import { FastifyInstance } from "fastify";
import {
  updateFreePlanSubscriptionFeaturesHandler,
  updateGoogleReviewQuestions,
} from "./update.controller";

export async function updatePublicRoutes(server: FastifyInstance) {
  server.post("/updateGoogleReviewQuestions", updateGoogleReviewQuestions);

  server.post(
    "/subscription/freeplan",
    updateFreePlanSubscriptionFeaturesHandler,
  );
}
