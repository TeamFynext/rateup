import { shopProductsActionSchema } from "../../commerce/shop/commentToBuy.schema.js";
import { SHOP_ORDER_EVENTS } from "../../commerce/shop/shopEvents.constants.js";
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
  ShopifyEvents.PRODUCTS_CREATE,
  ShopifyEvents.PRODUCTS_UPDATE,
  ShopifyEvents.PRODUCTS_DELETE,
  ShopifyEvents.INVENTORY_LEVELS_UPDATE,
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
  // RateUp shop orders: which order event, optionally narrowed to products (ShopProduct ids).
  shopOrderEvent: z.enum(SHOP_ORDER_EVENTS).optional(),
  shopProductIds: z.array(z.string()).optional(),
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
  // Click-to-WhatsApp: the ad ids a rule answers, or words in the ad's headline or link.
  adIds: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
  adMatch: z.string().trim().max(200).optional(),
});

/** Triggers only Instagram has. */
const INSTAGRAM_ONLY_TRIGGERS = new Set<string>([
  TriggerEvent.INSTAGRAM_COMMENT,
  TriggerEvent.INSTAGRAM_STORY_MENTION,
  TriggerEvent.INSTAGRAM_REFERRAL,
]);
/** Triggers only WhatsApp has. */
const WHATSAPP_ONLY_TRIGGERS = new Set<string>([TriggerEvent.WHATSAPP_AD_REFERRAL]);
/** Store events message the buyer from one account, so they cannot span channels. */
const SINGLE_CHANNEL_TRIGGERS = new Set<string>([
  ...INSTAGRAM_ONLY_TRIGGERS,
  ...WHATSAPP_ONLY_TRIGGERS,
  TriggerEvent.SHOPIFY_EVENT,
  TriggerEvent.WOOCOMMERCE_EVENT,
]);
/** Actions that send WhatsApp-only message types. */
const WHATSAPP_ONLY_ACTIONS = new Set<string>([ActionType.SEND_TEMPLATE, ActionType.SEND_FLOW]);

/** The channels a request names: `platforms`, or the single `platform` older clients send. */
export function requestedPlatforms(data: {
  platform?: string;
  platforms?: string[];
}): RulePlatform[] | undefined {
  if (data.platforms?.length) return data.platforms as RulePlatform[];
  return data.platform ? [data.platform as RulePlatform] : undefined;
}

/**
 * Keeps each trigger and action on the channels that can run it: Instagram's triggers on
 * Instagram, templates and flows on WhatsApp, and store events and chatbots (each bot belongs
 * to one platform) on a single channel. Only checked when the body names the channels, which
 * an update that leaves them alone does not.
 */
function refineRuleChannels(
  data: {
    platform?: string;
    platforms?: string[];
    triggerEvent?: string;
    actions?: Array<{ type: string; value?: unknown }>;
  },
  ctx: z.RefinementCtx,
) {
  const platforms = requestedPlatforms(data);
  if (!platforms) return;
  const multiChannel = platforms.length > 1;

  if (data.triggerEvent && INSTAGRAM_ONLY_TRIGGERS.has(data.triggerEvent)) {
    if (platforms.some((platform) => platform !== RulePlatform.INSTAGRAM)) {
      ctx.addIssue({
        code: "custom",
        path: ["triggerEvent"],
        message: "This trigger is only available for Instagram",
      });
    }
  } else if (data.triggerEvent && WHATSAPP_ONLY_TRIGGERS.has(data.triggerEvent)) {
    if (platforms.some((platform) => platform !== RulePlatform.WHATSAPP)) {
      ctx.addIssue({
        code: "custom",
        path: ["triggerEvent"],
        message: "This trigger is only available for WhatsApp",
      });
    }
  } else if (multiChannel && data.triggerEvent && SINGLE_CHANNEL_TRIGGERS.has(data.triggerEvent)) {
    ctx.addIssue({
      code: "custom",
      path: ["triggerEvent"],
      message: "Store events send from one channel. Pick a single channel for this trigger",
    });
  }

  data.actions?.forEach((action, index) => {
    if (
      WHATSAPP_ONLY_ACTIONS.has(action.type) &&
      platforms.some((platform) => platform !== RulePlatform.WHATSAPP)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["actions", index, "type"],
        message: "Templates and flows can only be sent on WhatsApp",
      });
    }
    if (action.type === ActionType.SEND_SHOP_PRODUCTS) {
      if (platforms.includes(RulePlatform.FACEBOOK)) {
        ctx.addIssue({
          code: "custom",
          path: ["actions", index, "type"],
          message: "Products can only be sent this way on WhatsApp and Instagram",
        });
      }
      if (!shopProductsActionSchema.safeParse(action.value).success) {
        ctx.addIssue({
          code: "custom",
          path: ["actions", index, "value"],
          message: "Pick at least one product, and a drop size of 1 or more",
        });
      }
    }
    if (multiChannel && action.type === ActionType.TRIGGER_CHATBOT) {
      ctx.addIssue({
        code: "custom",
        path: ["actions", index, "type"],
        message: "A chatbot runs on one channel. Pick a single channel to start one",
      });
    }
  });
}

const createRuleBaseSchema = z.object({
  platform: z.enum(RulePlatform).default("WHATSAPP"),
  platforms: z.array(z.enum(RulePlatform)).min(1).optional(),
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
  refineRuleChannels(data, ctx);
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
  if (data.triggerEvent === "SHOP_ORDER_EVENT" && !data.options?.shopOrderEvent) {
    ctx.addIssue({
      code: "custom",
      path: ["options", "shopOrderEvent"],
      message: "Select an order event",
    });
  }
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;

export const updateRuleSchema = createRuleBaseSchema.partial().superRefine((data, ctx) => {
  refineRuleChannels(data, ctx);
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
  if (data.triggerEvent === "SHOP_ORDER_EVENT" && !data.options?.shopOrderEvent) {
    ctx.addIssue({
      code: "custom",
      path: ["options", "shopOrderEvent"],
      message: "Select an order event",
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
