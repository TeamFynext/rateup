import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";
import * as ctrl from "./metaAgent.controller.js";
import {
  type ByIdParams,
  type ByWhatsappSettingsIdParams,
  type ConnectorBody,
  type ConnectorToolBody,
  agentEventBodySchema,
  agentSettingsBodySchema,
  agentTestBodySchema,
  allowlistEntryBodySchema,
  businessInfoBodySchema,
  byConnectorIdParamSchema,
  byConnectorToolIdParamSchema,
  byIdParamSchema,
  byWhatsappSettingsIdParamSchema,
  connectorBodySchema,
  connectorLogsQuerySchema,
  connectorToolBodySchema,
  connectorToolRunBodySchema,
  evalRunBodySchema,
  faqBodySchema,
  onboardingBodySchema,
  skillBodySchema,
  threadControlBodySchema,
  upsertApiKeyBodySchema,
  upsertCertificateBodySchema,
  upsertOAuthBodySchema,
  websiteBodySchema,
} from "./metaAgent.schema.js";

export async function metaAgentRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  const p = "/:whatsappSettingsId";

  // The tree carried checkSession and nothing else, so the lowest-privileged
  // member of an organisation could register the credentials the agent uses to
  // call the business's own back-end systems — an API key, an OAuth client id
  // and secret, or a certificate and its private key — and could create and
  // delete the connectors those credentials belong to. Comparable configuration
  // surfaces in this codebase are gated; this one was not. Reads stay open.
  // See issues.txt 43.2.
  const adminOnly = [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])];

  server.get(
    p,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.getMetaBusinessAgentHandler,
  );

  // onboard - eligibility/onboarding are always explicit user actions (POST-only, no auto-check on load)
  server.post(
    `${p}/eligibility/check`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.checkAgentEligibilityHandler,
  );
  server.post(
    `${p}/onboarding`,
    { schema: { params: byWhatsappSettingsIdParamSchema, body: onboardingBodySchema } },
    ctrl.onboardAgentHandler,
  );

  // allowlist - local list, Meta only called on add/remove/sync
  server.get(
    `${p}/allowlist`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.listAllowlistHandler,
  );
  server.post(
    `${p}/allowlist`,
    { schema: { params: byWhatsappSettingsIdParamSchema, body: allowlistEntryBodySchema } },
    ctrl.addAllowlistEntryHandler,
  );
  server.delete(
    `${p}/allowlist/:id`,
    { schema: { params: byIdParamSchema } },
    ctrl.removeAllowlistEntryHandler,
  );
  server.post(
    `${p}/allowlist/sync`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.syncAllowlistHandler,
  );

  // settings - local, Meta only called on save/sync
  server.get(
    `${p}/settings`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.getAgentSettingsHandler,
  );
  server.put(
    `${p}/settings`,
    { schema: { params: byWhatsappSettingsIdParamSchema, body: agentSettingsBodySchema } },
    ctrl.updateAgentSettingsHandler,
  );
  server.post(
    `${p}/settings/sync`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.syncAgentSettingsHandler,
  );

  // configure: knowledge - business info
  server.get(
    `${p}/knowledge/business-info`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.getBusinessInfoHandler,
  );
  server.put(
    `${p}/knowledge/business-info`,
    { schema: { params: byWhatsappSettingsIdParamSchema, body: businessInfoBodySchema } },
    ctrl.updateBusinessInfoHandler,
  );
  server.delete(
    `${p}/knowledge/business-info`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.deleteBusinessInfoHandler,
  );
  server.post(
    `${p}/knowledge/business-info/sync`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.syncBusinessInfoHandler,
  );

  // configure: knowledge - faqs
  server.get(
    `${p}/knowledge/faqs`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.listFaqsHandler,
  );
  server.post(
    `${p}/knowledge/faqs`,
    { schema: { params: byWhatsappSettingsIdParamSchema, body: faqBodySchema } },
    ctrl.createFaqHandler,
  );
  server.put(
    `${p}/knowledge/faqs/:id`,
    { schema: { params: byIdParamSchema, body: faqBodySchema } },
    ctrl.updateFaqHandler,
  );
  server.delete(
    `${p}/knowledge/faqs/:id`,
    { schema: { params: byIdParamSchema } },
    ctrl.deleteFaqHandler,
  );
  server.post(
    `${p}/knowledge/faqs/sync`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.syncFaqsHandler,
  );

  // configure: knowledge - files
  server.get(
    `${p}/knowledge/files`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.listFilesHandler,
  );
  server.post(
    `${p}/knowledge/files`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.uploadFileHandler,
  );
  server.delete(
    `${p}/knowledge/files/:id`,
    { schema: { params: byIdParamSchema } },
    ctrl.deleteFileHandler,
  );
  server.post(
    `${p}/knowledge/files/sync`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.syncFilesHandler,
  );

  // configure: knowledge - websites
  server.get(
    `${p}/knowledge/websites`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.listWebsitesHandler,
  );
  server.post(
    `${p}/knowledge/websites`,
    { schema: { params: byWhatsappSettingsIdParamSchema, body: websiteBodySchema } },
    ctrl.createWebsiteHandler,
  );
  server.delete(
    `${p}/knowledge/websites/:id`,
    { schema: { params: byIdParamSchema } },
    ctrl.deleteWebsiteHandler,
  );
  server.post(
    `${p}/knowledge/websites/sync`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.syncWebsitesHandler,
  );

  // configure: skills
  server.get(
    `${p}/skills`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.listSkillsHandler,
  );
  server.post(
    `${p}/skills`,
    { schema: { params: byWhatsappSettingsIdParamSchema, body: skillBodySchema } },
    ctrl.createSkillHandler,
  );
  server.put(
    `${p}/skills/:id`,
    { schema: { params: byIdParamSchema, body: skillBodySchema } },
    ctrl.updateSkillHandler,
  );
  server.delete(
    `${p}/skills/:id`,
    { schema: { params: byIdParamSchema } },
    ctrl.deleteSkillHandler,
  );
  server.post(
    `${p}/skills/sync`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.syncSkillsHandler,
  );

  // configure: connectors
  server.get(
    `${p}/connectors`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.listConnectorsHandler,
  );
  server.post<{ Params: ByWhatsappSettingsIdParams; Body: ConnectorBody }>(
    `${p}/connectors`,
    {
      preHandler: adminOnly,
      schema: { params: byWhatsappSettingsIdParamSchema, body: connectorBodySchema },
    },
    ctrl.createConnectorHandler,
  );
  server.delete<{ Params: ByIdParams }>(
    `${p}/connectors/:id`,
    { preHandler: adminOnly, schema: { params: byIdParamSchema } },
    ctrl.deleteConnectorHandler,
  );
  server.get(
    `${p}/connectors/:id/logs`,
    { schema: { params: byIdParamSchema, querystring: connectorLogsQuerySchema } },
    ctrl.getConnectorLogsHandler,
  );
  server.post<{ Params: ByIdParams; Body: { api_key: string } }>(
    `${p}/connectors/:id/upsertApiKey`,
    { preHandler: adminOnly, schema: { params: byIdParamSchema, body: upsertApiKeyBodySchema } },
    ctrl.upsertConnectorApiKeyHandler,
  );
  server.post<{
    Params: ByIdParams;
    Body: { client_id: string; client_secret: string; token_url?: string };
  }>(
    `${p}/connectors/:id/upsertOAuth`,
    { preHandler: adminOnly, schema: { params: byIdParamSchema, body: upsertOAuthBodySchema } },
    ctrl.upsertConnectorOAuthHandler,
  );
  server.post<{ Params: ByIdParams; Body: { certificate: string; private_key?: string } }>(
    `${p}/connectors/:id/upsertCertificate`,
    {
      preHandler: adminOnly,
      schema: { params: byIdParamSchema, body: upsertCertificateBodySchema },
    },
    ctrl.upsertConnectorCertificateHandler,
  );
  server.post(
    `${p}/connectors/sync`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.syncConnectorsHandler,
  );

  // configure: connector tools
  server.get(
    `${p}/connectors/:connectorId/tools`,
    { schema: { params: byConnectorIdParamSchema } },
    ctrl.listConnectorToolsHandler,
  );
  server.post<{
    Params: { whatsappSettingsId: string; connectorId: string };
    Body: ConnectorToolBody;
  }>(
    `${p}/connectors/:connectorId/tools`,
    {
      preHandler: adminOnly,
      schema: { params: byConnectorIdParamSchema, body: connectorToolBodySchema },
    },
    ctrl.createConnectorToolHandler,
  );
  server.delete<{
    Params: { whatsappSettingsId: string; connectorId: string; toolId: string };
  }>(
    `${p}/connectors/:connectorId/tools/:toolId`,
    { preHandler: adminOnly, schema: { params: byConnectorToolIdParamSchema } },
    ctrl.deleteConnectorToolHandler,
  );
  // A tool run is an outbound call to the business's own systems using those
  // credentials, so it belongs with them rather than with the reads.
  server.post<{
    Params: { whatsappSettingsId: string; connectorId: string; toolId: string };
    Body: { input?: Record<string, unknown> };
  }>(
    `${p}/connectors/:connectorId/tools/:toolId/run`,
    {
      preHandler: adminOnly,
      schema: { params: byConnectorToolIdParamSchema, body: connectorToolRunBodySchema },
    },
    ctrl.runConnectorToolHandler,
  );
  server.post(
    `${p}/connectors/:connectorId/tools/sync`,
    { schema: { params: byConnectorIdParamSchema } },
    ctrl.syncConnectorToolsHandler,
  );

  // operate: eval (transient, already action-triggered from the UI)
  server.post(
    `${p}/eval/cases`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.listEvalCasesHandler,
  );
  server.post(
    `${p}/eval/run`,
    { schema: { params: byWhatsappSettingsIdParamSchema, body: evalRunBodySchema } },
    ctrl.submitEvalRunHandler,
  );
  server.get(
    `${p}/eval/run`,
    { schema: { params: byWhatsappSettingsIdParamSchema } },
    ctrl.getEvalRunStatusHandler,
  );

  // operate: event
  server.post(
    `${p}/events`,
    { schema: { params: byWhatsappSettingsIdParamSchema, body: agentEventBodySchema } },
    ctrl.submitAgentEventHandler,
  );
  server.get(
    `${p}/events/:id`,
    { schema: { params: byIdParamSchema } },
    ctrl.getAgentEventStatusHandler,
  );

  // operate: test
  server.post(
    `${p}/test`,
    { schema: { params: byWhatsappSettingsIdParamSchema, body: agentTestBodySchema } },
    ctrl.testAgentHandler,
  );

  // operate: thread control
  server.post(
    `${p}/thread-control`,
    { schema: { params: byWhatsappSettingsIdParamSchema, body: threadControlBodySchema } },
    ctrl.setThreadControlHandler,
  );
}
