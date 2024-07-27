import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import {
  createIntegrationHandler,
  deleteIntegrationByIdHandler,
  getAllIntegrationsHandler,
  getIntegrationByNameHandler,
  updateIntegrationByIdHandler,
} from "./integrations.controller";
import { $integrationRef } from "./integrations.schema";

export async function integrationsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get("/", {}, getAllIntegrationsHandler);
  server.get(
    "/:name",
    {
      schema: {
        params: $integrationRef("byNameSchema"),
      },
    },
    getIntegrationByNameHandler,
  );
  server.post(
    "/",
    {
      schema: {
        body: $integrationRef("integrationSchema"),
      },
    },
    createIntegrationHandler,
  );
  server.put(
    "/:id",
    {
      schema: {
        params: $integrationRef("byIdSchema"),
        body: $integrationRef("integrationSchema"),
      },
    },
    updateIntegrationByIdHandler,
  );
  server.delete(
    "/:id",
    {
      schema: {
        params: $integrationRef("byIdSchema"),
      },
    },
    deleteIntegrationByIdHandler,
  );
}
