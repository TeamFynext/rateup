import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import { MetaAgentApiError } from "./metaAgent.client.js";
import * as service from "./metaAgent.service.js";
import * as rateupConnector from "./rateupTools/rateupConnector.service.js";
import type { InstallRateupConnectorBody } from "./rateupTools/rateupConnector.service.js";
import { MetaAgentValidationError } from "./metaAgent.service.js";
import {
  AgentBudgetsBody,
  AgentEventBody,
  AgentEventInsightsQuery,
  AgentInboxSettingsBody,
  AgentSettingsBody,
  AgentTestBody,
  BusinessInfoBody,
  ByConnectorIdParams,
  ByConnectorToolIdParams,
  ByIdParams,
  ByWhatsappSettingsIdParams,
  ConnectorBody,
  ConnectorLogsQuery,
  ConnectorToolBody,
  ConnectorToolRunBody,
  ConversationInsightsQuery,
  ConversationTurnsQuery,
  EvalDetailsQuery,
  EvalRunBody,
  EvalRunQuery,
  EvalSummaryQuery,
  FaqBody,
  OnboardingBody,
  SkillBody,
  ThreadControlBody,
  ToolCallInsightsQuery,
  UiSkillBody,
  UiSkillUpdateBody,
  UpsertApiKeyBody,
  UpsertCertificateBody,
  UpsertOAuthBody,
  WebsiteBody,
} from "./metaAgent.schema.js";

function statusFromMeta(status: number | undefined): number {
  if (!status) return 502;
  // The caller's own input was rejected — the one class worth relaying as a 4xx.
  if (status === 400 || status === 422) return 400;
  // Meta could not find what we named on the business's behalf.
  if (status === 404) return 404;
  // A create that collides with something already there.
  if (status === 409) return 409;
  // Our credentials, Meta's throttle or Meta being down: upstream problems, all
  // of which are 502 from here. (A throttle is still told apart by the UI
  // through `upstreamStatus`.)
  return 502;
}

function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof MetaAgentValidationError) {
    return reply.code(400).send({ message: error.message });
  }
  if (error instanceof MetaAgentApiError) {
    log.error({ err: error }, "Meta Business Agent API error");
    return reply.code(statusFromMeta(error.status)).send({
      message: error.message,
      detail: error.detail,
      // Named explicitly so a client can tell an upstream refusal from ours.
      upstreamStatus: error.status,
      fbtraceId: error.fbtraceId,
    });
  }
  log.error({ err: error }, "Meta Business Agent handler error");
  return reply.code(500).send({ message: "Something went wrong" });
}

const wrap =
  <TReq extends FastifyRequest>(fn: (req: TReq, orgId: string) => Promise<unknown>) =>
  async (req: TReq, reply: FastifyReply) => {
    try {
      const { orgId } = req.user;
      const data = await fn(req, orgId);
      return reply.code(200).send(data ?? {});
    } catch (error) {
      return handleError(reply, error);
    }
  };

// ---- record ----
export const getMetaBusinessAgentHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>
>((req, orgId) => service.getAgentRecord(orgId, req.params.whatsappSettingsId));

// ---- onboard ----
export const checkAgentEligibilityHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>
>((req, orgId) => service.checkAgentEligibility(orgId, req.params.whatsappSettingsId));

export const onboardAgentHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: OnboardingBody }>
>((req, orgId) => service.onboardAgent(orgId, req.params.whatsappSettingsId, req.body));

export const deleteAgentHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.deleteAgent(orgId, req.params.whatsappSettingsId),
);

// ---- allowlist ----
export const listAllowlistHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.listAllowlist(orgId, req.params.whatsappSettingsId),
);

export const addAllowlistEntryHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: { consumer_phone_number: string } }>
>((req, orgId) =>
  service.addAllowlistEntry(orgId, req.params.whatsappSettingsId, req.body.consumer_phone_number),
);

export const removeAllowlistEntryHandler = wrap<FastifyRequest<{ Params: ByIdParams }>>(
  async (req, orgId) => {
    await service.removeAllowlistEntry(orgId, req.params.whatsappSettingsId, req.params.id);
  },
);

export const syncAllowlistHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.syncAllowlist(orgId, req.params.whatsappSettingsId),
);

// ---- settings ----
export const getAgentSettingsHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.getAgentSettings(orgId, req.params.whatsappSettingsId),
);

export const updateAgentSettingsHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: AgentSettingsBody }>
>((req, orgId) => service.updateAgentSettings(orgId, req.params.whatsappSettingsId, req.body));

export const syncAgentSettingsHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>
>((req, orgId) => service.syncAgentSettings(orgId, req.params.whatsappSettingsId));

// ---- knowledge: business info ----
export const getBusinessInfoHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.getBusinessInfo(orgId, req.params.whatsappSettingsId),
);

export const updateBusinessInfoHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: BusinessInfoBody }>
>((req, orgId) => service.updateBusinessInfo(orgId, req.params.whatsappSettingsId, req.body));

export const deleteBusinessInfoHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>
>(async (req, orgId) => {
  await service.deleteBusinessInfo(orgId, req.params.whatsappSettingsId);
});

export const syncBusinessInfoHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.syncBusinessInfo(orgId, req.params.whatsappSettingsId),
);

// ---- knowledge: faqs ----
export const listFaqsHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.listFaqs(orgId, req.params.whatsappSettingsId),
);

export const createFaqHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: FaqBody }>
>((req, orgId) => service.createFaq(orgId, req.params.whatsappSettingsId, req.body));

export const updateFaqHandler = wrap<FastifyRequest<{ Params: ByIdParams; Body: FaqBody }>>(
  (req, orgId) => service.updateFaq(orgId, req.params.whatsappSettingsId, req.params.id, req.body),
);

export const deleteFaqHandler = wrap<FastifyRequest<{ Params: ByIdParams }>>(async (req, orgId) => {
  await service.deleteFaq(orgId, req.params.whatsappSettingsId, req.params.id);
});

export const syncFaqsHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.syncFaqs(orgId, req.params.whatsappSettingsId),
);

// ---- knowledge: files ----
export const listFilesHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.listFiles(orgId, req.params.whatsappSettingsId),
);

export async function uploadFileHandler(
  req: FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = req.user;
    const file = await req.file();
    if (!file) {
      return reply.code(400).send({ message: "No file provided" });
    }
    const buffer = await file.toBuffer();
    const data = await service.uploadFile(
      orgId,
      req.params.whatsappSettingsId,
      file.filename,
      buffer,
      file.mimetype,
    );
    return reply.code(201).send(data);
  } catch (error) {
    return handleError(reply, error);
  }
}

export const deleteFileHandler = wrap<FastifyRequest<{ Params: ByIdParams }>>(
  async (req, orgId) => {
    await service.deleteFile(orgId, req.params.whatsappSettingsId, req.params.id);
  },
);

export const syncFilesHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.syncFiles(orgId, req.params.whatsappSettingsId),
);

// ---- knowledge: websites ----
export const listWebsitesHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.listWebsites(orgId, req.params.whatsappSettingsId),
);

export const createWebsiteHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: WebsiteBody }>
>((req, orgId) => service.createWebsite(orgId, req.params.whatsappSettingsId, req.body));

export const updateWebsiteHandler = wrap<FastifyRequest<{ Params: ByIdParams; Body: WebsiteBody }>>(
  (req, orgId) =>
    service.updateWebsite(orgId, req.params.whatsappSettingsId, req.params.id, req.body),
);

export const deleteWebsiteHandler = wrap<FastifyRequest<{ Params: ByIdParams }>>(
  async (req, orgId) => {
    await service.deleteWebsite(orgId, req.params.whatsappSettingsId, req.params.id);
  },
);

export const syncWebsitesHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.syncWebsites(orgId, req.params.whatsappSettingsId),
);

// ---- skills ----
export const listSkillsHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.listSkills(orgId, req.params.whatsappSettingsId),
);

export const createSkillHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: SkillBody }>
>((req, orgId) => service.createSkill(orgId, req.params.whatsappSettingsId, req.body));

export const updateSkillHandler = wrap<FastifyRequest<{ Params: ByIdParams; Body: SkillBody }>>(
  (req, orgId) =>
    service.updateSkill(orgId, req.params.whatsappSettingsId, req.params.id, req.body),
);

export const deleteSkillHandler = wrap<FastifyRequest<{ Params: ByIdParams }>>(
  async (req, orgId) => {
    await service.deleteSkill(orgId, req.params.whatsappSettingsId, req.params.id);
  },
);

export const syncSkillsHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.syncSkills(orgId, req.params.whatsappSettingsId),
);

// ---- ui skills ----
export const listUiSkillsHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.listUiSkills(orgId, req.params.whatsappSettingsId),
);

export const createUiSkillHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: UiSkillBody }>
>((req, orgId) => service.createUiSkill(orgId, req.params.whatsappSettingsId, req.body));

export const updateUiSkillHandler = wrap<
  FastifyRequest<{ Params: ByIdParams; Body: UiSkillUpdateBody }>
>((req, orgId) =>
  service.updateUiSkill(orgId, req.params.whatsappSettingsId, req.params.id, req.body),
);

export const deleteUiSkillHandler = wrap<FastifyRequest<{ Params: ByIdParams }>>(
  async (req, orgId) => {
    await service.deleteUiSkill(orgId, req.params.whatsappSettingsId, req.params.id);
  },
);

export const syncUiSkillsHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.syncUiSkills(orgId, req.params.whatsappSettingsId),
);

// ---- connectors ----
export const listConnectorsHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.listConnectors(orgId, req.params.whatsappSettingsId),
);

export const createConnectorHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: ConnectorBody }>
>((req, orgId) => service.createConnector(orgId, req.params.whatsappSettingsId, req.body));

export const updateConnectorHandler = wrap<
  FastifyRequest<{ Params: ByIdParams; Body: ConnectorBody }>
>((req, orgId) =>
  service.updateConnector(orgId, req.params.whatsappSettingsId, req.params.id, req.body),
);

export const deleteConnectorHandler = wrap<FastifyRequest<{ Params: ByIdParams }>>(
  async (req, orgId) => {
    await service.deleteConnector(orgId, req.params.whatsappSettingsId, req.params.id);
  },
);

export const getConnectorLogsHandler = wrap<
  FastifyRequest<{ Params: ByIdParams; Querystring: ConnectorLogsQuery }>
>((req, orgId) =>
  service.getConnectorLogs(orgId, req.params.whatsappSettingsId, req.params.id, req.query),
);

export const upsertConnectorApiKeyHandler = wrap<
  FastifyRequest<{ Params: ByIdParams; Body: UpsertApiKeyBody }>
>((req, orgId) =>
  service.upsertConnectorApiKey(orgId, req.params.whatsappSettingsId, req.params.id, req.body),
);

export const upsertConnectorOAuthHandler = wrap<
  FastifyRequest<{ Params: ByIdParams; Body: UpsertOAuthBody }>
>((req, orgId) =>
  service.upsertConnectorOAuth(orgId, req.params.whatsappSettingsId, req.params.id, req.body),
);

export const upsertConnectorCertificateHandler = wrap<
  FastifyRequest<{ Params: ByIdParams; Body: UpsertCertificateBody }>
>((req, orgId) =>
  service.upsertConnectorCertificate(orgId, req.params.whatsappSettingsId, req.params.id, req.body),
);

export const syncConnectorsHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.syncConnectors(orgId, req.params.whatsappSettingsId),
);

// ---- connector tools ----
export const listConnectorToolsHandler = wrap<FastifyRequest<{ Params: ByConnectorIdParams }>>(
  (req, orgId) =>
    service.listConnectorTools(orgId, req.params.whatsappSettingsId, req.params.connectorId),
);

export const createConnectorToolHandler = wrap<
  FastifyRequest<{ Params: ByConnectorIdParams; Body: ConnectorToolBody }>
>((req, orgId) =>
  service.createConnectorTool(
    orgId,
    req.params.whatsappSettingsId,
    req.params.connectorId,
    req.body,
  ),
);

export const updateConnectorToolHandler = wrap<
  FastifyRequest<{ Params: ByConnectorToolIdParams; Body: ConnectorToolBody }>
>((req, orgId) =>
  service.updateConnectorTool(
    orgId,
    req.params.whatsappSettingsId,
    req.params.connectorId,
    req.params.toolId,
    req.body,
  ),
);

export const deleteConnectorToolHandler = wrap<FastifyRequest<{ Params: ByConnectorToolIdParams }>>(
  async (req, orgId) => {
    await service.deleteConnectorTool(
      orgId,
      req.params.whatsappSettingsId,
      req.params.connectorId,
      req.params.toolId,
    );
  },
);

export const runConnectorToolHandler = wrap<
  FastifyRequest<{ Params: ByConnectorToolIdParams; Body: ConnectorToolRunBody }>
>((req, orgId) =>
  service.runConnectorTool(
    orgId,
    req.params.whatsappSettingsId,
    req.params.connectorId,
    req.params.toolId,
    req.body?.input,
  ),
);

export const syncConnectorToolsHandler = wrap<FastifyRequest<{ Params: ByConnectorIdParams }>>(
  (req, orgId) =>
    service.syncConnectorTools(orgId, req.params.whatsappSettingsId, req.params.connectorId),
);

// ---- operate: eval ----
export const listEvalCasesHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.listEvalCases(orgId, req.params.whatsappSettingsId),
);

export const submitEvalRunHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: EvalRunBody }>
>((req, orgId) => service.submitEvalRun(orgId, req.params.whatsappSettingsId, req.body));

export const getEvalRunStatusHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Querystring: EvalRunQuery }>
>((req, orgId) => service.getEvalRunStatus(orgId, req.params.whatsappSettingsId, req.query.job_id));

export const getEvalDetailsHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Querystring: EvalDetailsQuery }>
>((req, orgId) => service.getEvalDetails(orgId, req.params.whatsappSettingsId, req.query.eval_ids));

export const getEvalSummaryHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Querystring: EvalSummaryQuery }>
>((req, orgId) =>
  service.getEvalSummary(orgId, req.params.whatsappSettingsId, req.query.summary_ids),
);

// ---- operate: event ----
export const submitAgentEventHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: AgentEventBody }>
>((req, orgId) => service.submitAgentEvent(orgId, req.params.whatsappSettingsId, req.body));

export const getAgentEventStatusHandler = wrap<
  FastifyRequest<{ Params: { whatsappSettingsId: string; agentEventId: string } }>
>((req, orgId) =>
  service.getAgentEventStatus(orgId, req.params.whatsappSettingsId, req.params.agentEventId),
);

// ---- operate: test ----
export const testAgentHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: AgentTestBody }>
>((req, orgId) => service.testAgent(orgId, req.params.whatsappSettingsId, req.body));

export const updateInboxSettingsHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: AgentInboxSettingsBody }>
>((req, orgId) => service.updateInboxSettings(orgId, req.params.whatsappSettingsId, req.body));

// ---- operate: thread control ----
export const setThreadControlHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: ThreadControlBody }>
>((req, orgId) => service.setThreadControl(orgId, req.params.whatsappSettingsId, req.body));

// ---- configure: budget ----
export const getAgentBudgetsHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.getAgentBudgets(orgId, req.params.whatsappSettingsId),
);

export const updateAgentBudgetsHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: AgentBudgetsBody }>
>((req, orgId) => service.updateAgentBudgets(orgId, req.params.whatsappSettingsId, req.body));

export const syncAgentBudgetsHandler = wrap<FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>>(
  (req, orgId) => service.syncAgentBudgets(orgId, req.params.whatsappSettingsId),
);

// ---- insights ----
export const getConversationInsightsHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Querystring: ConversationInsightsQuery }>
>((req, orgId) => service.getConversationInsights(orgId, req.params.whatsappSettingsId, req.query));

export const getToolCallInsightsHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Querystring: ToolCallInsightsQuery }>
>((req, orgId) => service.getToolCallInsights(orgId, req.params.whatsappSettingsId, req.query));

export const getAgentEventInsightsHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Querystring: AgentEventInsightsQuery }>
>((req, orgId) => service.getAgentEventInsights(orgId, req.params.whatsappSettingsId, req.query));

export const getConversationTurnsHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Querystring: ConversationTurnsQuery }>
>((req, orgId) => service.getConversationTurns(orgId, req.params.whatsappSettingsId, req.query));

// ---- configure: built-in RateUp connector ----
export const getRateupConnectorHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>
>((req, orgId) => rateupConnector.getRateupConnector(orgId, req.params.whatsappSettingsId));

export const installRateupConnectorHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams; Body: InstallRateupConnectorBody }>
>((req, orgId) =>
  rateupConnector.installRateupConnector(orgId, req.params.whatsappSettingsId, req.body.tools),
);

export const uninstallRateupConnectorHandler = wrap<
  FastifyRequest<{ Params: ByWhatsappSettingsIdParams }>
>((req, orgId) => rateupConnector.uninstallRateupConnector(orgId, req.params.whatsappSettingsId));
