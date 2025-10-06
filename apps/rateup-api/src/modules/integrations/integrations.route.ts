import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import {
  createGoogleSheetAuthToken,
  createIntegrationHandler,
  createWaPaymentConfigurationsHandler,
  deleteIntegrationByNameHandler,
  deleteWaPaymentConfigurationHandler,
  deleteZapierTriggerHookHandler,
  getAllIntegrationsByOrgHandler,
  getAllIntegrationsHandler,
  getGoogleAuthUrlForSheetHandler,
  getIntegrationByNameHandler,
  getRegenerateWaPaymentConfigOauthHandler,
  getWaPaymentConfigByNameHandler,
  getWaPaymentConfigurationsHandler,
  updateIntegrationByNameHandler,
} from "./integrations.controller";
import { $integrationRef } from "./integrations.schema";
import { checkRoleHandler } from "../../utils/checkRoleHandler";
import { shopifyRoutes } from "./shopify/shopify.route";
import { shopifySchema } from "./shopify/shopify.schema";

export async function integrationsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.register(shopifyRoutes, { prefix: "/shopify" });
  shopifySchema.forEach((schema) => server.addSchema(schema));

  server.get("/", {}, getAllIntegrationsByOrgHandler);
  server.get("/all", {}, getAllIntegrationsHandler);
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
    "/:name",
    {
      schema: {
        params: $integrationRef("byNameSchema"),
        body: $integrationRef("updateIntgrationSchema"),
      },
    },
    updateIntegrationByNameHandler,
  );
  server.delete(
    "/:name",
    {
      schema: {
        params: $integrationRef("byNameSchema"),
      },
    },
    deleteIntegrationByNameHandler,
  );

  server.post(
    "/google/auth-token",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    createGoogleSheetAuthToken,
  );

  server.get("/google/auth-url", getGoogleAuthUrlForSheetHandler);
  server.get("/wa_payment_configurations", getWaPaymentConfigurationsHandler);
  server.get(
    "/regenerate_wa_payment_config_oauth/:name",
    {
      schema: {
        params: $integrationRef("byNameSchema"),
      },
    },
    getRegenerateWaPaymentConfigOauthHandler,
  );
  server.post(
    "/wa_payment_configuration/:name",
    {
      schema: {
        params: $integrationRef("byNameSchema"),
      },
    },
    getWaPaymentConfigByNameHandler,
  );

  server.post(
    "/wa_payment_configuration",
    {
      schema: {
        body: $integrationRef("waPaymentCreateSchema"),
      },
    },
    createWaPaymentConfigurationsHandler,
  );
  server.delete(
    "/wa_payment_configuration/:name",
    {
      schema: {
        params: $integrationRef("byNameSchema"),
      },
    },
    deleteWaPaymentConfigurationHandler,
  );
  server.delete("/zapier-hook", deleteZapierTriggerHookHandler);
}
