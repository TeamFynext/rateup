import { z } from "zod";

import {
  CONNECTOR_AUTH_TYPES,
  FOLLOWUP_INTERVALS,
  UI_SKILL_COMPONENT_TYPES,
} from "@/backend/metaAgent/metaAgent.api";

/**
 * Client-side mirrors of `rateup-api/src/modules/metaAgent/metaAgent.schema.ts`,
 * which in turn mirrors Meta's own reference. Keeping the two in step is the
 * point: a field the API will reject is caught in the form, against the field,
 * rather than coming back as a toast after a round trip to Meta.
 */

export const e164Schema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Enter a phone number in E.164 format, e.g. +15551234567");

export const httpsUrlSchema = z
  .string()
  .trim()
  .min(1, "A URL is required")
  .max(2048, "URLs are limited to 2048 characters")
  .url("Enter a valid URL")
  .refine((value) => value.startsWith("https://"), "URL must use https");

const jsonString = (message = "Enter valid JSON") =>
  z.string().refine((value) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }, message);

// ---- allowlist ----
export const allowlistFormSchema = z.object({ phone: e164Schema });
export type AllowlistFormValues = z.infer<typeof allowlistFormSchema>;

// ---- settings ----
export const settingsFormSchema = z
  .object({
    rolloutEnabled: z.boolean(),
    handoffEnabled: z.boolean(),
    handoffMessage: z.string().trim().max(1024, "Limited to 1024 characters"),
    followupEnabled: z.boolean(),
    followupInterval: z
      .number()
      .refine(
        (value) => (FOLLOWUP_INTERVALS as readonly number[]).includes(value),
        "Choose one of Meta's supported intervals",
      ),
    followupMessage: z.string().trim().max(1024, "Limited to 1024 characters"),
    aiAudience: z.enum(["EVERYONE", "ALLOWLISTED_ONLY"]),
    neverSayPhrases: z.array(z.string().trim().min(1).max(256)).max(50, "Up to 50 phrases"),
  })
  .refine((values) => !values.handoffEnabled || values.handoffMessage.length > 0, {
    path: ["handoffMessage"],
    error: "A handoff message is required when a custom message is enabled",
  })
  .refine((values) => !values.followupEnabled || values.followupInterval > 0, {
    path: ["followupInterval"],
    error: "Choose an interval, or turn follow-ups off",
  })
  .refine((values) => !values.followupEnabled || values.followupMessage.length > 0, {
    path: ["followupMessage"],
    error: "A follow-up message is required when follow-ups are enabled",
  });
export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

// ---- knowledge: business info ----
export const businessInfoFormSchema = z.object({
  business_description: z.string().trim().max(5000, "Limited to 5000 characters"),
  payment_method: z.string().trim().max(5000, "Limited to 5000 characters"),
  return_policy: z.string().trim().max(5000, "Limited to 5000 characters"),
  purchase_info: z.string().trim().max(5000, "Limited to 5000 characters"),
  delivery_and_shipping: z.string().trim().max(5000, "Limited to 5000 characters"),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  address: z.string().trim().max(1000, "Limited to 1000 characters"),
  hours_of_operation: z.string().trim().max(1000, "Limited to 1000 characters"),
});
export type BusinessInfoFormValues = z.infer<typeof businessInfoFormSchema>;

// ---- knowledge: faqs ----
export const faqFormSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "A question is required")
    .max(1000, "Limited to 1000 characters"),
  answer: z.string().trim().min(1, "An answer is required").max(5000, "Limited to 5000 characters"),
});
export type FaqFormValues = z.infer<typeof faqFormSchema>;

// ---- knowledge: websites ----
export const websiteFormSchema = z.object({ url: httpsUrlSchema });
export type WebsiteFormValues = z.infer<typeof websiteFormSchema>;

// ---- skills ----
export const skillFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "A title is required")
    .max(64, "Limited to 64 characters")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only"),
  description: z
    .string()
    .trim()
    .min(1, "Describe when the agent should use this skill")
    .max(1024, "Limited to 1024 characters"),
  skill: z
    .string()
    .trim()
    .min(1, "Instructions are required")
    .max(20000, "Limited to 20,000 characters"),
});
export type SkillFormValues = z.infer<typeof skillFormSchema>;

// ---- ui skills ----
export const uiSkillFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "A title is required")
      .max(128, "Limited to 128 characters")
      .regex(
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
        "Use only lowercase letters, numbers and hyphens, and don't start or end with a hyphen",
      ),
    component_type: z.enum(UI_SKILL_COMPONENT_TYPES),
    status: z.enum(["enabled", "disabled"]),
    instruction: z
      .string()
      .trim()
      .min(1, "Tell the agent when to send this component")
      .max(4096, "Limited to 4096 characters"),
    flow_id: z.string().trim(),
  })
  .refine((values) => values.component_type !== "flow" || values.flow_id.length > 0, {
    path: ["flow_id"],
    error: "A flow id is required for flow components",
  })
  .refine((values) => !values.flow_id || /^\d+$/.test(values.flow_id), {
    path: ["flow_id"],
    error: "A flow id is a number",
  });
export type UiSkillFormValues = z.infer<typeof uiSkillFormSchema>;

// ---- connectors ----
export const connectorFormSchema = z
  .object({
    name: z.string().trim().min(1, "A name is required").max(128, "Limited to 128 characters"),
    description: z
      .string()
      .trim()
      .min(1, "The agent reads this to decide when to call the connector")
      .max(1024, "Limited to 1024 characters"),
    base_url: httpsUrlSchema,
    auth_type: z.enum(CONNECTOR_AUTH_TYPES),
    requires_certificate: z.boolean(),
    injectUserAuth: z.boolean(),
    userAuthLocation: z.enum(["headers", "query", "body", "path"]),
    userAuthFieldName: z.string().trim().max(128, "Limited to 128 characters"),
    userAuthPrefix: z.string().max(32, "Limited to 32 characters"),
  })
  .refine((values) => !values.injectUserAuth || values.userAuthFieldName.length > 0, {
    path: ["userAuthFieldName"],
    error: "A field name is required when injecting a user token",
  });
export type ConnectorFormValues = z.infer<typeof connectorFormSchema>;

// ---- connector credentials ----
const apiKeyParamSchema = z.object({
  field_name: z.string().trim().min(1, "A field name is required").max(128),
  value: z.string().min(1, "A value is required"),
  prefix: z.string().max(32),
});

export const apiKeyFormSchema = z.object({
  location: z.enum(["headers", "query_params", "body_params"]),
  params: z.array(apiKeyParamSchema).min(1, "Add at least one field"),
});
export type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;

export const oauthFormSchema = z.object({
  token_url: httpsUrlSchema,
  scopes_to_request: z.array(z.string().trim().min(1)).min(1, "At least one scope is required"),
  client_id: z.string().trim().min(1, "A client id is required"),
  client_secret: z.string().min(1, "A client secret is required"),
  token_request_content_type: z.enum(["application/x-www-form-urlencoded", "application/json"]),
});
export type OAuthFormValues = z.infer<typeof oauthFormSchema>;

const pemBlock = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => value.includes("-----BEGIN"), `${label} must be PEM-encoded`);

export const certificateFormSchema = z.object({
  client_certificate: pemBlock("A client certificate"),
  client_key: pemBlock("A client key"),
  ca_certificate: z
    .string()
    .trim()
    .refine(
      (value) => !value || value.includes("-----BEGIN"),
      "The CA certificate must be PEM-encoded",
    ),
});
export type CertificateFormValues = z.infer<typeof certificateFormSchema>;

// ---- connector tools ----
/**
 * Method and path are structured fields; the parameter and body maps are edited
 * as JSON because their shape is recursive (objects nest through `properties`,
 * arrays describe an element through `items`) and no flat form models that
 * honestly. Each blob is still parsed and shape-checked before submit.
 */
export const connectorToolFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "A name is required")
      .max(64, "Limited to 64 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, underscores and hyphens only"),
    description: z
      .string()
      .trim()
      .min(1, "The agent reads this to decide when to call the tool")
      .max(1024, "Limited to 1024 characters"),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
    path: z
      .string()
      .trim()
      .min(1, "A path is required")
      .startsWith("/", "The path must start with /"),
    pathParameters: jsonString("Path parameters must be a JSON object"),
    queryParameters: jsonString("Query parameters must be a JSON object"),
    headers: jsonString("Headers must be a JSON object"),
    body: jsonString("The body definition must be valid JSON"),
    user_auth_required: z.boolean(),
  })
  // A `{placeholder}` with nothing declared for it becomes a request to a
  // literal `/orders/{orderId}` — invisible until the agent actually calls it.
  .refine(
    (values) => {
      let declared: Record<string, unknown> = {};
      try {
        declared = JSON.parse(values.pathParameters || "{}") as Record<string, unknown>;
      } catch {
        return true; // the JSON check above already reported this
      }
      const used = [...values.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
      return used.every((name) => name in declared);
    },
    {
      path: ["pathParameters"],
      error: "Every {placeholder} in the path needs a matching path parameter",
    },
  );
export type ConnectorToolFormValues = z.infer<typeof connectorToolFormSchema>;

export const toolRunFormSchema = z.object({
  input: jsonString("Input must be valid JSON"),
});
export type ToolRunFormValues = z.infer<typeof toolRunFormSchema>;

// ---- operate ----
export const testAgentFormSchema = z.object({
  user_msg: z
    .string()
    .trim()
    .min(1, "A message is required")
    .max(4096, "Limited to 4096 characters"),
});
export type TestAgentFormValues = z.infer<typeof testAgentFormSchema>;

export const threadControlFormSchema = z.object({ to: e164Schema });
export type ThreadControlFormValues = z.infer<typeof threadControlFormSchema>;

export const agentEventFormSchema = z.object({
  to: e164Schema,
  type: z.string().trim().min(1, "An event type is required").max(256, "Limited to 256 characters"),
  description: z
    .string()
    .trim()
    .min(1, "A description is required")
    .max(1024, "Limited to 1024 characters"),
  payload: jsonString("The payload must be valid JSON").refine(
    (value) => value.length <= 4096,
    "Payloads are limited to 4096 characters",
  ),
});
export type AgentEventFormValues = z.infer<typeof agentEventFormSchema>;
