import { axiosClient } from "../apiClient";

const BASE_URL = "/meta-agent";
const base = (waSettingsId: string) => `${BASE_URL}/${waSettingsId}`;

export interface MetaBusinessAgent {
  id: string;
  orgId: string;
  whatsappSettingsId: string;
  agentId?: string | null;
  channel: string;
  isEligible?: boolean | null;
  eligibilityCheckedAt?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const getMetaBusinessAgent = async (waSettingsId: string) => {
  const res = await axiosClient.get(base(waSettingsId));
  return res.data as MetaBusinessAgent;
};

// ---- onboard (always explicit actions) ----
export const checkAgentEligibility = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/eligibility/check`);
  return res.data as MetaBusinessAgent;
};

export const onboardAgent = async (waSettingsId: string, channel = "whatsapp") => {
  const res = await axiosClient.post(`${base(waSettingsId)}/onboarding`, { channel });
  return res.data as MetaBusinessAgent;
};

// ---- allowlist ----
export interface AllowlistEntry {
  id: string;
  metaId?: string | null;
  consumerPhoneNumber: string;
  createdAt: string;
}

export const listAllowlist = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/allowlist`);
  return res.data as AllowlistEntry[];
};

export const addAllowlistEntry = async (waSettingsId: string, consumerPhoneNumber: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/allowlist`, {
    consumer_phone_number: consumerPhoneNumber,
  });
  return res.data as AllowlistEntry;
};

export const removeAllowlistEntry = async (waSettingsId: string, id: string) => {
  await axiosClient.delete(`${base(waSettingsId)}/allowlist/${id}`);
};

export const syncAllowlist = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/allowlist/sync`);
  return res.data as AllowlistEntry[];
};

// ---- agent settings ----
export interface AgentSettings {
  rollout?: { enabled?: boolean };
  handoff?: { enabled?: boolean; message?: string };
  followup?: { enabled?: boolean; followup_interval_in_seconds?: number; message?: string };
  ai_audience?: "EVERYONE" | "ALLOWLISTED_ONLY";
  settingsSyncedAt?: string | null;
}

export const getAgentSettings = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/settings`);
  return res.data as AgentSettings;
};

export const updateAgentSettings = async (waSettingsId: string, data: Partial<AgentSettings>) => {
  const res = await axiosClient.put(`${base(waSettingsId)}/settings`, data);
  return res.data as AgentSettings;
};

export const syncAgentSettings = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/settings/sync`);
  return res.data as AgentSettings;
};

// ---- knowledge: business info ----
export interface BusinessInfo {
  business_description?: string;
  payment_method?: string;
  return_policy?: string;
  purchase_info?: string;
  delivery_and_shipping?: string;
  contact_info?: { email?: string; address?: string; hours_of_operation?: string };
  businessInfoSyncedAt?: string | null;
}

export const getBusinessInfo = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/knowledge/business-info`);
  return res.data as BusinessInfo;
};

export const updateBusinessInfo = async (waSettingsId: string, data: BusinessInfo) => {
  const res = await axiosClient.put(`${base(waSettingsId)}/knowledge/business-info`, data);
  return res.data as BusinessInfo;
};

export const syncBusinessInfo = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/knowledge/business-info/sync`);
  return res.data as BusinessInfo;
};

// ---- knowledge: faqs ----
export interface Faq {
  id: string;
  metaId?: string | null;
  question: string;
  answer: string;
  metadata?: Record<string, string> | null;
  createdAt: string;
}

export const listFaqs = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/knowledge/faqs`);
  return res.data as Faq[];
};

export const createFaq = async (waSettingsId: string, data: Pick<Faq, "question" | "answer">) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/knowledge/faqs`, data);
  return res.data as Faq;
};

export const updateFaq = async (
  waSettingsId: string,
  faqId: string,
  data: Pick<Faq, "question" | "answer">,
) => {
  const res = await axiosClient.put(`${base(waSettingsId)}/knowledge/faqs/${faqId}`, data);
  return res.data as Faq;
};

export const deleteFaq = async (waSettingsId: string, faqId: string) => {
  await axiosClient.delete(`${base(waSettingsId)}/knowledge/faqs/${faqId}`);
};

export const syncFaqs = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/knowledge/faqs/sync`);
  return res.data as Faq[];
};

// ---- knowledge: files ----
export interface KnowledgeFile {
  id: string;
  metaId?: string | null;
  fileName: string;
  createdAt: string;
}

export const listFiles = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/knowledge/files`);
  return res.data as KnowledgeFile[];
};

export const uploadFile = async (waSettingsId: string, file: File) => {
  const form = new FormData();
  form.append("file_name", file.name);
  form.append("file", file);
  const res = await axiosClient.post(`${base(waSettingsId)}/knowledge/files`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as KnowledgeFile;
};

export const deleteFile = async (waSettingsId: string, fileId: string) => {
  await axiosClient.delete(`${base(waSettingsId)}/knowledge/files/${fileId}`);
};

export const syncFiles = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/knowledge/files/sync`);
  return res.data as KnowledgeFile[];
};

// ---- knowledge: websites ----
export interface KnowledgeWebsite {
  id: string;
  metaId?: string | null;
  url: string;
  crawlStatus?: "pending" | "in_progress" | "completed" | "failed" | null;
  pagesCrawled?: number | null;
  lastCrawledAt?: string | null;
  createdAt: string;
}

export const listWebsites = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/knowledge/websites`);
  return res.data as KnowledgeWebsite[];
};

export const createWebsite = async (waSettingsId: string, url: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/knowledge/websites`, { url });
  return res.data as KnowledgeWebsite;
};

export const deleteWebsite = async (waSettingsId: string, websiteId: string) => {
  await axiosClient.delete(`${base(waSettingsId)}/knowledge/websites/${websiteId}`);
};

export const syncWebsites = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/knowledge/websites/sync`);
  return res.data as KnowledgeWebsite[];
};

// ---- skills ----
export interface Skill {
  id: string;
  metaId?: string | null;
  title: string;
  description: string;
  skill: string;
  createdAt: string;
}

export const listSkills = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/skills`);
  return res.data as Skill[];
};

export const createSkill = async (
  waSettingsId: string,
  data: Pick<Skill, "title" | "description" | "skill">,
) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/skills`, data);
  return res.data as Skill;
};

export const updateSkill = async (
  waSettingsId: string,
  skillId: string,
  data: Pick<Skill, "title" | "description" | "skill">,
) => {
  const res = await axiosClient.put(`${base(waSettingsId)}/skills/${skillId}`, data);
  return res.data as Skill;
};

export const deleteSkill = async (waSettingsId: string, skillId: string) => {
  await axiosClient.delete(`${base(waSettingsId)}/skills/${skillId}`);
};

export const syncSkills = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/skills/sync`);
  return res.data as Skill[];
};

// ---- connectors ----
export interface Connector {
  id: string;
  metaId?: string | null;
  name: string;
  description: string;
  baseUrl: string;
  authType: "OAUTH2_CLIENT_CREDENTIALS" | "API_KEY" | "NONE";
  requiresCertificate?: boolean;
  connectionStatus?: "PENDING_OAUTH" | "ACTIVE" | "EXPIRED" | "ERROR";
  createdAt: string;
}

export const listConnectors = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/connectors`);
  return res.data as Connector[];
};

export const createConnector = async (
  waSettingsId: string,
  data: {
    name: string;
    description: string;
    base_url: string;
    auth_type: Connector["authType"];
    requires_certificate?: boolean;
  },
) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/connectors`, data);
  return res.data as Connector;
};

export const deleteConnector = async (waSettingsId: string, connectorId: string) => {
  await axiosClient.delete(`${base(waSettingsId)}/connectors/${connectorId}`);
};

export const syncConnectors = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/connectors/sync`);
  return res.data as Connector[];
};

export const upsertConnectorApiKey = async (
  waSettingsId: string,
  connectorId: string,
  apiKey: string,
) => {
  const res = await axiosClient.post(
    `${base(waSettingsId)}/connectors/${connectorId}/upsertApiKey`,
    {
      api_key: apiKey,
    },
  );
  return res.data as Connector;
};

export const upsertConnectorOAuth = async (
  waSettingsId: string,
  connectorId: string,
  data: { client_id: string; client_secret: string; token_url?: string },
) => {
  const res = await axiosClient.post(
    `${base(waSettingsId)}/connectors/${connectorId}/upsertOAuth`,
    data,
  );
  return res.data as Connector;
};

// ---- connector tools ----
export interface ConnectorTool {
  id: string;
  metaId?: string | null;
  name: string;
  description: string;
  requestDefinition: Record<string, unknown>;
  userAuthRequired?: boolean;
  createdAt: string;
}

export const listConnectorTools = async (waSettingsId: string, connectorId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/connectors/${connectorId}/tools`);
  return res.data as ConnectorTool[];
};

export const createConnectorTool = async (
  waSettingsId: string,
  connectorId: string,
  data: { name: string; description: string; request_definition: Record<string, unknown> },
) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/connectors/${connectorId}/tools`, data);
  return res.data as ConnectorTool;
};

export const deleteConnectorTool = async (
  waSettingsId: string,
  connectorId: string,
  toolId: string,
) => {
  await axiosClient.delete(`${base(waSettingsId)}/connectors/${connectorId}/tools/${toolId}`);
};

export const runConnectorTool = async (
  waSettingsId: string,
  connectorId: string,
  toolId: string,
  input?: Record<string, unknown>,
) => {
  const res = await axiosClient.post(
    `${base(waSettingsId)}/connectors/${connectorId}/tools/${toolId}/run`,
    { input },
  );
  return res.data as { output: string; status: "success" | "error" };
};

export const syncConnectorTools = async (waSettingsId: string, connectorId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/connectors/${connectorId}/tools/sync`);
  return res.data as ConnectorTool[];
};

// ---- operate: eval (transient, always button-triggered) ----
export const listEvalCases = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/eval/cases`);
  return res.data;
};

export const submitEvalRun = async (waSettingsId: string, evalCaseIds: string[]) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/eval/run`, {
    eval_case_ids: evalCaseIds,
  });
  return res.data as { job_id: string; status: string };
};

export const getEvalRunStatus = async (waSettingsId: string, jobId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/eval/run`, {
    params: { job_id: jobId },
  });
  return res.data as {
    status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
    progress?: { completed: number; total: number; current_stage: string };
    result?: unknown;
    error?: { code: string; message: string };
  };
};

// ---- operate: events ----
export const submitAgentEvent = async (
  waSettingsId: string,
  data: { to: string; event: { type: string; description: string; payload: string } },
) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/events`, data);
  return res.data as { status: string; agent_event_id?: string };
};

export const getAgentEventStatus = async (waSettingsId: string, eventId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/events/${eventId}`);
  return res.data;
};

// ---- operate: test ----
export const testAgent = async (
  waSettingsId: string,
  user_msg: string,
  conversation_id?: string,
) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/test`, { user_msg, conversation_id });
  return res.data as {
    message_id: string;
    agent_response: string;
    conversation_id: string;
    handoff_reason?: string;
    no_response_reason?: string;
    quick_replies?: string[];
  };
};

// ---- operate: thread control ----
export const setThreadControl = async (
  waSettingsId: string,
  action: "pass" | "release",
  to: string,
) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/thread-control`, { action, to });
  return res.data;
};
