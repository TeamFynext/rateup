import { z } from "zod";

/**
 * Zod mirrors of the Meta Business Agent API request bodies.
 *
 * Required vs optional here tracks Meta's own reference exactly, so a payload
 * that passes validation here is one Meta will accept — a 400 from us instead
 * of a 400 from Meta, with a message that names the field. Where Meta documents
 * a length, an enum or a format, it is enforced rather than described.
 */

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
export type Channel = z.infer<typeof channelEnum>;

/** E.164, as Meta spells it out for the allowlist: `+15551234567`. */
const e164 = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Enter a phone number in E.164 format, e.g. +15551234567");

const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .url("Enter a valid URL")
  .refine((value) => value.startsWith("https://"), "URL must use https");

// ---- shared params ----
export const byWhatsappSettingsIdParamSchema = z.object({
  whatsappSettingsId: z.guid(),
});
export type ByWhatsappSettingsIdParams = z.infer<typeof byWhatsappSettingsIdParamSchema>;

export const byIdParamSchema = z.object({
  whatsappSettingsId: z.guid(),
  id: z.guid(),
});
export type ByIdParams = z.infer<typeof byIdParamSchema>;

// ---- onboard ----
export const onboardingBodySchema = z.object({
  channel: channelEnum.default("whatsapp"),
});
export type OnboardingBody = z.infer<typeof onboardingBodySchema>;

export const allowlistEntryBodySchema = z.object({
  consumer_phone_number: e164,
});
export type AllowlistEntryBody = z.infer<typeof allowlistEntryBodySchema>;

// ---- agent settings ----
/** The only intervals Meta accepts; 0 means "no follow-up". */
export const followupIntervalEnum = z.union([
  z.literal(0),
  z.literal(300),
  z.literal(900),
  z.literal(1800),
  z.literal(3600),
  z.literal(7200),
  z.literal(28800),
  z.literal(86400),
]);

export const agentSettingsBodySchema = z
  .object({
    rollout: z.object({ enabled: z.boolean() }).optional(),
    handoff: z
      .object({
        enabled: z.boolean(),
        message: z.string().trim().max(1024).optional(),
      })
      .optional(),
    followup: z
      .object({
        enabled: z.boolean(),
        followup_interval_in_seconds: followupIntervalEnum.optional(),
        message: z.string().trim().max(1024).optional(),
      })
      .optional(),
    ai_audience: z.enum(["EVERYONE", "ALLOWLISTED_ONLY"]).optional(),
    never_say_phrases: z.array(z.string().trim().min(1).max(256)).max(50).optional(),
  })
  // Meta accepts an enabled follow-up with no interval and then never fires it,
  // which reads as a silent failure. Require the pair to be coherent.
  .refine(
    (body) => !body.followup?.enabled || (body.followup.followup_interval_in_seconds ?? 0) > 0,
    {
      path: ["followup", "followup_interval_in_seconds"],
      error: "Choose a follow-up interval, or turn follow-ups off",
    },
  )
  .refine((body) => !body.followup?.enabled || !!body.followup.message?.length, {
    path: ["followup", "message"],
    error: "A follow-up message is required when follow-ups are enabled",
  })
  .refine((body) => !body.handoff?.enabled || !!body.handoff.message?.length, {
    path: ["handoff", "message"],
    error: "A handoff message is required when a custom handoff message is enabled",
  });
export type AgentSettingsBody = z.infer<typeof agentSettingsBodySchema>;

/** Rateup-side agent behaviour; never forwarded to Meta. */
export const agentInboxSettingsBodySchema = z.object({
  releaseOnTicketClose: z.boolean(),
});
export type AgentInboxSettingsBody = z.infer<typeof agentInboxSettingsBodySchema>;

// ---- knowledge: business info ----
export const businessInfoBodySchema = z.object({
  business_description: z.string().trim().max(5000).optional(),
  payment_method: z.string().trim().max(5000).optional(),
  return_policy: z.string().trim().max(5000).optional(),
  purchase_info: z.string().trim().max(5000).optional(),
  delivery_and_shipping: z.string().trim().max(5000).optional(),
  contact_info: z
    .object({
      email: z.email("Enter a valid email address").optional().or(z.literal("")),
      address: z.string().trim().max(1000).optional(),
      hours_of_operation: z.string().trim().max(1000).optional(),
    })
    .optional(),
});
export type BusinessInfoBody = z.infer<typeof businessInfoBodySchema>;

// ---- knowledge: faqs ----
export const faqBodySchema = z.object({
  question: z.string().trim().min(1, "A question is required").max(1000),
  answer: z.string().trim().min(1, "An answer is required").max(5000),
  metadata: z.record(z.string(), z.string()).optional(),
});
export type FaqBody = z.infer<typeof faqBodySchema>;

// ---- knowledge: websites ----
export const websiteBodySchema = z.object({
  url: httpsUrl,
});
export type WebsiteBody = z.infer<typeof websiteBodySchema>;

// ---- knowledge: files ----
/** Meta's documented cap: 100,000,000 bytes. */
export const KNOWLEDGE_FILE_MAX_BYTES = 100_000_000;
export const KNOWLEDGE_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".csv",
  ".xlsx",
] as const;

// ---- skills ----
export const skillBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "A title is required")
    .max(64, "Titles are limited to 64 characters")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only"),
  description: z
    .string()
    .trim()
    .min(1, "Describe when the agent should use this skill")
    .max(1024, "Descriptions are limited to 1024 characters"),
  skill: z
    .string()
    .trim()
    .min(1, "Instructions are required")
    .max(20000, "Instructions are limited to 20,000 characters"),
  metadata: z.record(z.string(), z.string()).optional(),
});
export type SkillBody = z.infer<typeof skillBodySchema>;

// ---- ui skills ----
export const uiSkillComponentTypeEnum = z.enum([
  "carousel_quick_reply",
  "carousel_url",
  "cta_url",
  "flow",
  "image",
  "interactive_list",
  "location",
  "location_request",
]);
export type UiSkillComponentType = z.infer<typeof uiSkillComponentTypeEnum>;

export const uiSkillStatusEnum = z.enum(["enabled", "disabled"]);

/** A UI skill title is a slug: lowercase letters, digits and inner hyphens. */
const uiSkillTitleSchema = z
  .string()
  .trim()
  .min(1, "A title is required")
  .max(128, "Titles are limited to 128 characters")
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "Use only lowercase letters, numbers and hyphens, and don't start or end with a hyphen",
  );

export const uiSkillBodySchema = z
  .object({
    title: uiSkillTitleSchema,
    component_type: uiSkillComponentTypeEnum,
    status: uiSkillStatusEnum.default("enabled"),
    instruction: z.string().trim().min(1, "Tell the agent when to send this component").max(4096),
    // Meta types this as an integer; kept as a digit string so a 16-digit flow id
    // survives JSON without rounding.
    flow_id: z.string().trim().regex(/^\d+$/, "A flow id is a number").optional(),
  })
  .refine((body) => body.component_type !== "flow" || !!body.flow_id, {
    path: ["flow_id"],
    error: "A flow id is required for flow components",
  });
export type UiSkillBody = z.infer<typeof uiSkillBodySchema>;

/** Meta's update endpoint takes only these three; component_type is immutable. */
export const uiSkillUpdateBodySchema = z.object({
  title: uiSkillTitleSchema.optional(),
  status: uiSkillStatusEnum.optional(),
  instruction: z.string().trim().min(1).max(4096).optional(),
});
export type UiSkillUpdateBody = z.infer<typeof uiSkillUpdateBodySchema>;

// ---- connectors ----
export const connectorAuthTypeEnum = z.enum([
  "OAUTH2_CLIENT_CREDENTIALS",
  "OAUTH2",
  "API_KEY",
  "BASIC",
  "CUSTOM",
  "NONE",
]);
export type ConnectorAuthType = z.infer<typeof connectorAuthTypeEnum>;

export const userAuthInjectionConfigSchema = z.object({
  location: z.enum(["body", "headers", "path", "query"]),
  field_name: z.string().trim().min(1, "A field name is required").max(128),
  prefix: z.string().max(32),
});

export const connectorBodySchema = z.object({
  name: z.string().trim().min(1, "A name is required").max(128),
  description: z
    .string()
    .trim()
    .min(1, "The agent uses this description to decide when to call the connector")
    .max(1024),
  base_url: httpsUrl,
  auth_type: connectorAuthTypeEnum,
  user_auth_injection_config: userAuthInjectionConfigSchema.optional(),
  requires_certificate: z.boolean().optional(),
});
export type ConnectorBody = z.infer<typeof connectorBodySchema>;

export const connectorLogsQuerySchema = z
  .object({
    start_time: z.coerce.number().int().positive().optional(),
    end_time: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    tool_id: z.string().trim().optional(),
    include_stats: z.coerce.boolean().optional(),
    summary_only: z.coerce.boolean().optional(),
    top_n: z.coerce.number().int().min(1).max(50).optional(),
  })
  // Meta only keeps 7 days and rejects a wider window; catching it here saves a
  // round trip and gives the user the actual limit.
  .refine(
    (query) =>
      !query.start_time || !query.end_time || query.end_time - query.start_time <= 7 * 24 * 60 * 60,
    { path: ["start_time"], error: "The time range cannot exceed 7 days" },
  );
export type ConnectorLogsQuery = z.infer<typeof connectorLogsQuerySchema>;

/** One API-key header/query/body field: `Authorization: Bearer <value>`. */
const apiKeyParamSchema = z.object({
  field_name: z.string().trim().min(1, "A field name is required").max(128),
  value: z.string().min(1, "A value is required"),
  prefix: z.string().max(32).optional(),
});

export const upsertApiKeyBodySchema = z
  .object({
    api_key_config: z.object({
      headers: z.array(apiKeyParamSchema).optional(),
      query_params: z.array(apiKeyParamSchema).optional(),
      body_params: z.array(apiKeyParamSchema).optional(),
    }),
  })
  .refine(
    (body) =>
      !!(
        body.api_key_config.headers?.length ||
        body.api_key_config.query_params?.length ||
        body.api_key_config.body_params?.length
      ),
    {
      path: ["api_key_config"],
      error: "Provide at least one header, query parameter or body field",
    },
  );
export type UpsertApiKeyBody = z.infer<typeof upsertApiKeyBodySchema>;

export const upsertOAuthBodySchema = z.object({
  oauth_config: z.object({
    token_url: httpsUrl,
    scopes_to_request: z.array(z.string().trim().min(1)).min(1, "At least one scope is required"),
    client_id: z.string().trim().min(1, "A client id is required"),
    client_secret: z.string().min(1, "A client secret is required"),
    token_request_content_type: z
      .enum(["application/x-www-form-urlencoded", "application/json"])
      .optional(),
  }),
});
export type UpsertOAuthBody = z.infer<typeof upsertOAuthBodySchema>;

const pemBlock = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => value.includes("-----BEGIN"), `${label} must be PEM-encoded`);

export const upsertCertificateBodySchema = z.object({
  client_certificate: pemBlock("A client certificate"),
  client_key: pemBlock("A client key"),
  ca_certificate: pemBlock("A CA certificate").optional(),
});
export type UpsertCertificateBody = z.infer<typeof upsertCertificateBodySchema>;

// ---- connector tools ----
export const byConnectorIdParamSchema = z.object({
  whatsappSettingsId: z.guid(),
  connectorId: z.guid(),
});
export type ByConnectorIdParams = z.infer<typeof byConnectorIdParamSchema>;

export const byConnectorToolIdParamSchema = z.object({
  whatsappSettingsId: z.guid(),
  connectorId: z.guid(),
  toolId: z.guid(),
});
export type ByConnectorToolIdParams = z.infer<typeof byConnectorToolIdParamSchema>;

/**
 * Either a literal the agent must not choose, or a runtime macro Meta fills in
 * from the conversation. `value` is only meaningful for `default`, `macro` only
 * for `macro` — so each is required exactly where it applies.
 */
export const parameterBindingSchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("default"),
      value: z.string().min(1, "A default binding needs a value"),
    }),
    z.object({
      kind: z.literal("macro"),
      macro: z.enum([
        "WHATSAPP_PHONE_NUMBER",
        "WHATSAPP_IDENTITY_HASH",
        "WHATSAPP_CURRENT_STATUS_ID",
      ]),
    }),
  ])
  .optional();

export const parameterNodeSchema = z.object({
  type: z.enum(["string", "integer", "number", "boolean"]),
  description: z.string().trim().max(1024).optional(),
  required: z.boolean().optional(),
  binding: parameterBindingSchema,
});

/**
 * A JSON body field. Objects nest through `properties`, arrays describe their
 * element through `items` — so this has to be lazy to name itself.
 */
export type BodyNode = {
  type: "object" | "array" | "string" | "integer" | "number" | "boolean";
  description?: string;
  required?: string[];
  properties?: Record<string, BodyNode>;
  items?: BodyNode;
  binding?: z.infer<typeof parameterBindingSchema>;
};

export const bodyNodeSchema: z.ZodType<BodyNode> = z.lazy(() =>
  z.object({
    type: z.enum(["object", "array", "string", "integer", "number", "boolean"]),
    description: z.string().trim().max(1024).optional(),
    required: z.array(z.string().trim().min(1)).optional(),
    properties: z.record(z.string(), bodyNodeSchema).optional(),
    items: bodyNodeSchema.optional(),
    binding: parameterBindingSchema,
  }),
);

export const requestDefinitionSchema = z
  .object({
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
    path: z
      .string()
      .trim()
      .min(1, "A path is required")
      .startsWith("/", "The path must start with /"),
    path_parameters: z.record(z.string(), parameterNodeSchema).optional(),
    query_parameters: z.record(z.string(), parameterNodeSchema).optional(),
    headers: z.record(z.string(), parameterNodeSchema).optional(),
    body: z
      .object({
        content_type: z.literal("application/json"),
        params: z.record(z.string(), bodyNodeSchema),
        required: z.array(z.string().trim().min(1)).optional(),
      })
      .optional(),
  })
  // A `{placeholder}` with nothing declared for it is the failure mode you only
  // see at runtime, as a request to a literal `/orders/{id}`.
  .refine(
    (definition) => {
      const declared = new Set(Object.keys(definition.path_parameters ?? {}));
      const used = [...definition.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
      return used.every((name) => declared.has(name));
    },
    {
      path: ["path_parameters"],
      error: "Every {placeholder} in the path needs a matching path parameter",
    },
  );
export type RequestDefinition = z.infer<typeof requestDefinitionSchema>;

export const userAuthActionConfigSchema = z.object({
  user_action_tool_type: z.enum(["auth", "refresh"]),
  user_auth_token_path: z.string().trim().min(1, "A token path is required"),
  refresh_token_path: z.string().trim().optional(),
  expires_at_path: z.string().trim().optional(),
  expires_at_type: z.enum(["absolute", "relative_seconds"]).optional(),
});

export const connectorToolBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "A name is required")
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, underscores and hyphens only"),
  description: z
    .string()
    .trim()
    .min(1, "The agent uses this description to decide when to call the tool")
    .max(1024),
  request_definition: requestDefinitionSchema,
  user_auth_required: z.boolean(),
  user_auth_action_config: userAuthActionConfigSchema.optional(),
});
export type ConnectorToolBody = z.infer<typeof connectorToolBodySchema>;

/** Meta takes the run input as an opaque JSON string, not an object. */
export const connectorToolRunBodySchema = z.object({
  input: z
    .string()
    .optional()
    .refine((value) => {
      if (!value?.trim()) return true;
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }, "Input must be valid JSON"),
});
export type ConnectorToolRunBody = z.infer<typeof connectorToolRunBodySchema>;

// ---- operate: eval ----
export const evalRunBodySchema = z.object({
  eval_case_ids: z.array(z.string().trim().min(1)).min(1, "Select at least one eval case"),
});
export type EvalRunBody = z.infer<typeof evalRunBodySchema>;

export const evalRunQuerySchema = z.object({ job_id: z.string().trim().min(1) });
export type EvalRunQuery = z.infer<typeof evalRunQuerySchema>;

export const evalDetailsQuerySchema = z.object({ eval_ids: z.string().trim().min(1) });
export type EvalDetailsQuery = z.infer<typeof evalDetailsQuerySchema>;

export const evalSummaryQuerySchema = z.object({ summary_ids: z.string().trim().min(1) });
export type EvalSummaryQuery = z.infer<typeof evalSummaryQuerySchema>;

// ---- operate: event ----
export const agentEventBodySchema = z.object({
  to: e164,
  event: z.object({
    type: z.string().trim().min(1, "An event type is required").max(256),
    description: z.string().trim().min(1, "A description is required").max(1024),
    payload: z
      .string()
      .max(4096, "Payloads are limited to 4096 characters")
      .refine((value) => {
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      }, "The payload must be valid JSON"),
  }),
});
export type AgentEventBody = z.infer<typeof agentEventBodySchema>;

export const byAgentEventIdParamSchema = z.object({
  whatsappSettingsId: z.guid(),
  agentEventId: z.string().trim().min(1),
});

// ---- operate: test ----
export const agentTestBodySchema = z.object({
  user_msg: z.string().trim().min(1, "A message is required").max(4096),
  conversation_id: z.string().trim().min(1).optional(),
});
export type AgentTestBody = z.infer<typeof agentTestBodySchema>;

// ---- operate: thread control ----
export const threadControlBodySchema = z.object({
  // Meta documents `pass` as reserved for future use; `release` is the only
  // action the Cloud API acts on today.
  action: z.enum(["pass", "release"]),
  to: e164,
});
export type ThreadControlBody = z.infer<typeof threadControlBodySchema>;
