import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { LoyaltyOnboardingPage } from "@/components/dashboard/loyalty/onboarding/LoyaltyOnboardingPage.tsx";
import { WIZARD_STEPS } from "@/components/dashboard/loyalty/onboarding/wizardSteps.ts";

const searchSchema = z.object({
  /** Deep-link into a specific step. Omitted, the wizard resumes where the user left off. */
  step: z.enum(WIZARD_STEPS).optional().catch(undefined),
});

export const Route = createFileRoute("/dashboard/loyalty/onboarding/")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { step } = Route.useSearch();

  return <LoyaltyOnboardingPage initialStep={step} />;
}
