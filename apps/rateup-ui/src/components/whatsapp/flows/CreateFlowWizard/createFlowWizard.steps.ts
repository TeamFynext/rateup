import { LOYALTY_FEEDBACK_FLOW_CATEGORY } from "@/types/enums.ts";

/**
 * What a new flow is for. The choice decides which steps follow and which categories the
 * flow is created with — Loyalty feedback is RateUp's own category (mapped to SURVEY at Meta),
 * everything else is Meta's list and the user picks from it.
 */
export const FLOW_TYPES = ["loyalty_feedback", "other"] as const;
export type FlowType = (typeof FLOW_TYPES)[number];

export interface FlowTypeMeta {
  /** Fixed categories; undefined means the details step asks for them. */
  categories?: readonly string[];
  /** Whether the template step is shown. */
  hasTemplates: boolean;
}

export const FLOW_TYPE_META: Record<FlowType, FlowTypeMeta> = {
  loyalty_feedback: { categories: [LOYALTY_FEEDBACK_FLOW_CATEGORY], hasTemplates: true },
  other: { hasTemplates: false },
};

export function isFlowType(value: unknown): value is FlowType {
  return FLOW_TYPES.some((type) => type === value);
}

export const WIZARD_STEPS = ["type", "template", "details"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export function isWizardStep(value: unknown): value is WizardStep {
  return WIZARD_STEPS.some((step) => step === value);
}

/** The steps a wizard run visits for a type; before a type is chosen, only the first. */
export function stepsFor(type: FlowType | undefined): readonly WizardStep[] {
  if (!type) return ["type"];
  return FLOW_TYPE_META[type].hasTemplates ? WIZARD_STEPS : ["type", "details"];
}

export function nextStep(type: FlowType | undefined, current: WizardStep): WizardStep | null {
  const steps = stepsFor(type);
  const index = steps.indexOf(current);
  return index >= 0 && index < steps.length - 1 ? steps[index + 1]! : null;
}

export function previousStep(type: FlowType | undefined, current: WizardStep): WizardStep | null {
  const steps = stepsFor(type);
  const index = steps.indexOf(current);
  return index > 0 ? steps[index - 1]! : null;
}
