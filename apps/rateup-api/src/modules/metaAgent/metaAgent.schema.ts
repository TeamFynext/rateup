import { z } from "zod";

export const channelEnum = z.enum([
  "email",
  "instagram",
  "line",
  "messenger",
  "sms",
  "tiktok",
  "unknown",
  "webchat",
  "whatsapp",
]);

// ---- shared params ----
export const byWhatsappSettingsIdParamSchema = z.object({
  whatsappSettingsId: z.string(),
});
export type ByWhatsappSettingsIdParams = z.infer<typeof byWhatsappSettingsIdParamSchema>;

export const byIdParamSchema = z.object({
  whatsappSettingsId: z.string(),
  id: z.string(),
});
export type ByIdParams = z.infer<typeof byIdParamSchema>;

// ---- onboarding ----
export const onboardingBodySchema = z.object({
  channel: channelEnum.default("whatsapp"),
});
export type OnboardingBody = z.infer<typeof onboardingBodySchema>;

export const allowlistEntryBodySchema = z.object({
  consumer_phone_number: z.string(),
});
export type AllowlistEntryBody = z.infer<typeof allowlistEntryBodySchema>;

export const agentSettingsBodySchema = z.object({
  rollout: z.object({ enabled: z.boolean() }).partial().optional(),
  handoff: z.object({ enabled: z.boolean(), message: z.string() }).partial().optional(),
  followup: z
    .object({
      enabled: z.boolean(),
      followup_interval_in_seconds: z.union([
        z.literal(0),
        z.literal(300),
        z.literal(900),
        z.literal(1800),
        z.literal(3600),
        z.literal(7200),
        z.literal(28800),
        z.literal(86400),
      ]),
      message: z.string(),
    })
    .partial()
    .optional(),
  ai_audience: z.enum(["EVERYONE", "ALLOWLISTED_ONLY"]).optional(),
});
export type AgentSettingsBody = z.infer<typeof agentSettingsBodySchema>;

// ---- knowledge: business info ----
export const businessInfoBodySchema = z.object({
  business_description: z.string().optional(),
  payment_method: z.string().optional(),
  return_policy: z.string().optional(),
  purchase_info: z.string().optional(),
  delivery_and_shipping: z.string().optional(),
  contact_info: z
    .object({
      email: z.string().optional(),
      address: z.string().optional(),
      hours_of_operation: z.string().optional(),
    })
    .optional(),
});
export type BusinessInfoBody = z.infer<typeof businessInfoBodySchema>;

// ---- knowledge: faqs ----
export const faqBodySchema = z.object({
  question: z.string(),
  answer: z.string(),
  metadata: z.record(z.string(), z.string()).optional(),
});
export type FaqBody = z.infer<typeof faqBodySchema>;

// ---- knowledge: websites ----
export const websiteBodySchema = z.object({
  url: z.string(),
});
export type WebsiteBody = z.infer<typeof websiteBodySchema>;

// ---- skills ----
export const skillBodySchema = z.object({
  title: z
    .string()
    .max(64)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and hyphens only"),
  description: z.string().max(1024),
  skill: z.string().max(20000),
});
export type SkillBody = z.infer<typeof skillBodySchema>;

// ---- connectors ----
export const connectorBodySchema = z.object({
  name: z.string(),
  description: z.string(),
  base_url: z.string(),
  auth_type: z.enum(["OAUTH2_CLIENT_CREDENTIALS", "API_KEY", "NONE"]),
  requires_certificate: z.boolean().optional(),
});
export type ConnectorBody = z.infer<typeof connectorBodySchema>;

export const connectorLogsQuerySchema = z.object({
  start_time: z.coerce.number().optional(),
  end_time: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(1000).optional(),
  summary_only: z.coerce.boolean().optional(),
  include_stats: z.coerce.boolean().optional(),
});
export type ConnectorLogsQuery = z.infer<typeof connectorLogsQuerySchema>;

export const upsertApiKeyBodySchema = z.object({ api_key: z.string() });
export const upsertOAuthBodySchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  token_url: z.string().optional(),
});
export const upsertCertificateBodySchema = z.object({
  certificate: z.string(),
  private_key: z.string().optional(),
});

// ---- connector tools ----
export const byConnectorIdParamSchema = z.object({
  whatsappSettingsId: z.string(),
  connectorId: z.string(),
});
export const byConnectorToolIdParamSchema = z.object({
  whatsappSettingsId: z.string(),
  connectorId: z.string(),
  toolId: z.string(),
});

export const connectorToolBodySchema = z.object({
  name: z.string(),
  description: z.string(),
  request_definition: z.record(z.string(), z.any()),
  user_auth_required: z.boolean().optional(),
});
export type ConnectorToolBody = z.infer<typeof connectorToolBodySchema>;

export const connectorToolRunBodySchema = z.object({
  input: z.record(z.string(), z.any()).optional(),
});

// ---- operate: eval ----
export const evalRunBodySchema = z.object({
  eval_case_ids: z.array(z.string()),
});
export type EvalRunBody = z.infer<typeof evalRunBodySchema>;

export const evalRunQuerySchema = z.object({ job_id: z.string() });
export const evalDetailsQuerySchema = z.object({ eval_ids: z.string() });
export const evalSummaryQuerySchema = z.object({ summary_ids: z.string() });

// ---- operate: event ----
export const agentEventBodySchema = z.object({
  to: z.string(),
  event: z.object({
    type: z.string().max(256),
    description: z.string().max(1024),
    payload: z.string().max(4096),
  }),
});
export type AgentEventBody = z.infer<typeof agentEventBodySchema>;

export const byAgentEventIdParamSchema = z.object({
  whatsappSettingsId: z.string(),
  agentEventId: z.string(),
});

// ---- operate: test ----
export const agentTestBodySchema = z.object({
  user_msg: z.string(),
  conversation_id: z.string().optional(),
});
export type AgentTestBody = z.infer<typeof agentTestBodySchema>;

// ---- operate: thread control ----
export const threadControlBodySchema = z.object({
  action: z.enum(["pass", "release"]),
  to: z.string(),
});
export type ThreadControlBody = z.infer<typeof threadControlBodySchema>;
