import { z } from "zod";

import { ShopifyEvents } from "@/types/enums.ts";

const SHOPIFY_TRIGGER_EVENTS = Object.values(ShopifyEvents) as [string, ...string[]];

// Single source of truth for condition fields
export const CONDITION_FIELDS = [
  { label: "Message Body", value: "MESSAGE_BODY" },
  { label: "Contact Email", value: "CONTACT_EMAIL" },
  { label: "Contact Group", value: "CONTACT_GROUP" },
  { label: "Contact Label", value: "CONTACT_LABEL" },
  { label: "Contact Lifecycle", value: "CONTACT_LIFECYCLE" },
  // TODO: Enable if needed in future existed in trengo
  // { label: "Message Direction", value: "MESSAGE_DIRECTION" },
  // { label: "Elapsed Time", value: "ELAPSED_TIME" },
  // { label: "Thread Subject", value: "THREAD_SUBJECT" },
] as const;

// Single source of truth for condition operators
export const CONDITION_OPERATORS = [
  { label: "Contains", value: "CONTAINS" },
  { label: "Equals", value: "EQUALS" },
  { label: "Starts With", value: "STARTS_WITH" },
  { label: "Ends With", value: "ENDS_WITH" },
  // TODO: add this for number based fields if needed in future
  // { label: "Greater Than", value: "GREATER_THAN" },
  // { label: "Less Than", value: "LESS_THAN" },
] as const;

export const PLATFORMS = [
  { label: "WhatsApp", value: "WHATSAPP" },
  { label: "Instagram", value: "INSTAGRAM" },
  { label: "Facebook", value: "FACEBOOK" },
] as const;

export type Platform = (typeof PLATFORMS)[number]["value"];

// Single source of truth for trigger events
const TRIGGER_EVENTS = [
  {
    label: "Message Received",
    value: "MESSAGE_RECEIVED",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Chat Closed",
    value: "CHAT_CLOSED",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Chat Assigned",
    value: "CHAT_ASSIGNED",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Contact Created",
    value: "CONTACT_CREATED",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Lifecycle Updated",
    value: "LIFECYCLE_UPDATED",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Shopify Event",
    value: "SHOPIFY_EVENT",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Instagram Comment (Private Reply)",
    value: "INSTAGRAM_COMMENT",
    platforms: ["INSTAGRAM"],
  },
  {
    label: "Instagram Story Mention",
    value: "INSTAGRAM_STORY_MENTION",
    platforms: ["INSTAGRAM"],
  },
] as const;

export function getTriggerEventsForPlatform(platform: Platform) {
  return TRIGGER_EVENTS.filter((e) => (e.platforms as readonly string[]).includes(platform));
}

export const INSTAGRAM_SCOPE_OPTIONS = [
  { label: "All posts", value: "ALL" },
  { label: "Specific posts", value: "SPECIFIC" },
] as const;

// Single source of truth for action types
export const ACTION_TYPES = [
  {
    label: "Close Chat",
    value: "CLOSE_TICKET",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Trigger Chatbot",
    value: "TRIGGER_CHATBOT",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Call External API",
    value: "CALL_EXTERNAL_API",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Send Web Survey",
    value: "SEND_WEB_SURVEY",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  { label: "Send Template", value: "SEND_TEMPLATE", platforms: ["WHATSAPP"] },
  {
    label: "Send Message",
    value: "SEND_MESSAGE",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  { label: "Send Flow", value: "SEND_FLOW", platforms: ["WHATSAPP"] },
  {
    label: "Assign Team",
    value: "ASSIGN_TEAM",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Assign User",
    value: "ASSIGN_USER",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Attach Label",
    value: "ATTACH_LABEL",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Assign Lifecycle",
    value: "ASSIGN_LIFECYCLE",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
] as const;

export function getActionTypesForPlatform(platform: Platform) {
  return ACTION_TYPES.filter((a) => (a.platforms as readonly string[]).includes(platform));
}

// Single source of truth for group operators
const GROUP_OPERATORS = [
  { label: "AND", value: "AND" },
  { label: "OR", value: "OR" },
] as const;

const ruleConditionSchema = z.object({
  id: z.string().optional(),
  field: z.enum(CONDITION_FIELDS.map((f) => f.value) as [string, ...string[]]),
  operator: z.enum(CONDITION_OPERATORS.map((o) => o.value) as [string, ...string[]]),
  value: z.string().min(1, "Value is required"),
});

const externalApiActionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("CALL_EXTERNAL_API"),
  value: z.url("Enter a valid full URL (e.g. https://example.com/webhook)"),
});

const sendTemplateActionValueSchema = z.object({
  templateId: z.string().min(1, "Template is required"),
  variableMapping: z
    .array(
      z.object({
        templateParamIndex: z.number(),
        shopifyPath: z.string(),
      }),
    )
    .default([]),
});

const sendTemplateActionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("SEND_TEMPLATE"),
  value: z.union([z.string().min(1, "Template is required"), sendTemplateActionValueSchema]),
});

const regularActionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(
    ACTION_TYPES.map((t) => t.value).filter(
      (v) => v !== "CALL_EXTERNAL_API" && v !== "SEND_TEMPLATE",
    ) as [string, ...string[]],
  ),
  value: z.string().min(1, "Value is required"),
});

const ruleActionSchema = z.union([
  externalApiActionSchema,
  sendTemplateActionSchema,
  regularActionSchema,
]);

const ruleGroupSchema = z.object({
  id: z.string().optional(),
  operator: z.enum(GROUP_OPERATORS.map((o) => o.value) as [string, ...string[]]).default("AND"),
  conditions: z.array(ruleConditionSchema).refine(
    (items) => {
      const seen = new Set();
      for (const item of items) {
        const key = `${item.field}-${item.operator}-${item.value}`;
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    },
    {
      error: "Duplicate conditions are not allowed",
    },
  ),
});

const ruleOptionsSchema = z.object({
  sendOncePerDay: z.boolean().default(false),
  shopifyEvent: z.enum(SHOPIFY_TRIGGER_EVENTS).optional(),
  businessHours: z
    .object({
      enabled: z.boolean().default(false),
      businessHoursId: z.string().optional(),
    })
    .default({
      enabled: false,
      businessHoursId: undefined,
    }),
  // Shopify-specific options
  shopifyProductIds: z.array(z.string()).default([]),
  // Instagram-specific options
  instagramScope: z.enum(["ALL", "SPECIFIC"]).default("ALL"),
  instagramPostIds: z.array(z.string()).default([]),
});

const createRuleBaseSchema = z.object({
  platform: z.enum(PLATFORMS.map((p) => p.value) as [string, ...string[]]).default("WHATSAPP"),
  whatsappSettingsPhoneIds: z.array(z.string()).min(1, "Select at least one account"),
  name: z.string().min(1, "Name is required"),
  operator: z.enum(GROUP_OPERATORS.map((o) => o.value) as [string, ...string[]]).default("AND"),
  isActive: z.boolean().default(true),
  triggerEvent: z.enum(TRIGGER_EVENTS.map((t) => t.value) as [string, ...string[]]),
  groups: z.array(ruleGroupSchema),
  actions: z
    .array(ruleActionSchema)
    .min(1, "At least one action is required")
    .refine(
      (items) => {
        const seen = new Set();
        for (const item of items) {
          const valueKey =
            typeof item.value === "string" ? item.value : JSON.stringify(item.value ?? {});
          const key = `${item.type}-${valueKey}`;
          if (seen.has(key)) return false;
          seen.add(key);
        }
        return true;
      },
      {
        error: "Duplicate actions are not allowed",
      },
    ),
  options: ruleOptionsSchema.optional().default({
    sendOncePerDay: false,
    shopifyEvent: undefined,
    businessHours: {
      enabled: false,
      businessHoursId: undefined,
    },
    shopifyProductIds: [],
    instagramScope: "ALL",
    instagramPostIds: [],
  }),
});

export const createRuleSchema = createRuleBaseSchema.superRefine((data, ctx) => {
  if (data.triggerEvent === "MESSAGE_RECEIVED") {
    if (data.groups.length === 0 || !data.groups.some((group) => group.conditions.length > 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["groups"],
        message: "At least one condition is required for Message Received trigger",
      });
    }
  }

  if (data.triggerEvent === "SHOPIFY_EVENT" && !data.options?.shopifyEvent) {
    ctx.addIssue({
      code: "custom",
      path: ["options", "shopifyEvent"],
      message: "Select a Shopify event",
    });
  }

  const isInstagramTrigger =
    data.triggerEvent === "INSTAGRAM_COMMENT" || data.triggerEvent === "INSTAGRAM_STORY_MENTION";

  if (
    isInstagramTrigger &&
    data.options?.instagramScope === "SPECIFIC" &&
    (!data.options?.instagramPostIds || data.options.instagramPostIds.length === 0)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["options", "instagramPostIds"],
      message: "Add at least one post ID",
    });
  }
});

export type CreateRuleInput = z.input<typeof createRuleSchema>;

const updateRuleSchema = createRuleBaseSchema.partial();

type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

// --- Type Exports for Compatibility ---

export type TriggerEvent = z.infer<typeof createRuleSchema>["triggerEvent"];
export type ConditionField = z.infer<typeof ruleConditionSchema>["field"];
export type ConditionOperator = z.infer<typeof ruleConditionSchema>["operator"];
export type ActionType = z.infer<typeof ruleActionSchema>["type"];
type RuleGroup = z.infer<typeof ruleGroupSchema>;
type RuleCondition = z.infer<typeof ruleConditionSchema>;
type RuleAction = z.infer<typeof ruleActionSchema>;
