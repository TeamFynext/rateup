import { z } from "zod";

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

// Single source of truth for trigger events
export const TRIGGER_EVENTS = [
  { label: "Message Received", value: "MESSAGE_RECEIVED" },
  { label: "Chat Closed", value: "CHAT_CLOSED" },
  { label: "Chat Assigned", value: "CHAT_ASSIGNED" },
  { label: "Contact Created", value: "CONTACT_CREATED" },
  { label: "Lifecycle Updated", value: "LIFECYCLE_UPDATED" },
] as const;

// Single source of truth for action types
export const ACTION_TYPES = [
  { label: "Close Chat", value: "CLOSE_TICKET" },
  { label: "Trigger Chatbot", value: "TRIGGER_CHATBOT" },
  { label: "Call External API", value: "CALL_EXTERNAL_API" },
  { label: "Send Web Survey", value: "SEND_WEB_SURVEY" },
  { label: "Send Message", value: "SEND_MESSAGE" },
  { label: "Send Flow", value: "SEND_FLOW" },
  { label: "Assign Team", value: "ASSIGN_TEAM" },
  { label: "Assign User", value: "ASSIGN_USER" },
  { label: "Attach Label", value: "ATTACH_LABEL" },
  { label: "Assign Lifecycle", value: "ASSIGN_LIFECYCLE" },
] as const;

// Single source of truth for group operators
export const GROUP_OPERATORS = [
  { label: "AND", value: "AND" },
  { label: "OR", value: "OR" },
] as const;

export const ruleConditionSchema = z.object({
  id: z.string().optional(),
  field: z.enum(CONDITION_FIELDS.map((f) => f.value) as [string, ...string[]]),
  operator: z.enum(
    CONDITION_OPERATORS.map((o) => o.value) as [string, ...string[]],
  ),
  value: z.string().min(1, "Value is required"),
});

const externalApiActionSchema = z.object({
  id: z.string().optional(),
  type: z.literal("CALL_EXTERNAL_API"),
  value: z.url("Enter a valid full URL (e.g. https://example.com/webhook)"),
});

const regularActionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(
    ACTION_TYPES.map((t) => t.value).filter(
      (v) => v !== "CALL_EXTERNAL_API",
    ) as [string, ...string[]],
  ),
  value: z.string().min(1, "Value is required"),
});

export const ruleActionSchema = z.union([
  externalApiActionSchema,
  regularActionSchema,
]);

export const ruleGroupSchema = z.object({
  id: z.string().optional(),
  operator: z
    .enum(GROUP_OPERATORS.map((o) => o.value) as [string, ...string[]])
    .default("AND"),
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
  businessHours: z
    .object({
      enabled: z.boolean().default(false),
      businessHoursId: z.string().optional(),
    })
    .default({
      enabled: false,
      businessHoursId: undefined,
    }),
});

const createRuleBaseSchema = z.object({
  whatsappSettingsPhoneIds: z
    .array(z.string())
    .min(1, "Select at least one account"),
  name: z.string().min(1, "Name is required"),
  operator: z
    .enum(GROUP_OPERATORS.map((o) => o.value) as [string, ...string[]])
    .default("AND"),
  isActive: z.boolean().default(true),
  triggerEvent: z.enum(
    TRIGGER_EVENTS.map((t) => t.value) as [string, ...string[]],
  ),
  groups: z.array(ruleGroupSchema),
  actions: z
    .array(ruleActionSchema)
    .min(1, "At least one action is required")
    .refine(
      (items) => {
        const seen = new Set();
        for (const item of items) {
          const key = `${item.type}-${item.value}`;
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
    businessHours: {
      enabled: false,
      businessHoursId: undefined,
    },
  }),
});

export const createRuleSchema = createRuleBaseSchema.refine(
  (data) => {
    // Only require groups/conditions for MESSAGE_RECEIVED trigger
    if (data.triggerEvent === "MESSAGE_RECEIVED") {
      if (data.groups.length === 0) return false;
      // Check if at least one group has conditions
      return data.groups.some((group) => group.conditions.length > 0);
    }
    return true;
  },
  {
    path: ["groups"],
    error: "At least one condition is required for Message Received trigger",
  },
);

export type CreateRuleInput = z.input<typeof createRuleSchema>;

const updateRuleSchema = createRuleBaseSchema.partial();

export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

// --- Type Exports for Compatibility ---

export type TriggerEvent = z.infer<typeof createRuleSchema>["triggerEvent"];
export type ConditionField = z.infer<typeof ruleConditionSchema>["field"];
export type ConditionOperator = z.infer<typeof ruleConditionSchema>["operator"];
export type ActionType = z.infer<typeof ruleActionSchema>["type"];
export type RuleGroup = z.infer<typeof ruleGroupSchema>;
export type RuleCondition = z.infer<typeof ruleConditionSchema>;
export type RuleAction = z.infer<typeof ruleActionSchema>;
