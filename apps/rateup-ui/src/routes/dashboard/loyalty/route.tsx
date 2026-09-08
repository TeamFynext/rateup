import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";
import { getLoyaltyOnboardingState } from "@/backend/loyalty/onboarding.api";
import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";

/**
 * The one place that decides where an org with no loyalty programme lands: the setup
 * wizard, whatever loyalty URL it typed. A *draft* programme deliberately does not
 * redirect — someone who stepped out mid-setup should not be dragged back in every time
 * they click Loyalty; the Overview carries the remaining steps instead.
 */
export const Route = createFileRoute("/dashboard/loyalty")({
  // The session cookie only exists on the client, and every loyalty page is behind it.
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    if (location.pathname.startsWith(LOYALTY_PATHS.onboarding)) return;

    try {
      const state = await context.getQueryClient().fetchQuery({
        queryKey: loyaltyKeys.onboardingState(),
        queryFn: getLoyaltyOnboardingState,
        // This runs on every navigation between loyalty pages; without it each click
        // would refetch.
        staleTime: 30_000,
      });

      if (!state.program) {
        throw redirect({ to: LOYALTY_PATHS.onboarding, replace: true });
      }
    } catch (error) {
      // A redirect is thrown, so it has to pass through. Anything else (the org lacks
      // the feature, the request failed) should not block the page from rendering.
      if (error && typeof error === "object" && "to" in error) throw error;
    }
  },
  component: () => <Outlet />,
});
