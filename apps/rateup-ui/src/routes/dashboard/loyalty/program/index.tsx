import { createFileRoute, redirect } from "@tanstack/react-router";

import { ONBOARDING_STEPS, type OnboardingStep } from "@/backend/loyalty/onboardingSteps";
import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";
import { ProgramPage } from "@/components/dashboard/loyalty/program/ProgramPage.tsx";
import { oneOf } from "@/utils/search.ts";

// `?section=` opens one section's editor; without it the page is the three summary cards.
// A search param rather than a child route so the sidebar's Program entry stays active
// and closing the editor is just clearing the search.
//
// The enum stays the wizard's full step list, `messages` included, even though Program has
// no messages card any more: the wizard still walks that step, and keeping it here is what
// lets the redirect below recognise an old link rather than silently dropping it to the
// summary.
export const Route = createFileRoute("/dashboard/loyalty/program/")({
  validateSearch: (search: Record<string, unknown>): { section?: OnboardingStep } => ({
    section: oneOf(ONBOARDING_STEPS, search.section),
  }),
  beforeLoad: ({ search }) => {
    // Program used to carry a Messages section that showed the same keyword replies and
    // notifications as Loyalty → Messages. Bookmarks and older in-app links still point
    // here, so send them to the page that owns those messages now.
    // Rewards moved out to its own sidebar entry.
    if (search.section === "rewards") {
      throw redirect({ to: LOYALTY_PATHS.rewards, replace: true });
    }
    if (search.section === "messages") {
      throw redirect({
        to: LOYALTY_PATHS.messages,
        search: { tab: "automatic" },
        replace: true,
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { section } = Route.useSearch();
  return <ProgramPage section={section} />;
}
