//THIS is for DB & other Updations
//Temporary and will be removed later

import { FastifyInstance } from "fastify";
import {
  updateFreePlanExpiryHandler,
  updatePlanFeaturesHandler,
  updateRateupPlanFeatureHandler,
  updateSubscriptionHandler,
  updateUsageStatsAutomationHandler,
  updateUsageStatsTemplateMessageHandler,
} from "./update.controller";

export async function updatePublicRoutes(server: FastifyInstance) {
  server.post("/usage-stats", updateUsageStatsTemplateMessageHandler);
  server.put("/update-subscription", updateSubscriptionHandler);
  server.put("/rateupplan", updateRateupPlanFeatureHandler);
  server.put("/usage-stats-automation", updateUsageStatsAutomationHandler);
  server.put("/plan-subscription", updatePlanFeaturesHandler);
  server.put("/free-plan", updateFreePlanExpiryHandler);
}
