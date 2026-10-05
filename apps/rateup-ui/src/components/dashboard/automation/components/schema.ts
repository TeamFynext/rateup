import { z } from "zod";

import { MessagePlatform, ShopifyEvents } from "@/types/enums.ts";
import { wooEventData, type WooEvent } from "@/utils/constants.ts";

/** The `value`s of an option list, as the non-empty tuple `z.enum` expects. */
const optionValues = (options: readonly { value: string }[]) =>
  options.map((option) => option.value) as [string, ...string[]];

const SHOPIFY_TRIGGER_EVENTS = Object.values(ShopifyEvents) as [ShopifyEvents, ...ShopifyEvents[]];
const WOO_TRIGGER_EVENTS = wooEventData.map((event) => event.value) as [WooEvent, ...WooEvent[]];

// Single source of truth for condition fields
export const CONDITION_FIELDS = [
  { label: "Message Body", value: "MESSAGE_BODY" },
  { label: "Contact Email", value: "CONTACT_EMAIL" },
  { label: "Contact Group", value: "CONTACT_GROUP" },
  { label: "Contact Label", value: "CONTACT_LABEL" },
  // Superseded by Lead Stage. Kept for the same reason as Assign Lead Stage
  // below: conditions already written against it still have to render and save.
  { label: "Contact Lifecycle (legacy)", value: "CONTACT_LIFECYCLE", legacy: true },
  { label: "Lead Stage", value: "CONTACT_STAGE" },
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
    // Superseded by Lead Stage Updated; still fires for rules already using it.
    label: "Lifecycle Updated (legacy)",
    value: "LIFECYCLE_UPDATED",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
    legacy: true,
  },
  {
    label: "Lead Stage Updated",
    value: "STAGE_UPDATED",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  {
    label: "Shopify Event",
    value: "SHOPIFY_EVENT",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
  // Hidden until WooCommerce and HubSpot launch — uncomment to show.
  // {
  //   label: "WooCommerce Event",
  //   value: "WOOCOMMERCE_EVENT",
  //   platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  // },
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
  {
    label: "ig.me Link Opened",
    value: "INSTAGRAM_REFERRAL",
    platforms: ["INSTAGRAM"],
  },
] as const;

/**
 * The trigger events offered for a platform.
 *
 * `current` is the event the rule already has, so a legacy one keeps rendering
 * on the rule that uses it while nothing new can be authored against it — the
 * same rule as {@link getActionTypesForPlatform}.
 */
export function getTriggerEventsForPlatform(platform: Platform, current?: string) {
  return TRIGGER_EVENTS.filter(
    (e) =>
      (e.platforms as readonly string[]).includes(platform) &&
      (!("legacy" in e && e.legacy) || e.value === current),
  );
}

/** A trigger's display name; an event missing from the list falls back to its raw value. */
export function getTriggerEventLabel(value: string): string {
  return TRIGGER_EVENTS.find((e) => e.value === value)?.label ?? value;
}

/** Condition fields, hiding a legacy one unless it is the field already chosen. */
export function getConditionFields(current?: string) {
  return CONDITION_FIELDS.filter((f) => !("legacy" in f && f.legacy) || f.value === current);
}

export const INSTAGRAM_COMMENT_SOURCES = [
  { label: "Posts & reels", value: "POSTS" },
  { label: "Live videos", value: "LIVE" },
  { label: "Both", value: "ALL" },
] as const;

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
    // Superseded by Assign Lead Stage and no longer offered for new actions. It stays
    // in the list because rules written against it are still running: dropping
    // the entry would leave those rows with an empty type select, and saving one
    // would quietly rewrite the action.
    label: "Assign Lifecycle (legacy)",
    value: "ASSIGN_LIFECYCLE",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
    legacy: true,
  },
  {
    label: "Assign Lead Stage",
    value: "ASSIGN_STAGE",
    platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
] as const;

/**
 * The action types offered for a platform.
 *
 * `current` is the type the action already has. A legacy type is offered only
 * when it is the one already selected, so existing rules still render and can be
 * saved untouched, while nothing new can be authored against it.
 */
export function getActionTypesForPlatform(platform: Platform, current?: string) {
  return ACTION_TYPES.filter(
    (a) =>
      (a.platforms as readonly string[]).includes(platform) &&
      (!("legacy" in a && a.legacy) || a.value === current),
  );
}

// Single source of truth for group operators
const GROUP_OPERATORS = [
  { label: "AND", value: "AND" },
  { label: "OR", value: "OR" },
] as const;

const ruleConditionSchema = z.object({
  id: z.string().optional(),
  field: z.enum(optionValues(CONDITION_FIELDS)),
  operator: z.enum(optionValues(CONDITION_OPERATORS)),
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
  useProductImageAsHeader: z.boolean().optional(),
  /** The variable whose value becomes the `{{1}}` suffix of the template's URL button. */
  buttonUrlVariable: z.string().optional(),
});

const sendTemplateActionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("SEND_TEMPLATE"),
  value: z.union([z.string().min(1, "Template is required"), sendTemplateActionValueSchema]),
});

const assignLifecycleActionValueSchema = z.object({
  lifecycleId: z.string().min(1, "Lifecycle is required"),
  /**
   * Board to open a lead on when the contact reaches this lifecycle. Absent means
   * the rule only sets the lifecycle, which is what it did before the option
   * existed — so leaving it off is the unchanged behaviour, not a broken rule.
   */
  pipelineId: z.string().optional(),
});

const assignLifecycleActionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("ASSIGN_LIFECYCLE"),
  value: z.union([z.string().min(1, "Lifecycle is required"), assignLifecycleActionValueSchema]),
});

const regularActionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(
    optionValues(ACTION_TYPES).filter(
      (value) =>
        value !== "CALL_EXTERNAL_API" && value !== "SEND_TEMPLATE" && value !== "ASSIGN_LIFECYCLE",
    ) as [string, ...string[]],
  ),
  value: z.string().min(1, "Value is required"),
});

const ruleActionSchema = z.union([
  externalApiActionSchema,
  sendTemplateActionSchema,
  assignLifecycleActionSchema,
  regularActionSchema,
]);

const ruleGroupSchema = z.object({
  id: z.string().optional(),
  operator: z.enum(optionValues(GROUP_OPERATORS)).default("AND"),
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
  // WooCommerce-specific options
  wooEvent: z.enum(WOO_TRIGGER_EVENTS).optional(),
  wooProductIds: z.array(z.string()).default([]),
  // Abandoned checkouts; the API applies 60 minutes and true when these are unset.
  abandonedCheckoutDelayMinutes: z
    .number()
    .int()
    .min(15, "Send after at least 15 minutes")
    .max(7 * 24 * 60, "Send after 7 days at most")
    .optional(),
  requireMarketingConsent: z.boolean().optional(),
  // Instagram-specific options
  instagramScope: z.enum(["ALL", "SPECIFIC"]).default("ALL"),
  instagramPostIds: z.array(z.string()).default([]),
  instagramCommentSource: z.enum(["ALL", "POSTS", "LIVE"]).optional(),
  // Mirrors the API's check in wa_rule.schema.ts.
  instagramRef: z
    .string()
    .trim()
    .max(250)
    .regex(/^[A-Za-z0-9_=-]*$/, "Use letters, numbers, - _ and = only")
    .optional(),
  instagramPublicReplies: z
    .array(z.string().trim().max(2200, "Instagram comments stop at 2200 characters"))
    .max(10)
    .default([])
    .transform((replies) => replies.filter((reply) => reply.length > 0)),
});

const createRuleBaseSchema = z.object({
  platform: z.enum(optionValues(PLATFORMS)).default("WHATSAPP"),
  whatsappSettingsPhoneIds: z.array(z.string()).min(1, "Select at least one account"),
  name: z.string().min(1, "Name is required"),
  operator: z.enum(optionValues(GROUP_OPERATORS)).default("AND"),
  isActive: z.boolean().default(true),
  triggerEvent: z.enum(optionValues(TRIGGER_EVENTS)),
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
    wooEvent: undefined,
    wooProductIds: [],
    instagramScope: "ALL",
    instagramPostIds: [],
    instagramPublicReplies: [],
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

  if (data.triggerEvent === "WOOCOMMERCE_EVENT" && !data.options?.wooEvent) {
    ctx.addIssue({
      code: "custom",
      path: ["options", "wooEvent"],
      message: "Select a WooCommerce order status",
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

/** The rule's `platform`, narrowed to the enum the account pickers accept. */
export const toMessagePlatform = (value: string | undefined): MessagePlatform | undefined =>
  Object.values(MessagePlatform).find((platform) => platform === value);

export type CreateRuleInput = z.input<typeof createRuleSchema>;
/** What the schema produces once parsed — every defaulted field is present. */
export type CreateRuleValues = z.output<typeof createRuleSchema>;

// --- Type Exports for Compatibility ---

export type TriggerEvent = z.infer<typeof createRuleSchema>["triggerEvent"];
export type ConditionField = z.infer<typeof ruleConditionSchema>["field"];
export type ConditionOperator = z.infer<typeof ruleConditionSchema>["operator"];
export type ActionType = z.infer<typeof ruleActionSchema>["type"];
