import type {
  ActionType,
  ConditionField,
  ConditionOperator,
  TriggerEvent,
} from "@/components/dashboard/automation/components/schema.ts";

// import type { SendTemplateActionValue } from "@/components/dashboard/automation/components/schema.ts";

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
  platform?: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
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
  value: string | null | undefined;
  ruleId: string;
};

export type CreateRule = Omit<Rule, "id" | "createdAt" | "updatedAt" | "orgId">;
