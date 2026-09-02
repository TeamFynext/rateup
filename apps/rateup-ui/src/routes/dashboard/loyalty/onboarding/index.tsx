import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { LoyaltyOnboardingPage } from "@/components/dashboard/loyalty/onboarding/LoyaltyOnboardingPage.tsx";

const searchSchema = z.object({
  /** Deep-link into a specific step. Omitted, the wizard resumes where the user left off. */
  step: z.enum(["basics", "earning", "tiers", "rewards", "messages", "review"]).optional(),
});

export const Route = createFileRoute("/dashboard/loyalty/onboarding/")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { step } = Route.useSearch();

  return <LoyaltyOnboardingPage initialStep={step} />;
}
