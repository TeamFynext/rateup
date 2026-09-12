import { LOYALTY_FEEDBACK_FLOW_CATEGORY } from "@/types/enums.ts";

import { FLOW_PURPOSES } from "../constants.tsx";

/**
 * What a new flow is for. The purpose *is* the category the flow is created with — there is no
 * separate identifier to map back — and it decides whether a template step follows.
 */
export type FlowType = (typeof FLOW_PURPOSES)[number]["value"];

export function isFlowType(value: unknown): value is FlowType {
  return FLOW_PURPOSES.some((purpose) => purpose.value === value);
}

/**
 * Whether the purpose has ready-made flows to choose from. Only loyalty feedback does; the
 * templates endpoint answers every other category with an empty catalogue, so returning true
 * for one of those would show an empty step.
 */
export function hasTemplates(type: FlowType): boolean {
  return type === LOYALTY_FEEDBACK_FLOW_CATEGORY;
}

/**
 * The category whose catalogue a run should load, or undefined when the purpose has none.
 * This is also the query key, which is what keeps a cached loyalty catalogue out of a run for
 * another purpose — a disabled query still serves cached data for a matching key.
 */
export function templateCategoryFor(type: FlowType | undefined): FlowType | undefined {
  return type && hasTemplates(type) ? type : undefined;
}

export const WIZARD_STEPS = ["type", "template", "details"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export function isWizardStep(value: unknown): value is WizardStep {
  return WIZARD_STEPS.some((step) => step === value);
}

/** The steps a wizard run visits for a purpose; before one is chosen, only the first. */
export function stepsFor(type: FlowType | undefined): readonly WizardStep[] {
  if (!type) return ["type"];
  return hasTemplates(type) ? WIZARD_STEPS : ["type", "details"];
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
