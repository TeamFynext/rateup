import type { CreateRuleValues } from "@/components/dashboard/automation/components/schema.ts";

// import type { SendTemplateActionValue } from "@/components/dashboard/automation/components/schema.ts";

/**
 * A saved automation rule: everything the builder's schema produces, plus the columns the
 * server owns.
 */
export interface Rule extends CreateRuleValues {
  id: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A rule's condition groups, as the builder's schema models them. */
export type RuleGroup = CreateRuleValues["groups"][number];

/**
 * The create/update payload: exactly what the rule builder's schema produces. A saved `Rule`
 * additionally carries the ids and back-references the server owns.
 */
export type CreateRule = CreateRuleValues;
