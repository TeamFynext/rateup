import type { OnboardingState, OnboardingStep } from "@/backend/loyalty/onboarding.api";
import { ONBOARDING_STEPS } from "@/backend/loyalty/onboarding.api";

/**
 * How far setup has got, from the server's own record. The Overview's draft card and the
 * Program page both read this, so both count the same steps done.
 */

export type ProgramStepId = OnboardingStep | "launch";

export const PROGRAM_STEPS: readonly ProgramStepId[] = [...ONBOARDING_STEPS, "launch"];

export interface ProgramStepProgress {
  id: ProgramStepId;
  done: boolean;
}

export interface ProgramProgress {
  steps: ProgramStepProgress[];
  doneCount: number;
  leftCount: number;
  /** The first step still to do, or null once the programme is live. */
  nextStep: ProgramStepId | null;
  isLive: boolean;
}

export function buildProgramProgress(state: OnboardingState | null | undefined): ProgramProgress {
  const status = state?.program?.status;
  const isLive = status === "active" || status === "paused";
  const last = state?.lastCompletedStep ?? null;
  const lastIndex = last ? ONBOARDING_STEPS.indexOf(last) : -1;

  const steps: ProgramStepProgress[] = PROGRAM_STEPS.map((id, index) => ({
    id,
    // Every saved step is done; launch is done once the programme has been activated.
    done: id === "launch" ? isLive : isLive || index <= lastIndex,
  }));

  const doneCount = steps.filter((s) => s.done).length;
  return {
    steps,
    doneCount,
    leftCount: steps.length - doneCount,
    nextStep: steps.find((s) => !s.done)?.id ?? null,
    isLive,
  };
}
