//THIS is for DB & other Updations
//Temporary and will be removed later

import { FastifyInstance } from "fastify";
import {
  updateFreePlanExpiryHandler,
  updateDefaultLifecycleHandler,
  updatePlanFeaturesHandler,
  updateRateupPlanFeatureHandler,
  updateSubscriptionHandler,
  updateUsageStatsAutomationHandler,
  updateUsageStatsTemplateMessageHandler,
  migrateTagsHandle,
  backfillWithSQLHandler,
  migrateWaTemplatePhoneIdsHandler,
  syncTeamFeaturesHandler,
} from "./update.controller.js";

export async function updatePublicRoutes(server: FastifyInstance) {
  server.post("/usage-stats", updateUsageStatsTemplateMessageHandler);
  server.put("/update-subscription", updateSubscriptionHandler);
  server.put("/rateupplan", updateRateupPlanFeatureHandler);
  server.put("/usage-stats-automation", updateUsageStatsAutomationHandler);
  server.put("/plan-subscription", updatePlanFeaturesHandler);
  server.put("/free-plan", updateFreePlanExpiryHandler);
  server.put("/add-default-lifecycle", updateDefaultLifecycleHandler);
  server.put("/migrate-tags", migrateTagsHandle);
  server.put("/backfill", backfillWithSQLHandler);
  server.put(
    "/migrate-wa-template-to-whatsapp-phone-id",
    migrateWaTemplatePhoneIdsHandler,
  );
  server.put("/sync-team-features", syncTeamFeaturesHandler);
}
