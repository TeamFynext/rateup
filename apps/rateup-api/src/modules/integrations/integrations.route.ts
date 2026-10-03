import { FastifyInstance } from "fastify";
import {
  createIntegrationHandler,
  createWaPaymentConfigurationsHandler,
  deleteIntegrationByNameHandler,
  deleteWaPaymentConfigurationHandler,
  deleteZapierTriggerHookHandler,
  connectWithApiKeyHandler,
  finishOAuthConnectHandler,
  getAllIntegrationsByOrgHandler,
  getIntegrationActivityHandler,
  getOAuthAuthorizeUrlHandler,
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
  apiKeyConnectSchema,
  oauthAuthorizeQuerySchema,
  oauthCallbackSchema,
  type DeleteZapierHookInput,
  type ApiKeyConnectInput,
  type OAuthAuthorizeQuery,
  type OAuthCallbackInput,
  type IntegrationSchema,
  type ByNameParams,
  type UpdateIntgrationInput,
} from "./integrations.schema.js";
import { shopifyRoutes } from "./shopify/shopify.route.js";
import { wooCommerceRoutes } from "./woocommerce/woocommerce.route.js";
import { hubSpotRoutes } from "./hubspot/hubspot.route.js";
import { declareAccess } from "../../authz/registry.js";

export async function integrationsRoutes(server: FastifyInstance) {
  declareAccess(server, { read: "integrations.read", write: "integrations.manage" });

  server.register(shopifyRoutes, { prefix: "/shopify" });
  server.register(wooCommerceRoutes, { prefix: "/woocommerce" });
  server.register(hubSpotRoutes, { prefix: "/hubspot" });

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
  server.get<{ Params: ByNameParams }>(
    "/:name/activity",
    { schema: { params: byNameSchema } },
    getIntegrationActivityHandler,
  );

  // The shared pasted-key connect (`shared/apiKeyConnect.ts`).
  server.post<{ Params: ByNameParams; Body: ApiKeyConnectInput }>(
    "/:name/connect",
    {
      config: { permission: "integrations.manage" },
      schema: { params: byNameSchema, body: apiKeyConnectSchema },
    },
    connectWithApiKeyHandler,
  );
  // The shared OAuth connect (`shared/oauthConnect.ts`). The authorize URL is a
  // GET but starts a credential write, so it asks for manage like the callback.
  server.get<{ Params: ByNameParams; Querystring: OAuthAuthorizeQuery }>(
    "/:name/oauth/authorize-url",
    {
      config: { permission: "integrations.manage" },
      schema: { params: byNameSchema, querystring: oauthAuthorizeQuerySchema },
    },
    getOAuthAuthorizeUrlHandler,
  );
  server.post<{ Params: ByNameParams; Body: OAuthCallbackInput }>(
    "/:name/oauth/callback",
    { schema: { params: byNameSchema, body: oauthCallbackSchema } },
    finishOAuthConnectHandler,
  );
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
