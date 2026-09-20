import { FastifyInstance } from "fastify";
import { checkSession } from "../../../../utils/checkSession.js";
import {
  disconnectZohoIntegrationHandler,
  getZohoContactsHandler,
  getZohoLeadsHandler,
  getZohoPipelinesHandler,
  getZohoUsersHandler,
  handleZohoWebhook,
  syncZohoContactsHandler,
  syncZohoLeadsHandler,
  zohoAuthenticationHandler,
  ZohoAuthBody,
  ZohoAuthQuery,
} from "./zoho.controller.js";
import { successSchema, zohoAuthSchema, zohoQuerySchema } from "./zoho.schema.js";
import { ZohoProduct } from "./zoho.client.js";
import { declareAccess } from "../../../../authz/registry.js";

export async function zohoRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  // Authentication endpoint
  server.post<{ Querystring: ZohoAuthQuery; Body: ZohoAuthBody }>(
    "/auth",
    {
      preHandler: checkSession,
      schema: {
        body: zohoAuthSchema,
        response: {
          200: successSchema,
        },
      },
    },
    zohoAuthenticationHandler,
  );

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

  server.post("/webhooks/:product", { config: { access: "public" } }, handleZohoWebhook);

  server.post<{ Params: { orgId: string } }>(
    "/unsubscribe/:orgId",
    {
      preHandler: checkSession,
    },
    disconnectZohoIntegrationHandler,
  );
}
