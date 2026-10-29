import type { AutomationPlatform } from "@/types/platform.ts";

export const WIZARD_STEPS = ["channel", "start", "details"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

/** Picked on the "Starting point" step instead of an example. */
export const FROM_SCRATCH = "scratch";

export interface WizardSelection {
  platform?: AutomationPlatform;
  /** An example's key, or FROM_SCRATCH. */
  start?: string;
  name?: string;
}

export function nextStep(current: WizardStep): WizardStep | null {
  const index = WIZARD_STEPS.indexOf(current);
  return index >= 0 && index < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[index + 1]! : null;
}

export function previousStep(current: WizardStep): WizardStep | null {
  const index = WIZARD_STEPS.indexOf(current);
  return index > 0 ? WIZARD_STEPS[index - 1]! : null;
}

/** Whether a step has what it needs for the run to move past it. */
export function isStepComplete(step: WizardStep, selection: WizardSelection): boolean {
  switch (step) {
    case "channel":
      return Boolean(selection.platform);
    case "start":
      return Boolean(selection.start);
    case "details":
      return (selection.name?.trim().length ?? 0) >= 3;
  }
}
