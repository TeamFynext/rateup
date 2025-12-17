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
  migratePhoneIdsHandle,
  backfillWithSQLHandler,
  migrateAutomationToRulesHandler,
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
  server.put("/migrate-to-whatsapp-phone-ids", migratePhoneIdsHandle);
  server.put("/backfill", backfillWithSQLHandler);
  server.put("/migrate-automation-to-rules", migrateAutomationToRulesHandler);
}
