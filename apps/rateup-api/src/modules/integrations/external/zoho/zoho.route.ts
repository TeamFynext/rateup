import { FastifyInstance } from "fastify";
import { checkSession } from "../../../../utils/checkSession.js";
import {
  getZohoContactsHandler,
  getZohoLeadsHandler,
  getZohoPipelinesHandler,
  getZohoUsersHandler,
  handleZohoWebhook,
  syncZohoContactsHandler,
  syncZohoLeadsHandler,
} from "./zoho.controller.js";
import { zohoQuerySchema } from "./zoho.schema.js";
import { ZohoProduct } from "./zoho.client.js";
import { declareAccess } from "../../../../authz/registry.js";

export async function zohoRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  // Connecting and disconnecting go through the shared integration routes
  // (`/:name/oauth/*`, `DELETE /:name`); these are the settings page's reads.
  server.get<{ Querystring: { orgId: string; product?: ZohoProduct } }>(
    "/contacts",
    {
      preHandler: checkSession,
      schema: {
        querystring: zohoQuerySchema,
      },
    },
    getZohoContactsHandler,
  );

  server.post<{ Querystring: { product?: ZohoProduct } }>(
    "/contacts/sync",
    {
      preHandler: checkSession,
      schema: {
        querystring: zohoQuerySchema,
      },
    },
    syncZohoContactsHandler,
  );

  server.get<{ Querystring: { orgId: string } }>(
    "/leads",
    {
      preHandler: checkSession,
      schema: {
        querystring: zohoQuerySchema,
      },
    },
    getZohoLeadsHandler,
  );

  server.get<{ Querystring: { orgId: string } }>(
    "/users",
    {
      preHandler: checkSession,
      schema: {
        querystring: zohoQuerySchema,
      },
    },
    getZohoUsersHandler,
  );

  server.get<{ Querystring: { product?: ZohoProduct } }>(
    "/pipelines",
    {
      preHandler: checkSession,
      schema: {
        querystring: zohoQuerySchema,
      },
    },
    getZohoPipelinesHandler,
  );

  server.post(
    "/leads/sync",
    {
      preHandler: checkSession,
    },
    syncZohoLeadsHandler,
  );

  // The pre-move webhook address; see `handleZohoWebhook`.
  server.post("/webhooks/:product", { config: { access: "public" } }, handleZohoWebhook);
}
