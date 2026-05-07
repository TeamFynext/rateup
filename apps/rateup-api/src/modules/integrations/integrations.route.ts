import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
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
} from "./integrations.controller.js";
import { getIntegrationStatusesHandler } from "./integrations.controller.js";
import {
  byNameSchema,
  integrationSchema,
  updateIntgrationSchema,
  waPaymentCreateSchema,
} from "./integrations.schema.js";
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";
import { shopifyRoutes } from "./shopify/shopify.route.js";

export async function integrationsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.register(shopifyRoutes, { prefix: "/shopify" });

  server.get("/", {}, getAllIntegrationsByOrgHandler);
  server.get("/all", {}, getAllIntegrationsHandler);
  server.get(
    "/:name",
    {
      schema: {
        params: byNameSchema,
      },
    },
    getIntegrationByNameHandler,
  );
  server.get("/statuses", {}, getIntegrationStatusesHandler);
  server.post(
    "/",
    {
      schema: {
        body: integrationSchema,
      },
    },
    createIntegrationHandler,
  );
  server.put(
    "/:name",
    {
      schema: {
        params: byNameSchema,
        body: updateIntgrationSchema,
      },
    },
    updateIntegrationByNameHandler,
  );
  server.delete(
    "/:name",
    {
      schema: {
        params: byNameSchema,
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
        params: byNameSchema,
      },
    },
    getRegenerateWaPaymentConfigOauthHandler,
  );
  server.post(
    "/wa_payment_configuration/:name",
    {
      schema: {
        params: byNameSchema,
      },
    },
    getWaPaymentConfigByNameHandler,
  );

  server.post(
    "/wa_payment_configuration",
    {
      schema: {
        body: waPaymentCreateSchema,
      },
    },
    createWaPaymentConfigurationsHandler,
  );
  server.delete(
    "/wa_payment_configuration/:name",
    {
      schema: {
        params: byNameSchema,
      },
    },
    deleteWaPaymentConfigurationHandler,
  );
  server.delete("/zapier-hook", deleteZapierTriggerHookHandler);
}
