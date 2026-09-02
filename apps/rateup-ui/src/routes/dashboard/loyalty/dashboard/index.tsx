import { createFileRoute, redirect } from "@tanstack/react-router";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";
import { getLoyaltyOnboardingState } from "@/backend/loyalty/onboarding.api";
import { LoyaltyPrograms } from "@/components/dashboard/loyalty/dashboard/LoyaltyPrograms.tsx";

export const Route = createFileRoute("/dashboard/loyalty/dashboard/")({
  ssr: false,
  loader: async ({ context }) => {
    const queryClient = context.getQueryClient();

    // An org with no programme at all lands on empty charts, so send it to the wizard
    // instead. A *draft* programme deliberately does not redirect — someone who stepped
    // out mid-setup should not be dragged back in every time they click Loyalty; they
    // get a "Resume setup" banner on this page instead.
    try {
      const state = await queryClient.fetchQuery({
        queryKey: loyaltyKeys.onboardingState(),
        queryFn: getLoyaltyOnboardingState,
      });

      if (!state.program) {
        throw redirect({ to: "/dashboard/loyalty/onboarding", replace: true });
      }
    } catch (error) {
      // A redirect is thrown, so it has to pass through. Anything else (the org lacks
      // the feature, the request failed) should not block the dashboard from rendering.
      if (error && typeof error === "object" && "to" in error) throw error;
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <LoyaltyPrograms />;
}
