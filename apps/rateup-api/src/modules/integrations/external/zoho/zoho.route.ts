import { FastifyInstance } from "fastify";
import { checkSession } from "../../../../utils/checkSession.js";
import {
  disconnectZohoIntegrationHandler,
  getZohoContactsHandler,
  getZohoLeadsHandler,
  getZohoPipelinesHandler,
  handleZohoWebhook,
  syncZohoContactsHandler,
  syncZohoLeadsHandler,
  zohoAuthenticationHandler,
} from "./zoho.controller.js";
import {
  successSchema,
  zohoAuthSchema,
  zohoQuerySchema,
} from "./zoho.schema.js";

export async function zohoRoutes(server: FastifyInstance) {
  // Authentication endpoint
  server.post(
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

  server.get(
    "/contacts",
    {
      preHandler: checkSession,
      schema: {
        querystring: zohoQuerySchema,
      },
    },
    getZohoContactsHandler,
  );

  server.post(
    "/contacts/sync",
    {
      preHandler: checkSession,
      schema: {
        querystring: zohoQuerySchema,
      },
    },
    syncZohoContactsHandler,
  );

  server.get(
    "/leads",
    {
      preHandler: checkSession,
      schema: {
        querystring: zohoQuerySchema,
      },
    },
    getZohoLeadsHandler,
  );

  server.get(
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

  server.post("/webhooks/:product", handleZohoWebhook);

  server.post("/unsubscribe/:orgId", disconnectZohoIntegrationHandler);
}
