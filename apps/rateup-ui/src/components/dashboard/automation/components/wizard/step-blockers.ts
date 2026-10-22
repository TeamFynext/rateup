import type { FieldPath } from "react-hook-form";

import type { WizardStep } from "@/components/dashboard/automation/rule-sentence.ts";

import type { CreateRuleInput } from "../schema.ts";
import { ACTION_TYPES, createRuleSchema, PLATFORMS } from "../schema.ts";

/** The fields each step owns: what Continue validates, and where a failed save sends you. */
export const STEP_FIELDS: Record<WizardStep, readonly FieldPath<CreateRuleInput>[]> = {
  template: [],
  trigger: [
    "platform",
    "platforms",
    "whatsappSettingsPhoneIds",
    "triggerEvent",
    "options.shopifyEvent",
    "options.wooEvent",
  ],
  conditions: [
    "operator",
    "groups",
    "options.shopifyProductIds",
    "options.wooProductIds",
    "options.abandonedCheckoutDelayMinutes",
    "options.requireMarketingConsent",
    "options.instagramScope",
    "options.instagramPostIds",
    "options.instagramCommentSource",
    "options.instagramRef",
    "options.messengerRef",
  ],
  actions: ["actions", "options.instagramPublicReplies"],
  review: ["name", "options.sendOncePerDay", "options.businessHours"],
};

const ORDER: readonly WizardStep[] = ["template", "trigger", "conditions", "actions", "review"];

/** Which step shows the field a form path points at. */
export function stepFor(path: readonly (string | number)[]): WizardStep {
  const name = path.join(".");
  return (
    ORDER.find((step) =>
      STEP_FIELDS[step].some((field) => name === field || name.startsWith(`${field}.`)),
    ) ?? "review"
  );
}

const DUPLICATE_CONDITION = "Duplicate conditions are not allowed";
const DUPLICATE_ACTION = "Duplicate actions are not allowed";

/** The schema's message, said as what to do next. */
function sayWhatToDo(path: readonly (string | number)[], message: string, rule: CreateRuleInput) {
  const [head, index] = path;
  if (head === "whatsappSettingsPhoneIds") return "Tick at least one account to continue";
  if (head === "name") return "Give it a name to switch it on";
  if (head === "groups") {
    if (message === DUPLICATE_CONDITION) return "Remove the repeated condition";
    if (path.length === 1) return "Add at least one condition";
    return "Fill in every condition";
  }
  if (head === "actions") {
    if (message === DUPLICATE_ACTION) return "Two actions are the same — remove one";
    if (path.length === 1) return "Add at least one action";
    if (path[2] === "type") return message;
    const type = rule.actions?.[Number(index)]?.type;
    const label = ACTION_TYPES.find((option) => option.value === type)?.label;
    return label ? `Finish the “${label}” action` : "Finish every action";
  }
  return message;
}

/**
 * Why the step cannot be left yet, or null. Runs the form's own schema so it can never disagree
 * with save. The cross-field checks are repeated here because zod skips an object's refinement
 * while any of its fields fail, and those fields may belong to a later step.
 */
export function blockerFor(
  step: WizardStep,
  rule: CreateRuleInput,
  /** Which platform each connected account is on; the per-channel account check needs it. */
  platformOf?: ReadonlyMap<string, string>,
): string | null {
  const options = rule.options ?? {};
  if (step === "trigger") {
    const accounts = rule.whatsappSettingsPhoneIds ?? [];
    const bare = platformOf
      ? rule.platforms.find((platform) => !accounts.some((id) => platformOf.get(id) === platform))
      : undefined;
    if (bare && accounts.length) {
      const label = PLATFORMS.find((option) => option.value === bare)?.label ?? bare;
      return `Tick a ${label} account, or turn ${label} off`;
    }
    if (rule.triggerEvent === "SHOPIFY_EVENT" && !options.shopifyEvent) {
      return "Pick a Shopify event to continue";
    }
    if (rule.triggerEvent === "WOOCOMMERCE_EVENT" && !options.wooEvent) {
      return "Pick an order status to continue";
    }
  }
  if (step === "conditions") {
    const hasCondition = (rule.groups ?? []).some((group) => group.conditions.length > 0);
    if (rule.triggerEvent === "MESSAGE_RECEIVED" && !hasCondition) {
      return "Add at least one condition — without one it would answer every message";
    }
    const instagram =
      rule.triggerEvent === "INSTAGRAM_COMMENT" || rule.triggerEvent === "INSTAGRAM_STORY_MENTION";
    if (instagram && options.instagramScope === "SPECIFIC" && !options.instagramPostIds?.length) {
      return "Pick at least one post";
    }
  }
  if (
    step === "review" &&
    options.businessHours?.enabled &&
    !options.businessHours.businessHoursId
  ) {
    return "Pick which business hours";
  }

  const parsed = createRuleSchema.safeParse(rule);
  if (parsed.success) return null;
  const issue = parsed.error.issues.find((candidate) => {
    const path = candidate.path.map((key) => (typeof key === "symbol" ? "" : key));
    return stepFor(path) === step;
  });
  if (!issue) return null;
  const path = issue.path.map((key) => (typeof key === "symbol" ? "" : key));
  return sayWhatToDo(path, issue.message, rule);
}
