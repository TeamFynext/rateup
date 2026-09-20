import { FastifyInstance } from "fastify";

import { checkSession } from "../../../../utils/checkSession.js";
import {
  connectGetLeadHandler,
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
  getleadConnectSchema,
  getleadMetaQuerySchema,
  getleadSettingsSchema,
  type GetLeadConnectBody,
  type GetLeadMetaQuery,
  type GetLeadSettingsBody,
} from "./getlead.schema.js";
import { declareAccess } from "../../../../authz/registry.js";

/**
 * Only what the generic integration CRUD cannot do.
 *
 * Connect/disconnect and reading the row already exist as
 * `POST|DELETE|GET /integrations`; GetLead needs no OAuth callback, so there is
 * no `/auth`.
 *
 * The two `/webhook` routes here only *issue* the inbound credentials. The
 * receiver they point at is public, and lives in `getlead.public.route.ts`.
 */
export async function getleadRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  server.post<{ Body: GetLeadConnectBody }>(
    "/connect",
    {
      preHandler: checkSession,
      schema: { body: getleadConnectSchema },
    },
    connectGetLeadHandler,
  );

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
