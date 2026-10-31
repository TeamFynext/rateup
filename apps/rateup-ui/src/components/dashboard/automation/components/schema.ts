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
  { label: "Audience", value: "CONTACT_GROUP" },
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
  { label: "Messenger", value: "FACEBOOK" },
] as const;

export type Platform = (typeof PLATFORMS)[number]["value"];

/** A rule's platform, narrowed from the form's string; WhatsApp when unset. */
export const asPlatform = (value: string | undefined): Platform =>
  PLATFORMS.find((option) => option.value === value)?.value ?? "WHATSAPP";

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
  {
    label: "WooCommerce Event",
    value: "WOOCOMMERCE_EVENT",
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
  {
    label: "ig.me Link Opened",
    value: "INSTAGRAM_REFERRAL",
    platforms: ["INSTAGRAM"],
  },
  {
    label: "Came From a Click-to-WhatsApp Ad",
    value: "WHATSAPP_AD_REFERRAL",
    platforms: ["WHATSAPP"],
  },
  {
    label: "m.me Link Opened",
    value: "MESSENGER_REFERRAL",
    platforms: ["FACEBOOK"],
  },
  {
    label: "Facebook Page Comment",
    value: "FACEBOOK_COMMENT",
    platforms: ["FACEBOOK"],
  },
] as const;

/**
 * Triggers fired by a comment on a post: answered by a private reply, matched on the
 * comment's text, and able to reply in public under it.
 */
const COMMENT_TRIGGERS = new Set<string>(["INSTAGRAM_COMMENT", "FACEBOOK_COMMENT"]);

export function isCommentTrigger(triggerEvent: string | undefined): boolean {
  return triggerEvent !== undefined && COMMENT_TRIGGERS.has(triggerEvent);
}

/**
 * The trigger events offered for a platform.
 *
 * `current` is the event the rule already has, so a legacy one keeps rendering
 * on the rule that uses it while nothing new can be authored against it — the
 * same rule as {@link getActionTypesForPlatform}.
 */
export function getTriggerEventsForPlatform(platform: Platform, current?: string) {
  return getTriggerEventsForPlatforms([platform], current);
}

/** Store events message the buyer from one account; mirrors rateup-api's wa_rule.schema.ts. */
const SINGLE_CHANNEL_TRIGGERS = new Set<string>(["SHOPIFY_EVENT", "WOOCOMMERCE_EVENT"]);
/** A chatbot belongs to one platform, so starting one needs a single channel. */
const SINGLE_CHANNEL_ACTIONS = new Set<string>(["TRIGGER_CHATBOT"]);

/** Whether every one of `platforms` can run `item`, and a multi-channel rule may use it. */
function runsOnAll(
  item: { value: string; platforms: readonly string[] },
  platforms: readonly string[],
  singleChannelOnly: ReadonlySet<string>,
) {
  if (platforms.length > 1 && singleChannelOnly.has(item.value)) return false;
  return platforms.every((platform) => item.platforms.includes(platform));
}

/** The trigger events every one of a rule's channels can fire. */
export function getTriggerEventsForPlatforms(platforms: readonly Platform[], current?: string) {
  return TRIGGER_EVENTS.filter(
    (e) =>
      runsOnAll(e, platforms, SINGLE_CHANNEL_TRIGGERS) &&
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
    label: "Trigger Journey",
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
  {
    label: "Send Products to Buy",
    value: "SEND_SHOP_PRODUCTS",
    platforms: ["WHATSAPP", "INSTAGRAM"],
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
  return getActionTypesForPlatforms([platform], current);
}

/** The action types every one of a rule's channels can run. */
export function getActionTypesForPlatforms(platforms: readonly Platform[], current?: string) {
  return ACTION_TYPES.filter(
    (a) =>
      runsOnAll(a, platforms, SINGLE_CHANNEL_ACTIONS) &&
      (!("legacy" in a && a.legacy) || a.value === current),
  );
}

const PLATFORM_LABEL = (platform: string) =>
  PLATFORMS.find((option) => option.value === platform)?.label ?? platform;

/** Why an action cannot run on these channels, or null when it can. */
export function actionChannelProblem(type: string, platforms: readonly string[]): string | null {
  const action = ACTION_TYPES.find((option) => option.value === type);
  if (!action) return null;
  if (platforms.length > 1 && SINGLE_CHANNEL_ACTIONS.has(type)) {
    return `“${action.label}” runs on one channel. Remove it, or pick a single channel`;
  }
  const missing = platforms.filter(
    (platform) => !(action.platforms as readonly string[]).includes(platform),
  );
  if (!missing.length) return null;
  return `“${action.label}” can't run on ${missing.map(PLATFORM_LABEL).join(" or ")}`;
}

/** Why a trigger cannot fire on these channels, or null when it can. */
export function triggerChannelProblem(value: string, platforms: readonly string[]): string | null {
  const event = TRIGGER_EVENTS.find((option) => option.value === value);
  if (!event) return null;
  if (platforms.length > 1 && SINGLE_CHANNEL_TRIGGERS.has(value)) {
    return "Store events send from one channel. Pick a single channel";
  }
  const missing = platforms.filter(
    (platform) => !(event.platforms as readonly string[]).includes(platform),
  );
  if (!missing.length) return null;
  return `This event doesn't happen on ${missing.map(PLATFORM_LABEL).join(" or ")}`;
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

/** Mirrors `shopProductsActionSchema` in rateup-api's commerce/shop/commentToBuy.schema.ts. */
export const shopProductsActionValueSchema = z.object({
  productIds: z.array(z.string()).min(1, "Pick at least one product").max(10),
  message: z.string().trim().max(600).optional(),
  dropLimit: z.number().int().min(1, "A drop needs at least 1 unit").nullish(),
});

const shopProductsActionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("SEND_SHOP_PRODUCTS"),
  value: shopProductsActionValueSchema,
});

const regularActionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(
    optionValues(ACTION_TYPES).filter(
      (value) =>
        value !== "CALL_EXTERNAL_API" &&
        value !== "SEND_TEMPLATE" &&
        value !== "ASSIGN_LIFECYCLE" &&
        value !== "SEND_SHOP_PRODUCTS",
    ) as [string, ...string[]],
  ),
  value: z.string().min(1, "Value is required"),
});

const ruleActionSchema = z.union([
  externalApiActionSchema,
  sendTemplateActionSchema,
  assignLifecycleActionSchema,
  shopProductsActionSchema,
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
  // Meta's own limit for an ig.me ref.
  instagramRef: z
    .string()
    .trim()
    .max(2083)
    .regex(/^[A-Za-z0-9_=-]*$/, "Use letters, numbers, - _ and = only")
    .optional(),
  // The ?ref= of an m.me link; mirrors the API's check in wa_rule.schema.ts.
  messengerRef: z
    .string()
    .trim()
    .max(2083)
    .regex(/^[A-Za-z0-9_=-]*$/, "Use letters, numbers, - _ and = only")
    .optional(),
  instagramPublicReplies: z
    .array(z.string().trim().max(2200, "Instagram comments stop at 2200 characters"))
    .max(10)
    .default([])
    .transform((replies) => replies.filter((reply) => reply.length > 0)),
  // Click-to-WhatsApp: mirrors the API's check in wa_rule.schema.ts.
  adIds: z
    .array(z.string().trim().min(1).max(64, "That doesn't look like an ad id"))
    .max(50)
    .optional(),
  adMatch: z.string().trim().max(200).optional(),
});

const createRuleBaseSchema = z.object({
  /** The first of `platforms`; the code that only needs one channel reads it. */
  platform: z.enum(optionValues(PLATFORMS)).default("WHATSAPP"),
  platforms: z.array(z.enum(optionValues(PLATFORMS))).min(1, "Pick at least one channel"),
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
  const triggerProblem = triggerChannelProblem(data.triggerEvent, data.platforms);
  if (triggerProblem) {
    ctx.addIssue({ code: "custom", path: ["triggerEvent"], message: triggerProblem });
  }
  data.actions.forEach((action, index) => {
    const problem = actionChannelProblem(action.type, data.platforms);
    if (problem)
      ctx.addIssue({ code: "custom", path: ["actions", index, "type"], message: problem });
  });

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

/** A new rule before anything is picked; saved rules and templates are merged over it. */
export const DEFAULT_RULE_VALUES = {
  platform: "WHATSAPP",
  platforms: ["WHATSAPP"],
  whatsappSettingsPhoneIds: [],
  name: "",
  triggerEvent: "MESSAGE_RECEIVED",
  operator: "AND",
  isActive: true,
  groups: [
    {
      operator: "AND",
      conditions: [{ field: "MESSAGE_BODY", operator: "CONTAINS", value: "" }],
    },
  ],
  // Empty, not a placeholder: an unfinished one-channel action (a chatbot) blocked every other
  // channel on the trigger step. The actions step asks for one before it continues.
  actions: [],
  options: {
    sendOncePerDay: false,
    businessHours: {
      enabled: false,
      businessHoursId: undefined,
    },
    instagramScope: "ALL",
    instagramPostIds: [],
    instagramPublicReplies: [],
    shopifyProductIds: [],
    wooProductIds: [],
  },
} satisfies Partial<CreateRuleValues>;
