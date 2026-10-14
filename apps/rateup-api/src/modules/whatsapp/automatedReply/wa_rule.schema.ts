import { z } from "zod";
import { ShopifyEvents } from "../../../types/enums.js";
import {
  MAX_ABANDONED_DELAY_MINUTES,
  MIN_ABANDONED_DELAY_MINUTES,
} from "../../integrations/shopify/abandonedCheckout.constants.js";
import {
  ActionType,
  ConditionField,
  ConditionOperator,
  RuleOperator,
  RulePlatform,
  TriggerEvent,
} from "../../../../generated/prisma/enums.js";
import { WOO_TRIGGER_STATUSES } from "../../integrations/woocommerce/woocommerce.mapping.js";

/** Topics that only feed stored state; a rule cannot be triggered by them. */
const NON_TRIGGER_EVENTS = new Set<string>([
  ShopifyEvents.APP_UNINSTALLED,
  ShopifyEvents.APP_SUBSCRIPTIONS_UPDATE,
  ShopifyEvents.CHECKOUTS_CREATE,
  ShopifyEvents.CHECKOUTS_UPDATE,
  ShopifyEvents.CHECKOUTS_DELETE,
  ShopifyEvents.CUSTOMERS_REDACT,
  ShopifyEvents.SHOP_REDACT,
]);
const SHOPIFY_TRIGGER_EVENTS = Object.values(ShopifyEvents).filter(
  (value) => !NON_TRIGGER_EVENTS.has(value),
) as [string, ...string[]];

export const ruleConditionSchema = z.object({
  id: z.string().optional(),
  field: z.enum(ConditionField),
  operator: z.enum(ConditionOperator),
  value: z.string().trim().optional(),
});

export const ruleConditionGroupSchema = z.object({
  id: z.string().optional(),
  operator: z.enum(RuleOperator).default("AND"),
  conditions: z.array(ruleConditionSchema).min(1),
});

export const ruleActionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(ActionType),
  value: z.any().optional(),
});

export const ruleOptionsSchema = z.object({
  sendOncePerDay: z.boolean().optional(),
  shopifyEvent: z.enum(SHOPIFY_TRIGGER_EVENTS).optional(),
  businessHours: z
    .object({
      enabled: z.boolean(),
      businessHoursId: z.string().optional(),
    })
    .optional(),
  // Shopify-specific options
  shopifyProductIds: z.array(z.string()).optional(),
  // WooCommerce-specific options
  wooEvent: z.enum(WOO_TRIGGER_STATUSES).optional(),
  wooProductIds: z.array(z.string()).optional(),
  // Abandoned checkouts: how long a checkout sits untouched before this rule reminds, and
  // whether to message only buyers who accepted marketing at checkout.
  abandonedCheckoutDelayMinutes: z
    .number()
    .int()
    .min(MIN_ABANDONED_DELAY_MINUTES)
    .max(MAX_ABANDONED_DELAY_MINUTES)
    .optional(),
  requireMarketingConsent: z.boolean().optional(),
  // Instagram-specific options
  instagramScope: z.enum(["ALL", "SPECIFIC"]).optional(),
  instagramPostIds: z.array(z.string()).optional(),
  // Unset means both, which is how comment rules behaved before live comments were split out.
  instagramCommentSource: z.enum(["ALL", "POSTS", "LIVE"]).optional(),
  // The ?ref= of an ig.me link; unset matches every link. Meta allows these characters.
  // Meta's own limit for an ig.me ref.
  instagramRef: z
    .string()
    .trim()
    .max(2083)
    .regex(/^[A-Za-z0-9_=-]*$/, "Use letters, numbers, - _ and = only")
    .optional(),
  // Posted under the comment, one picked at random; 2200 is Instagram's comment limit.
  instagramPublicReplies: z.array(z.string().trim().min(1).max(2200)).max(10).optional(),
});

/** Triggers Messenger has no equivalent for. */
const INSTAGRAM_ONLY_TRIGGERS = new Set<string>([
  TriggerEvent.INSTAGRAM_COMMENT,
  TriggerEvent.INSTAGRAM_STORY_MENTION,
  TriggerEvent.INSTAGRAM_REFERRAL,
]);
/** Actions that send WhatsApp-only message types. */
const WHATSAPP_ONLY_ACTIONS = new Set<string>([ActionType.SEND_TEMPLATE, ActionType.SEND_FLOW]);

/**
 * A Facebook (Messenger) rule may not use Instagram's triggers or WhatsApp's template and
 * flow sends: neither can ever run on a Page. Only checked when the body names the
 * platform, which an update that leaves the platform alone does not.
 */
function refineMessengerRule(
  data: {
    platform?: string;
    triggerEvent?: string;
    actions?: Array<{ type: string }>;
  },
  ctx: z.RefinementCtx,
) {
  if (data.platform !== RulePlatform.FACEBOOK) return;
  if (data.triggerEvent && INSTAGRAM_ONLY_TRIGGERS.has(data.triggerEvent)) {
    ctx.addIssue({
      code: "custom",
      path: ["triggerEvent"],
      message: "This trigger is only available for Instagram",
    });
  }
  data.actions?.forEach((action, index) => {
    if (WHATSAPP_ONLY_ACTIONS.has(action.type)) {
      ctx.addIssue({
        code: "custom",
        path: ["actions", index, "type"],
        message: "Templates and flows can only be sent on WhatsApp",
      });
    }
  });
}

const createRuleBaseSchema = z.object({
  platform: z.enum(RulePlatform).default("WHATSAPP"),
  whatsappSettingsPhoneIds: z.array(z.string()).min(1),
  name: z.string().min(1, "Rule name must be at least 1 characters long"),
  operator: z.enum(RuleOperator).default("AND"),
  isActive: z.boolean().default(true),
  triggerEvent: z.enum(TriggerEvent),
  groups: z.array(ruleConditionGroupSchema).optional(),
  actions: z.array(ruleActionSchema).optional(),
  options: ruleOptionsSchema.optional(),
});

export const createRuleSchema = createRuleBaseSchema.superRefine((data, ctx) => {
  refineMessengerRule(data, ctx);
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
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;

export const updateRuleSchema = createRuleBaseSchema.partial().superRefine((data, ctx) => {
  refineMessengerRule(data, ctx);
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
});

export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

export const ruleIdParamSchema = z.object({
  id: z.string(),
});

export const getRulesQuerySchema = z.object({
  orgId: z.string().optional(),
});

export const getRulesByAutomationIdQuerySchema = z.object({
  automationId: z.string(),
});

export type RuleOptions = z.infer<typeof ruleOptionsSchema>;
