import { axiosClient } from "../apiClient";

const BASE_URL = "/meta-agent";
const base = (waSettingsId: string) => `${BASE_URL}/${waSettingsId}`;

export type MetaAgentChannel =
  | "email"
  | "instagram"
  | "line"
  | "messenger"
  | "sms"
  | "tiktok"
  | "unknown"
  | "webchat"
  | "whatsapp";

export interface MetaBusinessAgent {
  id: string;
  orgId: string;
  whatsappSettingsId: string;
  agentId?: string | null;
  channel: MetaAgentChannel;
  isEligible?: boolean | null;
  eligibilityCheckedAt?: string | null;
  status: "NOT_ONBOARDED" | "ONBOARDED" | "DISABLED";
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

export const onboardAgent = async (
  waSettingsId: string,
  { channel = "whatsapp", catalogId }: { channel?: MetaAgentChannel; catalogId?: string } = {},
) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/onboarding`, {
    channel,
    ...(catalogId ? { catalog_id: catalogId } : {}),
  });
  return res.data as MetaBusinessAgent;
};

export const deleteAgent = async (waSettingsId: string) => {
  const res = await axiosClient.delete(`${base(waSettingsId)}/agent`);
  return res.data as { deletedAgentId: string | null };
};

// ---- allowlist ----
/** Meta's cap on a WhatsApp number's allowlist. */
export const ALLOWLIST_MAX_ENTRIES = 20;

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
/** The eight intervals Meta accepts; 0 turns follow-ups off. */
export const FOLLOWUP_INTERVALS = [0, 300, 900, 1800, 3600, 7200, 28800, 86400] as const;
export type FollowupInterval = (typeof FOLLOWUP_INTERVALS)[number];

/**
 * Where the customer-facing handoff line comes from: Meta's fixed line, one the
 * agent writes per conversation, or the business's own `message`.
 */
export type HandoffMessageSelection = "DEFAULT" | "AGENT" | "CUSTOM";

export interface AgentSettings {
  rollout?: { enabled?: boolean };
  /** `enabled`: the agent releases thread control after its handoff message. */
  handoff?: { enabled?: boolean; message?: string; message_selection?: HandoffMessageSelection };
  followup?: { enabled?: boolean; followup_interval_in_seconds?: number; message?: string };
  ai_audience?: "EVERYONE" | "ALLOWLISTED_ONLY";
  never_say_phrases?: string[];
  settingsSyncedAt?: string | null;
  /** Rateup-only: hand the thread back to Meta AI when a ticket closes. */
  releaseOnTicketClose?: boolean;
}

export const getAgentSettings = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/settings`);
  return res.data as AgentSettings;
};

export const updateAgentSettings = async (waSettingsId: string, data: Partial<AgentSettings>) => {
  const res = await axiosClient.put(`${base(waSettingsId)}/settings`, data);
  return res.data as AgentSettings;
};

/** Rateup-side behaviour only — this never reaches Meta. */
export const updateAgentInboxSettings = async (
  waSettingsId: string,
  data: { releaseOnTicketClose: boolean },
) => {
  const res = await axiosClient.put(`${base(waSettingsId)}/settings/inbox`, data);
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

export const deleteBusinessInfo = async (waSettingsId: string) => {
  await axiosClient.delete(`${base(waSettingsId)}/knowledge/business-info`);
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

export type FaqInput = Pick<Faq, "question" | "answer">;

export const listFaqs = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/knowledge/faqs`);
  return res.data as Faq[];
};

export const createFaq = async (waSettingsId: string, data: FaqInput) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/knowledge/faqs`, data);
  return res.data as Faq;
};

export const updateFaq = async (waSettingsId: string, faqId: string, data: FaqInput) => {
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
/** Meta's documented cap and accepted types. */
export const KNOWLEDGE_FILE_MAX_BYTES = 100_000_000;
export const KNOWLEDGE_FILE_ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.xlsx";

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
export type CrawlStatus =
  | "not_started"
  | "pending"
  | "in_progress"
  | "completed"
  /** The crawl worked but the site had nothing Meta could extract. */
  | "completed_no_data"
  | "failed";

export interface KnowledgeWebsite {
  id: string;
  metaId?: string | null;
  url: string;
  crawlStatus?: CrawlStatus | null;
  /** Meta's reason, when crawlStatus is failed. */
  crawlError?: string | null;
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

export const updateWebsite = async (waSettingsId: string, websiteId: string, url: string) => {
  const res = await axiosClient.put(`${base(waSettingsId)}/knowledge/websites/${websiteId}`, {
    url,
  });
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
/** Meta's automated content review. A blocked skill is kept but never applied. */
export type SkillReviewStatus = "active" | "pending_review" | "blocked";

export interface Skill {
  id: string;
  metaId?: string | null;
  title: string;
  description: string;
  skill: string;
  channel?: string | null;
  status?: SkillReviewStatus | null;
  createdAt: string;
}

export type SkillInput = Pick<Skill, "title" | "description" | "skill">;

export const listSkills = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/skills`);
  return res.data as Skill[];
};

export const createSkill = async (waSettingsId: string, data: SkillInput) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/skills`, data);
  return res.data as Skill;
};

export const updateSkill = async (waSettingsId: string, skillId: string, data: SkillInput) => {
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

// ---- ui skills ----
export const UI_SKILL_COMPONENT_TYPES = [
  "carousel_quick_reply",
  "carousel_url",
  "cta_url",
  "flow",
  "image",
  "interactive_list",
  "interactive_reply_buttons",
  "location",
  "location_request",
] as const;
export type UiSkillComponentType = (typeof UI_SKILL_COMPONENT_TYPES)[number];

export interface UiSkill {
  id: string;
  metaId?: string | null;
  title: string;
  componentType: UiSkillComponentType;
  status: "enabled" | "disabled";
  instruction: string;
  flowId?: string | null;
  createdAt: string;
}

export interface UiSkillInput {
  title: string;
  component_type: UiSkillComponentType;
  status: "enabled" | "disabled";
  instruction: string;
  flow_id?: string;
}

/** Meta's update endpoint takes only these three; component_type is immutable. */
export interface UiSkillUpdateInput {
  title?: string;
  status?: "enabled" | "disabled";
  instruction?: string;
}

export const listUiSkills = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/ui-skills`);
  return res.data as UiSkill[];
};

export const createUiSkill = async (waSettingsId: string, data: UiSkillInput) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/ui-skills`, data);
  return res.data as UiSkill;
};

export const updateUiSkill = async (
  waSettingsId: string,
  uiSkillId: string,
  data: UiSkillUpdateInput,
) => {
  const res = await axiosClient.put(`${base(waSettingsId)}/ui-skills/${uiSkillId}`, data);
  return res.data as UiSkill;
};

export const deleteUiSkill = async (waSettingsId: string, uiSkillId: string) => {
  await axiosClient.delete(`${base(waSettingsId)}/ui-skills/${uiSkillId}`);
};

export const syncUiSkills = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/ui-skills/sync`);
  return res.data as UiSkill[];
};

// ---- connectors ----
/** What a connector can be created with: "Currently, only" these three. */
export const CONNECTOR_AUTH_TYPES = ["NONE", "API_KEY", "OAUTH2_CLIENT_CREDENTIALS"] as const;
export type ConnectorWritableAuthType = (typeof CONNECTOR_AUTH_TYPES)[number];
/** Meta's full enum, which a connector synced from Meta may still carry. */
export type ConnectorAuthType = ConnectorWritableAuthType | "BASIC" | "OAUTH2" | "CUSTOM";
export type ConnectionStatus = "PENDING_OAUTH" | "ACTIVE" | "EXPIRED" | "ERROR";

export interface UserAuthInjectionConfig {
  location: "body" | "headers" | "path" | "query";
  field_name: string;
  prefix: string;
}

export interface MtlsConfig {
  has_certificate: boolean;
  fingerprint?: string;
  expires_at?: number;
  subject?: string;
}

export interface Connector {
  id: string;
  metaId?: string | null;
  name: string;
  description: string;
  baseUrl: string;
  authType: ConnectorAuthType;
  requiresCertificate: boolean;
  connectionStatus: ConnectionStatus;
  connectionError?: string | null;
  userAuthInjectionConfig?: UserAuthInjectionConfig | null;
  mtlsConfig?: MtlsConfig | null;
  /** "rateup" on the connector RateUp installs for itself; managed, not hand-edited. */
  builtIn?: string | null;
  createdAt: string;
  _count?: { tools: number };
}

export interface ConnectorInput {
  name: string;
  description: string;
  base_url: string;
  auth_type: ConnectorWritableAuthType;
  user_auth_injection_config?: UserAuthInjectionConfig;
  requires_certificate?: boolean;
}

export const listConnectors = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/connectors`);
  return res.data as Connector[];
};

export const createConnector = async (waSettingsId: string, data: ConnectorInput) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/connectors`, data);
  return res.data as Connector;
};

export const updateConnector = async (
  waSettingsId: string,
  connectorId: string,
  data: ConnectorInput,
) => {
  const res = await axiosClient.put(`${base(waSettingsId)}/connectors/${connectorId}`, data);
  return res.data as Connector;
};

export const deleteConnector = async (waSettingsId: string, connectorId: string) => {
  await axiosClient.delete(`${base(waSettingsId)}/connectors/${connectorId}`);
};

export const syncConnectors = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/connectors/sync`);
  return res.data as Connector[];
};

/** One API-key field Meta injects, e.g. `Authorization: Bearer <value>`. */
export interface ApiKeyParam {
  field_name: string;
  value: string;
  prefix?: string;
}

export interface ApiKeyConfig {
  headers?: ApiKeyParam[];
  query_params?: ApiKeyParam[];
  body_params?: ApiKeyParam[];
}

export const upsertConnectorApiKey = async (
  waSettingsId: string,
  connectorId: string,
  apiKeyConfig: ApiKeyConfig,
) => {
  const res = await axiosClient.post(
    `${base(waSettingsId)}/connectors/${connectorId}/upsertApiKey`,
    { api_key_config: apiKeyConfig },
  );
  return res.data as Connector;
};

export interface OAuthConfig {
  token_url: string;
  scopes_to_request: string[];
  client_id: string;
  client_secret: string;
  token_request_content_type?: "application/x-www-form-urlencoded" | "application/json";
}

export const upsertConnectorOAuth = async (
  waSettingsId: string,
  connectorId: string,
  oauthConfig: OAuthConfig,
) => {
  const res = await axiosClient.post(
    `${base(waSettingsId)}/connectors/${connectorId}/upsertOAuth`,
    {
      oauth_config: oauthConfig,
    },
  );
  return res.data as Connector;
};

export interface CertificateInput {
  client_certificate: string;
  client_key: string;
  ca_certificate?: string;
}

export const upsertConnectorCertificate = async (
  waSettingsId: string,
  connectorId: string,
  data: CertificateInput,
) => {
  const res = await axiosClient.post(
    `${base(waSettingsId)}/connectors/${connectorId}/upsertCertificate`,
    data,
  );
  return res.data as Connector;
};

export interface ConnectorLogsQuery {
  start_time?: number;
  end_time?: number;
  limit?: number;
  tool_id?: string;
  include_stats?: boolean;
  summary_only?: boolean;
  top_n?: number;
}

export interface ConnectorLogEntry {
  event_time?: string;
  failure_code_name?: string;
  error_message?: string;
  tool_name?: string;
  occurrences?: number;
  last_seen?: string;
}

export interface ConnectorLogStats {
  start_count: number;
  success_count: number;
  exception_count: number;
  success_rate: number;
  avg_latency_s: number;
  p95_latency_s: number;
  p99_latency_s: number;
  time_window_seconds: number;
}

export const getConnectorLogs = async (
  waSettingsId: string,
  connectorId: string,
  query: ConnectorLogsQuery = {},
) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/connectors/${connectorId}/logs`, {
    params: query,
  });
  return res.data as { data: ConnectorLogEntry[]; stats?: ConnectorLogStats };
};

// ---- the built-in RateUp connector ----
export const RATEUP_CONNECTOR_TOOLS = [
  {
    name: "get_loyalty_status",
    group: "loyalty",
    label: "Loyalty status",
    blurb: "Points balance, tier, rewards they can afford and vouchers ready to use.",
  },
  {
    name: "list_loyalty_rewards",
    group: "loyalty",
    label: "Reward catalogue",
    blurb: "Every reward and its points cost, even for someone who has not joined.",
  },
  {
    name: "get_crm_options",
    group: "crm",
    label: "CRM options",
    blurb: "Your labels, lead stages and teams, so the agent uses names that exist.",
  },
  {
    name: "add_contact_label",
    group: "crm",
    label: "Add a label",
    blurb: "Tag the customer with one of your existing labels.",
  },
  {
    name: "set_lead_stage",
    group: "crm",
    label: "Move lead stage",
    blurb: "Move the customer to a stage on your lead board.",
  },
  {
    name: "assign_to_team",
    group: "crm",
    label: "Route to a team",
    blurb: "Send the conversation to the right team before a handoff.",
  },
] as const;
export type RateupConnectorToolName = (typeof RATEUP_CONNECTOR_TOOLS)[number]["name"];

export type RateupConnectorState =
  | { installed: false; tools: string[] }
  | {
      installed: true;
      connectorId: string;
      connectionStatus: ConnectionStatus;
      tools: string[];
    };

export const getRateupConnector = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/rateup-connector`);
  return res.data as RateupConnectorState;
};

/** Installs, or reinstalls with a fresh key and exactly these tools. */
export const installRateupConnector = async (
  waSettingsId: string,
  tools: RateupConnectorToolName[],
) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/rateup-connector`, { tools });
  return res.data as RateupConnectorState;
};

export const uninstallRateupConnector = async (waSettingsId: string) => {
  const res = await axiosClient.delete(`${base(waSettingsId)}/rateup-connector`);
  return res.data as RateupConnectorState;
};

// ---- connector tools ----
export type ToolMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/** Values Meta fills in from the conversation when the tool is called. */
export const BINDING_MACROS = [
  "WHATSAPP_PHONE_NUMBER",
  "WHATSAPP_PHONE_NUMBER_NATIONAL",
  "WHATSAPP_BSUID",
  "WHATSAPP_IDENTITY_HASH",
  "WHATSAPP_CURRENT_STATUS_ID",
  "WHATSAPP_CONVERSATION_ID",
  "WHATSAPP_MESSAGE_ID",
  "USER_MESSAGE",
  "INSTAGRAM_IGSID",
  "INSTAGRAM_CONVERSATION_ID",
] as const;
export type BindingMacro = (typeof BINDING_MACROS)[number];

export interface ParameterBinding {
  kind: "default" | "macro";
  value?: string;
  macro?: BindingMacro;
}

export interface ParameterNode {
  type: "string" | "integer" | "number" | "boolean";
  description?: string;
  required?: boolean;
  binding?: ParameterBinding;
}

export interface BodyNode {
  type: "object" | "array" | "string" | "integer" | "number" | "boolean";
  description?: string;
  required?: string[];
  properties?: Record<string, BodyNode>;
  items?: BodyNode;
  binding?: ParameterBinding;
}

export interface RequestDefinition {
  method: ToolMethod;
  path: string;
  path_parameters?: Record<string, ParameterNode>;
  query_parameters?: Record<string, ParameterNode>;
  headers?: Record<string, ParameterNode>;
  body?: {
    content_type: "application/json";
    params: Record<string, BodyNode>;
    required?: string[];
  };
}

export interface UserAuthActionConfig {
  user_action_tool_type: "auth" | "refresh";
  user_auth_token_path: string;
  refresh_token_path?: string;
  expires_at_path?: string;
  expires_at_type?: "absolute" | "relative_seconds";
}

export interface ConnectorTool {
  id: string;
  metaId?: string | null;
  name: string;
  description: string;
  requestDefinition: RequestDefinition;
  userAuthRequired: boolean;
  userAuthActionConfig?: UserAuthActionConfig | null;
  createdAt: string;
}

export interface ConnectorToolInput {
  name: string;
  description: string;
  request_definition: RequestDefinition;
  user_auth_required: boolean;
  user_auth_action_config?: UserAuthActionConfig;
}

export const listConnectorTools = async (waSettingsId: string, connectorId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/connectors/${connectorId}/tools`);
  return res.data as ConnectorTool[];
};

export const createConnectorTool = async (
  waSettingsId: string,
  connectorId: string,
  data: ConnectorToolInput,
) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/connectors/${connectorId}/tools`, data);
  return res.data as ConnectorTool;
};

export const updateConnectorTool = async (
  waSettingsId: string,
  connectorId: string,
  toolId: string,
  data: ConnectorToolInput,
) => {
  const res = await axiosClient.put(
    `${base(waSettingsId)}/connectors/${connectorId}/tools/${toolId}`,
    data,
  );
  return res.data as ConnectorTool;
};

export const deleteConnectorTool = async (
  waSettingsId: string,
  connectorId: string,
  toolId: string,
) => {
  await axiosClient.delete(`${base(waSettingsId)}/connectors/${connectorId}/tools/${toolId}`);
};

/** Meta takes the run input as an opaque JSON string. */
export const runConnectorTool = async (
  waSettingsId: string,
  connectorId: string,
  toolId: string,
  input?: string,
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
export interface EvalCase {
  id: string;
  scenario: string;
  categories?: string[];
  max_turns?: number;
  success_criteria?: string[];
  /** The published scenario suite a case came from; null on older cases. */
  scenario_version?: string | null;
}

export interface EvalRunResult {
  summary_id: string;
  avg_conversation_score?: number | null;
  avg_turn_score?: number | null;
  summary: string;
  highlights?: string;
  top_failure_categories?: string;
  eval_ids_by_score?: string;
}

export const listEvalCases = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/eval/cases`);
  return res.data as { eval_cases: EvalCase[] };
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
    result?: EvalRunResult;
    error?: { code: string; message: string; failed_case_ids?: string[] };
  };
};

export interface EvalDetail {
  id: string;
  score?: number;
  per_turn_labels: string;
  reasons: string;
  custom_success_criteria?: string;
  eval_case_id?: string;
  transcript?: string;
  creation_time: number;
  update_time: number;
}

export const getEvalDetails = async (waSettingsId: string, evalIds: string[]) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/eval/details`, {
    params: { eval_ids: evalIds.join(",") },
  });
  return res.data as { evaluations: EvalDetail[] };
};

export const getEvalSummary = async (waSettingsId: string, summaryIds: string[]) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/eval/summary`, {
    params: { summary_ids: summaryIds.join(",") },
  });
  return res.data as { insights: (EvalRunResult & { id: string })[] };
};

// ---- operate: events ----
export interface AgentEventInput {
  to: string;
  event: { type: string; description: string; payload: string };
}

export const submitAgentEvent = async (waSettingsId: string, data: AgentEventInput) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/events`, data);
  return res.data as { status: string; agent_event_id?: string };
};

export const getAgentEventStatus = async (waSettingsId: string, eventId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/events/${eventId}`);
  return res.data as {
    status: "request_received" | "processing" | "sent" | "failed" | "skipped" | "success";
    event_type: string;
    error_message?: string;
    skipped_reason?: string;
    created_at: string;
    updated_at: string;
  };
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
    timestamp?: number;
    handoff_reason?: string;
    no_response_reason?: string;
    quick_replies?: string[];
    product_variant_ids?: string[];
  };
};

// ---- operate: thread control ----
/** Both hand the thread to Meta AI: release gives control up, pass names the agent. */
export const setThreadControl = async (
  waSettingsId: string,
  action: "pass" | "release",
  to: string,
) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/thread-control`, { action, to });
  return res.data as { messaging_product: string };
};

// ---- configure: budget ----
export type BudgetUnitType = "token" | "ai_turn";
export type BudgetTimeWindow = "one_day" | "seven_days" | "fourteen_days" | "thirty_days";

export interface AgentBudget {
  /** Meta's id; absent on a cap that has not been saved yet. */
  budget_id?: string;
  unit_type: BudgetUnitType;
  time_window: BudgetTimeWindow;
  max_budget: number;
}

export interface AgentBudgets {
  budgets: AgentBudget[];
  budgetsSyncedAt?: string | null;
}

export const getAgentBudgets = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/budget`);
  return res.data as AgentBudgets;
};

/** Replaces every cap: one left out is deleted, and none at all means unlimited. */
export const updateAgentBudgets = async (waSettingsId: string, budgets: AgentBudget[]) => {
  const res = await axiosClient.put(`${base(waSettingsId)}/budget`, { budgets });
  return res.data as AgentBudgets;
};

export const syncAgentBudgets = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${base(waSettingsId)}/budget/sync`);
  return res.data as AgentBudgets;
};

// ---- insights (transient, always button-triggered) ----
export interface InsightsRange {
  /** YYYY-MM-DD, both inclusive. */
  start_date: string;
  end_date: string;
}

export interface ConversationInsights {
  /** Conversations the agent replied in during the range. */
  ai_threads?: { count: number };
  /** Handed to your team and awaiting a reply right now, whatever the range. */
  ai_handoffs?: { count: number };
}

export const getConversationInsights = async (waSettingsId: string, range: InsightsRange) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/insights/conversations`, {
    params: range,
  });
  return res.data as { data: ConversationInsights[] };
};

export interface ToolCallInsight {
  tool_name: string;
  thread_count: number;
  avg_latency_ms?: number | null;
  success_rate?: number | null;
  error_rate?: number | null;
  timeout_rate?: number | null;
}

export const getToolCallInsights = async (
  waSettingsId: string,
  query: InsightsRange & { tool_name?: string },
) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/insights/tool-calls`, {
    params: query,
  });
  return res.data as { data: ToolCallInsight[] };
};

export interface AgentEventInsight {
  event_type: string;
  received: number;
  successfully_processed: number;
  avg_e2e_latency_ms?: number | null;
}

export const getAgentEventInsights = async (
  waSettingsId: string,
  query: InsightsRange & { event_type?: string },
) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/insights/agent-events`, {
    params: query,
  });
  return res.data as { data: AgentEventInsight[]; avg_e2e_latency_ms?: number | null };
};

export interface ConversationTurnStep {
  type: "LLM_CALL" | "TOOL_CALL";
  latency_ms?: number;
  status?: "SUCCESS" | "ERROR" | "TIMEOUT";
  llm_output_preview?: string;
  tool_name?: string;
  tool_input?: string;
  tool_output?: string;
}

export interface ConversationTurn {
  turn_id: string;
  message_id?: string;
  e2e_latency_ms?: number;
  /** Milliseconds since the epoch. */
  timestamp?: number;
  conversation_id: string;
  steps: ConversationTurnStep[];
}

export const getConversationTurns = async (
  waSettingsId: string,
  query: { user: string; after?: string; limit?: number },
) => {
  const res = await axiosClient.get(`${base(waSettingsId)}/insights/turns`, { params: query });
  return res.data as {
    data: ConversationTurn[];
    paging?: { cursors?: { before?: string; after?: string }; next?: string };
  };
};
