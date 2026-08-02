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
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";
import { shopifyRoutes } from "./shopify/shopify.route.js";

export async function integrationsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.register(shopifyRoutes, { prefix: "/shopify" });

  server.get("/", {}, getAllIntegrationsByOrgHandler);
  // GET /all used to answer `prisma.integration.findMany()` — every organisation's
  // integration row, credential column included — to any authenticated user of any
  // org: Google refresh tokens, Shopify Admin API session tokens, Zoho tokens and
  // webhook secrets, and every org's Zapier key hash. Removed rather than gated;
  // nothing in the product needs a platform-wide credential dump.
  // See issues.txt 26.2.
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
  // Role-gated like the Google OAuth route below it: both write credentials, and
  // the gate on one was bypassable by posting the same row through the other.
  // See issues.txt 26.17.
  server.post<{ Body: IntegrationSchema }>(
    "/",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
      schema: {
        body: integrationSchema,
      },
    },
    createIntegrationHandler,
  );
  server.put<{ Params: ByNameParams; Body: UpdateIntgrationInput }>(
    "/:name",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
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

  server.post<{ Body: { code: string } }>(
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
  // The body was cast `as any` by the handler and used to choose the URL the server
  // called out to; it is validated here and the URL is now resolved from the org's
  // own stored subscriptions. See issues.txt 26.6.
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
