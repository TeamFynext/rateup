import { z } from "zod";
import {
  ActionType,
  ConditionField,
  ConditionOperator,
  RuleOperator,
  TriggerEvent,
} from "../../../../generated/prisma/enums.js";

export const ruleConditionSchema = z.object({
  id: z.string().optional(),
  field: z.enum(ConditionField),
  operator: z.enum(ConditionOperator),
  value: z.string().optional(),
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
  businessHours: z
    .object({
      enabled: z.boolean(),
      businessHoursId: z.string().optional(),
    })
    .optional(),
});

export const createRuleSchema = z.object({
  whatsappSettingsPhoneIds: z.array(z.string()).min(1),
  name: z.string().min(1, "Rule name must be at least 1 characters long"),
  operator: z.enum(RuleOperator).default("AND"),
  isActive: z.boolean().default(true),
  triggerEvent: z.enum(TriggerEvent),
  groups: z.array(ruleConditionGroupSchema).optional(),
  actions: z.array(ruleActionSchema).optional(),
  options: ruleOptionsSchema.optional(),
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;

export const updateRuleSchema = createRuleSchema.partial();

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
