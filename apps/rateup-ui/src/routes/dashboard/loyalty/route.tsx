import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";
import { useLoyaltyOnboardingState } from "@/backend/loyalty/onboarding.query";
import { LoyaltySetupRequired } from "@/components/dashboard/loyalty/LoyaltySetupRequired.tsx";
import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";
import { isGatedWhileUnset } from "@/components/dashboard/loyalty/setupGate.ts";
import { Loader } from "@/components/ui/loader.tsx";

/**
 * The one place that decides where an org with no loyalty programme lands: the setup
 * wizard, whatever loyalty URL it typed. A *draft* programme deliberately does not
 * redirect — someone who stepped out mid-setup should not be dragged back in every time
 * they click Loyalty; the Overview and the Program page carry the remaining steps
 * instead. Every other loyalty screen has nothing to run on until the programme is live,
 * so those show the "finish setup" message in place of themselves.
 */
export const Route = createFileRoute("/dashboard/loyalty")({
  // The session cookie only exists on the client, and every loyalty page is behind it.
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    if (location.pathname.startsWith(LOYALTY_PATHS.onboarding)) return;

    try {
      const state = await context.getQueryClient().fetchQuery({
        queryKey: loyaltyKeys.onboardingState(),
        // Imported on demand: `beforeLoad` lands in the client entry, and this brings axios.
        queryFn: async () =>
          (await import("@/backend/loyalty/onboarding.api")).getLoyaltyOnboardingState(),
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
  component: LoyaltyLayout,
});

function LoyaltyLayout() {
  const { pathname } = useLocation();
  const gated = isGatedWhileUnset(pathname);
  // The wizard and the setup screens never wait on this, so the query only runs where its
  // answer can change what is rendered.
  const { data: state, isLoading } = useLoyaltyOnboardingState(gated);

  if (!gated) return <Outlet />;
  // `beforeLoad` has normally filled the cache already; this only shows when it could not.
  if (isLoading) return <Loader />;
  // A failed request leaves the state undefined — that is not a reason to hide the page.
  const setUp = !state || (state.program != null && state.program.status !== "draft");

  return setUp ? <Outlet /> : <LoyaltySetupRequired state={state} />;
}
