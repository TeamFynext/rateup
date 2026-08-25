//THIS is for DB & other Updations
//Temporary and will be removed later

import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import { assertRootOrg } from "../../utils/auth.js";
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
  reconcileInboxStatusHandler,
  backfillConversationsHandler,
  startBackfillConversationsHandler,
  backfillConversationsStatusHandler,
  stopBackfillConversationsHandler,
  deleteAllPipelinesHandler,
  seedPipelinesHandler,
  placeLeadsFromLifecyclesHandler,
  mapLifecycleRefsToStagesHandler,
  convertAssignLifecycleActionsHandler,
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
  server.put("/reconcile-inbox-status", reconcileInboxStatusHandler);
  server.put("/backfill-conversations", backfillConversationsHandler);
  server.post("/backfill-conversations/start", startBackfillConversationsHandler);
  server.get("/backfill-conversations/status", backfillConversationsStatusHandler);
  server.post("/backfill-conversations/stop", stopBackfillConversationsHandler);

  // Everything above this line is unauthenticated, which is how this file has
  // always worked. That is tolerable for idempotent migrations; it is not
  // tolerable for a route that empties a table across every tenant, so this one
  // carries its own session check and root-org guard. Any future destructive
  // card here should do the same.
  server.delete<{ Querystring: { apply?: string } }>(
    "/pipelines",
    { preHandler: [checkSession, assertRootOrg] },
    deleteAllPipelinesHandler,
  );
  server.post<{ Querystring: { apply?: string; orgId?: string } }>(
    "/seed-pipelines",
    { preHandler: [checkSession, assertRootOrg] },
    seedPipelinesHandler,
  );
  server.post<{ Querystring: { apply?: string } }>(
    "/place-leads-from-lifecycles",
    { preHandler: [checkSession, assertRootOrg] },
    placeLeadsFromLifecyclesHandler,
  );
  server.post<{ Querystring: { apply?: string } }>(
    "/map-lifecycle-refs-to-stages",
    { preHandler: [checkSession, assertRootOrg] },
    mapLifecycleRefsToStagesHandler,
  );
  server.post<{ Querystring: { apply?: string } }>(
    "/convert-assign-lifecycle-actions",
    { preHandler: [checkSession, assertRootOrg] },
    convertAssignLifecycleActionsHandler,
  );
}
