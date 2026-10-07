import { createFileRoute } from "@tanstack/react-router";

import { LoyaltyOnboardingPage } from "@/components/dashboard/loyalty/onboarding/LoyaltyOnboardingPage.tsx";
import {
  WIZARD_STEP_IDS,
  type WizardStep,
} from "@/components/dashboard/loyalty/onboarding/wizardStepIds.ts";
import { oneOf } from "@/utils/search.ts";

export const Route = createFileRoute("/dashboard/loyalty/onboarding/")({
  /** `step` deep-links into a step. Omitted, the wizard resumes where the user left off. */
  validateSearch: (search: Record<string, unknown>): { step?: WizardStep } => ({
    step: oneOf(WIZARD_STEP_IDS, search.step),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { step } = Route.useSearch();

  return <LoyaltyOnboardingPage initialStep={step} />;
}
