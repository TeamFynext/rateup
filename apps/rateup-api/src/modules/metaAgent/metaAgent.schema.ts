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
  // Ours: recorded on the agent row, never sent. Meta's onboarding body has no
  // channel field; the entity id already says what it is.
  channel: channelEnum.default("whatsapp"),
  // Commerce Manager's numeric catalog id. Omitted leaves the number's existing
  // catalog association as it is.
  catalog_id: z.string().trim().regex(/^\d+$/, "A catalog id is a number").optional(),
});
export type OnboardingBody = z.infer<typeof onboardingBodySchema>;

export const allowlistEntryBodySchema = z.object({
  consumer_phone_number: e164,
});

/** Meta's cap on a WhatsApp number's allowlist; the 21st add is a 400. */
export const ALLOWLIST_MAX_ENTRIES = 20;
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

export const handoffMessageSelectionEnum = z.enum(["DEFAULT", "AGENT", "CUSTOM"]);

export const agentSettingsBodySchema = z
  .object({
    rollout: z.object({ enabled: z.boolean() }).optional(),
    handoff: z
      .object({
        // Whether the agent releases thread control after its handoff message.
        // Not "use a custom message" — that is message_selection.
        enabled: z.boolean(),
        message: z.string().trim().max(1024).optional(),
        // CUSTOM sends `message`; AGENT has the agent write one per conversation;
        // DEFAULT is Meta's fixed, translated line.
        message_selection: handoffMessageSelectionEnum.optional(),
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
  .refine(
    (body) => body.handoff?.message_selection !== "CUSTOM" || !!body.handoff.message?.length,
    {
      path: ["handoff", "message"],
      error: "Write the handoff message, or choose another message source",
    },
  );
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
    .regex(
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
      "Use lowercase letters, numbers and hyphens, and don't start or end with a hyphen",
    ),
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
  "interactive_reply_buttons",
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
  })
  // Meta rejects a flow_id on every other component type.
  .refine((body) => body.component_type === "flow" || !body.flow_id, {
    path: ["flow_id"],
    error: "A flow id only applies to flow components",
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
/** Every auth type Meta may report on a connector it holds. */
export const connectorAuthTypeEnum = z.enum([
  "OAUTH2_CLIENT_CREDENTIALS",
  "OAUTH2",
  "API_KEY",
  "BASIC",
  "CUSTOM",
  "NONE",
]);
export type ConnectorAuthType = z.infer<typeof connectorAuthTypeEnum>;

/** The subset Meta accepts on create and update today. */
export const connectorWritableAuthTypeEnum = z.enum([
  "OAUTH2_CLIENT_CREDENTIALS",
  "API_KEY",
  "NONE",
]);

export const userAuthInjectionConfigSchema = z.object({
  location: z.enum(["body", "headers", "path", "query"]),
  field_name: z.string().trim().min(1, "A field name is required").max(128),
  prefix: z.string().max(32),
});

export const connectorLogsQuerySchema = z
  .object({
    start_time: z.coerce.number().int().positive().optional(),
    end_time: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    tool_id: z.string().trim().optional(),
    // Query values arrive as strings, and z.coerce.boolean() reads "false" as true.
    include_stats: z.stringbool().optional(),
    summary_only: z.stringbool().optional(),
    top_n: z.coerce.number().int().min(1).max(50).optional(),
  })
  // Meta only keeps 7 days and rejects a wider window; catching it here saves a
  // round trip and gives the user the actual limit.
  .refine(
    (query) =>
      !query.start_time || !query.end_time || query.end_time - query.start_time <= 7 * 24 * 60 * 60,
    { path: ["start_time"], error: "The time range cannot exceed 7 days" },
  )
  // Meta keeps a week of logs and rejects a start before it.
  .refine(
    (query) => !query.start_time || query.start_time >= Date.now() / 1000 - 7 * 24 * 60 * 60,
    { path: ["start_time"], error: "Logs are only kept for 7 days" },
  );
export type ConnectorLogsQuery = z.infer<typeof connectorLogsQuerySchema>;

/** One API-key header/query/body field: `Authorization: Bearer <value>`. */
const apiKeyParamSchema = z.object({
  field_name: z.string().trim().min(1, "A field name is required").max(128),
  value: z.string().min(1, "A value is required"),
  prefix: z.string().max(32).optional(),
});

/** Where Meta puts an API key; shared by connector create and upsertApiKey. */
const apiKeyAuthConfigSchema = z
  .object({
    headers: z.array(apiKeyParamSchema).optional(),
    query_params: z.array(apiKeyParamSchema).optional(),
    body_params: z.array(apiKeyParamSchema).optional(),
  })
  .refine(
    (config) =>
      !!(config.headers?.length || config.query_params?.length || config.body_params?.length),
    { error: "Provide at least one header, query parameter or body field" },
  );

export const upsertApiKeyBodySchema = z.object({ api_key_config: apiKeyAuthConfigSchema });
export type UpsertApiKeyBody = z.infer<typeof upsertApiKeyBodySchema>;

const oauthClientCredentialsSchema = z.object({
  token_url: httpsUrl,
  scopes_to_request: z.array(z.string().trim().min(1)).min(1, "At least one scope is required"),
  client_id: z.string().trim().min(1, "A client id is required"),
  client_secret: z.string().min(1, "A client secret is required"),
  token_request_content_type: z
    .enum(["application/x-www-form-urlencoded", "application/json"])
    .optional(),
});

export const upsertOAuthBodySchema = z.object({ oauth_config: oauthClientCredentialsSchema });
export type UpsertOAuthBody = z.infer<typeof upsertOAuthBodySchema>;

export const connectorBodySchema = z
  .object({
    name: z.string().trim().min(1, "A name is required").max(128),
    description: z
      .string()
      .trim()
      .min(1, "The agent uses this description to decide when to call the connector")
      .max(1024),
    base_url: httpsUrl,
    auth_type: connectorWritableAuthTypeEnum,
    // Meta rejects an API_KEY or OAuth connector created without its credentials
    // ("The request is not valid for this connector"), so they go with the create.
    // Forwarded to Meta only; never stored here.
    auth_config: z
      .object({
        api_key: apiKeyAuthConfigSchema.optional(),
        oauth2_client_credentials: oauthClientCredentialsSchema.optional(),
      })
      .optional(),
    user_auth_injection_config: userAuthInjectionConfigSchema.optional(),
    requires_certificate: z.boolean().optional(),
  })
  // Each type takes its own half of auth_config and nothing else.
  .refine((body) => body.auth_type === "API_KEY" || !body.auth_config?.api_key, {
    path: ["auth_config", "api_key"],
    error: "An API key only applies to an API key connector",
  })
  .refine(
    (body) =>
      body.auth_type === "OAUTH2_CLIENT_CREDENTIALS" ||
      !body.auth_config?.oauth2_client_credentials,
    {
      path: ["auth_config", "oauth2_client_credentials"],
      error: "OAuth credentials only apply to an OAuth connector",
    },
  );
export type ConnectorBody = z.infer<typeof connectorBodySchema>;

const pemBlock = (label: string, headers: string[]) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(
      (value) => headers.some((header) => value.startsWith(header)),
      `${label} must be PEM-encoded and start with ${headers.join(" or ")}`,
    );

const PEM_CERTIFICATE = ["-----BEGIN CERTIFICATE-----"];

export const upsertCertificateBodySchema = z.object({
  client_certificate: pemBlock("A client certificate", PEM_CERTIFICATE),
  client_key: pemBlock("A client key", [
    "-----BEGIN PRIVATE KEY-----",
    "-----BEGIN RSA PRIVATE KEY-----",
    "-----BEGIN EC PRIVATE KEY-----",
  ]),
  ca_certificate: pemBlock("A CA certificate", PEM_CERTIFICATE).optional(),
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
/**
 * Values Meta fills in from the conversation at call time. NATIONAL drops the
 * country code but keeps a trunk prefix (+60123456789 → 0123456789), for APIs
 * that reject E.164.
 */
export const bindingMacroEnum = z.enum([
  "WHATSAPP_PHONE_NUMBER",
  "WHATSAPP_PHONE_NUMBER_NATIONAL",
  "WHATSAPP_IDENTITY_HASH",
  "WHATSAPP_CURRENT_STATUS_ID",
  "WHATSAPP_BSUID",
  "WHATSAPP_CONVERSATION_ID",
  "WHATSAPP_MESSAGE_ID",
  "USER_MESSAGE",
  "INSTAGRAM_IGSID",
  "INSTAGRAM_CONVERSATION_ID",
]);

export const parameterBindingSchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("default"),
      value: z.string().min(1, "A default binding needs a value"),
    }),
    z.object({
      kind: z.literal("macro"),
      macro: bindingMacroEnum,
    }),
  ])
  .optional();

export const parameterNodeSchema = z.object({
  type: z.enum(["string", "integer", "number", "boolean"]),
  description: z.string().trim().max(1024).optional(),
  required: z.boolean().optional(),
  binding: parameterBindingSchema,
});
export type ParameterNode = z.infer<typeof parameterNodeSchema>;

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

/**
 * Meta's reference types a child node as "a string representation of the
 * BodyNode", and a tool read back from Meta can carry it that way. We send
 * objects (as Meta's own guides do) and accept either, so a synced tool stays
 * editable.
 */
const parseNodeString = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const bodyNodeSchema: z.ZodType<BodyNode> = z.lazy(() =>
  z
    .object({
      type: z.enum(["object", "array", "string", "integer", "number", "boolean"]),
      description: z.string().trim().max(1024).optional(),
      required: z.array(z.string().trim().min(1)).optional(),
      properties: z.record(z.string(), z.preprocess(parseNodeString, bodyNodeSchema)).optional(),
      items: z.preprocess(parseNodeString, bodyNodeSchema).optional(),
      binding: parameterBindingSchema,
    })
    .superRefine((node, ctx) => {
      const container = node.type === "object" || node.type === "array";
      if (container && node.binding) {
        ctx.addIssue({
          code: "custom",
          path: ["binding"],
          message: "Objects and arrays cannot be bound; bind their fields instead",
        });
      }
      if (node.type !== "object" && (node.properties || node.required)) {
        ctx.addIssue({
          code: "custom",
          path: [node.properties ? "properties" : "required"],
          message: "Only object fields have properties",
        });
      }
      if (node.type !== "array" && node.items) {
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: "Only array fields have items",
        });
      }
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
  // `release` and `pass` both hand the thread to Meta AI from here: release
  // gives up control, pass names the agent as the new owner. (`take` exists at
  // Meta but is reserved for the configured escalation partner.)
  action: z.enum(["pass", "release"]),
  // Accepted in E.164; sent to Meta as bare digits, the only form it resolves.
  to: e164,
});
export type ThreadControlBody = z.infer<typeof threadControlBodySchema>;

// ---- configure: budget ----
export const budgetUnitTypeEnum = z.enum(["token", "ai_turn"]);
export const budgetTimeWindowEnum = z.enum([
  "one_day",
  "seven_days",
  "fourteen_days",
  "thirty_days",
]);

export const agentBudgetSchema = z.object({
  // Passed back to edit a budget in place; omitted for a new one.
  budget_id: z.string().trim().min(1).optional(),
  unit_type: budgetUnitTypeEnum,
  time_window: budgetTimeWindowEnum,
  max_budget: z.number().int().min(1, "A cap must be at least 1"),
});
export type AgentBudget = z.infer<typeof agentBudgetSchema>;

/**
 * The complete desired set: Meta replaces what it holds with this, so a budget
 * left out is deleted and an empty list means unlimited.
 */
export const agentBudgetsBodySchema = z
  .object({ budgets: z.array(agentBudgetSchema).max(8) })
  // Meta rejects the whole request over a repeated pair; name the row instead.
  .superRefine((body, ctx) => {
    const seen = new Set<string>();
    body.budgets.forEach((budget, index) => {
      const key = `${budget.unit_type}:${budget.time_window}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["budgets", index, "time_window"],
          message: "There is already a cap for this unit and window",
        });
      }
      seen.add(key);
    });
  });
export type AgentBudgetsBody = z.infer<typeof agentBudgetsBodySchema>;

// ---- insights ----
const isoDay = z.iso.date("Use a YYYY-MM-DD date");

/** Both bounds inclusive, so a span of `maxDays` counts the first and last day. */
const dayRange = (maxDays: number) =>
  z
    .object({ start_date: isoDay, end_date: isoDay })
    .refine((range) => range.start_date <= range.end_date, {
      path: ["end_date"],
      error: "The end date must be on or after the start date",
    })
    .refine(
      (range) =>
        (Date.parse(range.end_date) - Date.parse(range.start_date)) / 86_400_000 + 1 <= maxDays,
      { path: ["start_date"], error: `The range cannot exceed ${maxDays} days` },
    );

// Meta's optional `metrics` filter is left off: the page shows both of the two
// metrics there are, which is Meta's default.
export const conversationInsightsQuerySchema = dayRange(90);
export type ConversationInsightsQuery = z.infer<typeof conversationInsightsQuerySchema>;

export const toolCallInsightsQuerySchema = dayRange(30).and(
  z.object({ tool_name: z.string().trim().min(1).optional() }),
);
export type ToolCallInsightsQuery = z.infer<typeof toolCallInsightsQuerySchema>;

export const agentEventInsightsQuerySchema = dayRange(30).and(
  z.object({ event_type: z.string().trim().min(1).optional() }),
);
export type AgentEventInsightsQuery = z.infer<typeof agentEventInsightsQuerySchema>;

export const conversationTurnsQuerySchema = z.object({
  // Digits-only phone, a BSUID (`US.2788620304833812`) or an agent_test
  // conversation_id; Meta tells them apart. A `+` is stripped in the service,
  // since Meta answers "Consumer not found" to anything but bare digits.
  user: z.string().trim().min(1, "Enter a phone number or user id"),
  start_timestamp_ms: z.coerce.number().int().nonnegative().optional(),
  end_timestamp_ms: z.coerce.number().int().nonnegative().optional(),
  after: z.string().trim().min(1).optional(),
  before: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ConversationTurnsQuery = z.infer<typeof conversationTurnsQuerySchema>;
