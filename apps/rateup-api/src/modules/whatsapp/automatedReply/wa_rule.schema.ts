import { z } from "zod";
import { ShopifyEvents } from "../../../types/enums.js";
import {
  ActionType,
  ConditionField,
  ConditionOperator,
  RuleOperator,
  RulePlatform,
  TriggerEvent,
} from "../../../../generated/prisma/enums.js";

const SHOPIFY_TRIGGER_EVENTS = Object.values(ShopifyEvents).filter(
  (value) =>
    value !== ShopifyEvents.ORDERS_EDITED &&
    value !== ShopifyEvents.APP_UNINSTALLED &&
    value !== ShopifyEvents.APP_SUBSCRIPTIONS_UPDATE,
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
  // Instagram-specific options
  instagramScope: z.enum(["ALL", "SPECIFIC"]).optional(),
  instagramPostIds: z.array(z.string()).optional(),
});

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
  if (data.triggerEvent === "SHOPIFY_EVENT" && !data.options?.shopifyEvent) {
    ctx.addIssue({
      code: "custom",
      path: ["options", "shopifyEvent"],
      message: "Select a Shopify event",
    });
  }
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;

export const updateRuleSchema = createRuleBaseSchema.partial().superRefine((data, ctx) => {
  if (data.triggerEvent === "SHOPIFY_EVENT" && !data.options?.shopifyEvent) {
    ctx.addIssue({
      code: "custom",
      path: ["options", "shopifyEvent"],
      message: "Select a Shopify event",
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
