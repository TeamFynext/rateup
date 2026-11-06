import { FastifyInstance } from "fastify";

import { checkSession } from "../../../../utils/checkSession.js";
import {
  getGetLeadMetaHandler,
  getGetLeadSettingsHandler,
  getGetLeadStatusHandler,
  saveGetLeadSettingsHandler,
} from "./getlead.controller.js";
import {
  getGetLeadWebhookHandler,
  issueGetLeadWebhookHandler,
} from "./getlead.webhook.controller.js";
import {
  getleadMetaQuerySchema,
  getleadSettingsSchema,
  type GetLeadMetaQuery,
  type GetLeadSettingsBody,
} from "./getlead.schema.js";
import { declareAccess } from "../../../../authz/registry.js";

/**
 * Only what the shared integration routes cannot do.
 *
 * Connecting is the shared pasted-key connect (`POST /integrations/getlead/connect`,
 * through the provider's `apiKey`); disconnecting and reading the row are the
 * generic `DELETE|GET /integrations/getlead`.
 *
 * The two `/webhook` routes here only *issue* the inbound credentials. The
 * receiver they point at is public, and lives in `getlead.public.route.ts`.
 */
export async function getleadRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  server.get<{ Querystring: GetLeadMetaQuery }>(
    "/meta",
    {
      preHandler: checkSession,
      schema: { querystring: getleadMetaQuerySchema },
    },
    getGetLeadMetaHandler,
  );

  server.get("/status", { preHandler: checkSession }, getGetLeadStatusHandler);

  server.get("/settings", { preHandler: checkSession }, getGetLeadSettingsHandler);

  server.get("/webhook", { preHandler: checkSession }, getGetLeadWebhookHandler);

  // POST, not PUT: it mints new credentials and invalidates the old ones, so it
  // is not idempotent and must not be safe to retry blindly.
  server.post("/webhook", { preHandler: checkSession }, issueGetLeadWebhookHandler);

  server.put<{ Body: GetLeadSettingsBody }>(
    "/settings",
    {
      preHandler: checkSession,
      schema: { body: getleadSettingsSchema },
    },
    saveGetLeadSettingsHandler,
  );
}
