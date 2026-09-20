import { FastifyInstance } from "fastify";
import {
  createGoogleSheetAuthToken,
  createIntegrationHandler,
  createWaPaymentConfigurationsHandler,
  deleteIntegrationByNameHandler,
  deleteWaPaymentConfigurationHandler,
  deleteZapierTriggerHookHandler,
  getAllIntegrationsByOrgHandler,
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
  deleteZapierHookSchema,
  type DeleteZapierHookInput,
  type IntegrationSchema,
  type ByNameParams,
  type UpdateIntgrationInput,
} from "./integrations.schema.js";
import { shopifyRoutes } from "./shopify/shopify.route.js";
import { declareAccess } from "../../authz/registry.js";

export async function integrationsRoutes(server: FastifyInstance) {
  declareAccess(server, { read: "integrations.read", write: "integrations.manage" });

  server.register(shopifyRoutes, { prefix: "/shopify" });

  server.get("/", {}, getAllIntegrationsByOrgHandler);
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
  server.post<{ Body: IntegrationSchema }>(
    "/",
    {
      schema: {
        body: integrationSchema,
      },
    },
    createIntegrationHandler,
  );
  server.put<{ Params: ByNameParams; Body: UpdateIntgrationInput }>(
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

  server.post<{ Body: { code: string } }>("/google/auth-token", {}, createGoogleSheetAuthToken);

  server.get("/google/auth-url", getGoogleAuthUrlForSheetHandler);
  server.get("/wa_payment_configurations", getWaPaymentConfigurationsHandler);
  server.get(
    "/regenerate_wa_payment_config_oauth/:name",
    {
      config: { permission: "integrations.manage" },
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
  server.delete<{ Body: DeleteZapierHookInput }>(
    "/zapier-hook",
    {
      schema: {
        body: deleteZapierHookSchema,
      },
    },
    deleteZapierTriggerHookHandler,
  );
}
