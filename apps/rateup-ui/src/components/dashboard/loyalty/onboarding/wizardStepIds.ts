import { ONBOARDING_STEPS } from "@/backend/loyalty/onboardingSteps";

/**
 * The five saveable steps, plus a final launch screen that only activates. Icon-free, apart
 * from `wizardSteps.ts`, because the wizard route's search validator runs in the client entry.
 */
export const WIZARD_STEP_IDS = [...ONBOARDING_STEPS, "launch"] as const;
export type WizardStep = (typeof WIZARD_STEP_IDS)[number];
