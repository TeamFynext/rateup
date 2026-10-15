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

/**
 * The steps a run visits. Opened from a channel's own page, the channel is already known and
 * its step is skipped.
 */
export function stepsFor(channelFixed: boolean): readonly WizardStep[] {
  return channelFixed ? ["start", "details"] : WIZARD_STEPS;
}

export function nextStep(channelFixed: boolean, current: WizardStep): WizardStep | null {
  const steps = stepsFor(channelFixed);
  const index = steps.indexOf(current);
  return index >= 0 && index < steps.length - 1 ? steps[index + 1]! : null;
}

export function previousStep(channelFixed: boolean, current: WizardStep): WizardStep | null {
  const steps = stepsFor(channelFixed);
  const index = steps.indexOf(current);
  return index > 0 ? steps[index - 1]! : null;
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

/** The step a run opens on: the channel step, unless the channel is fixed. */
export function firstStep(channelFixed: boolean): WizardStep {
  return stepsFor(channelFixed)[0]!;
}
