//THIS is for DB & other Updations
//Temporary and will be removed later

import { FastifyInstance } from "fastify";
import {
  updateFreePlanExpiryHandler,
  migrateFreePlanFeaturesHandler,
  migrateNonFreePlanFeaturesHandler,
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
  migrateLoyaltyTierPriorityHandler,
  seedInboxStatsAutomationHandler,
  seedPipelinesHandler,
  reconcileInboxStatusHandler,
  backfillConversationsHandler,
  startBackfillConversationsHandler,
  backfillConversationsStatusHandler,
  stopBackfillConversationsHandler,
} from "./update.controller.js";

export async function updatePublicRoutes(server: FastifyInstance) {
  server.post("/usage-stats", updateUsageStatsTemplateMessageHandler);
  server.put("/update-subscription", updateSubscriptionHandler);
  server.put("/rateupplan", updateRateupPlanFeatureHandler);
  server.put("/usage-stats-automation", updateUsageStatsAutomationHandler);
  server.put("/plan-subscription", updatePlanFeaturesHandler);
  server.put("/free-plan", updateFreePlanExpiryHandler);
  server.put("/migrate-free-plan-features", migrateFreePlanFeaturesHandler);
  server.put("/migrate-non-free-plan-features", migrateNonFreePlanFeaturesHandler);
  server.put("/add-default-lifecycle", updateDefaultLifecycleHandler);
  server.put("/migrate-tags", migrateTagsHandle);
  server.put("/backfill", backfillWithSQLHandler);
  server.put("/migrate-wa-template-to-whatsapp-phone-id", migrateWaTemplatePhoneIdsHandler);
  server.put("/sync-team-features", syncTeamFeaturesHandler);
  server.put("/migrate-loyalty-tier-priority", migrateLoyaltyTierPriorityHandler);
  server.put("/seed-inbox-stats", seedInboxStatsAutomationHandler);
  server.put("/seed-pipelines", seedPipelinesHandler);
  server.put("/reconcile-inbox-status", reconcileInboxStatusHandler);
  server.put("/backfill-conversations", backfillConversationsHandler);
  server.post("/backfill-conversations/start", startBackfillConversationsHandler);
  server.get("/backfill-conversations/status", backfillConversationsStatusHandler);
  server.post("/backfill-conversations/stop", stopBackfillConversationsHandler);
}
