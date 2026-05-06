import {
  ActionType,
  ConditionField,
  ConditionOperator,
  TriggerEvent,
} from "@/app/dashboard/automation/components/schema";
import type { SendTemplateActionValue } from "@/app/dashboard/automation/components/schema";

export type Rule = {
  id: string;
  name: string;
  triggerEvent: TriggerEvent;
  operator: "AND" | "OR";
  groups: RuleGroup[];
  actions: RuleAction[];
  isActive: boolean;
  orgId: string;
  whatsappSettingsPhoneIds: string[];
  createdAt: Date;
  updatedAt: Date;
  options?: {
    sendOncePerDay?: boolean;
    shopifyEvent?: string;
    shopifyProductIds?: string[];
    businessHours?: {
      enabled: boolean;
      businessHoursId: string | undefined;
    };
  };
};

export type RuleGroup = {
  id: string;
  operator: "AND" | "OR";
  conditions: RuleCondition[];
  ruleId: string;
};

export type RuleCondition = {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
  ruleGroupId: string;
};

export type RuleAction = {
  id: string;
  type: ActionType;
  value: string | SendTemplateActionValue | null | undefined;
  ruleId: string;
};

export type CreateRule = Omit<Rule, "id" | "createdAt" | "updatedAt" | "orgId">;
