import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { PlanUpgradeRequired } from "@/components/common/plan-upgrade-required.tsx";
import { useTeamFeatures } from "@/context/TeamFeaturesContext.tsx";
import {
  DASHBOARD_NO_PERMISSION_FALLBACK,
  getPlanGateForDashboardPath,
  getRequiredFeatureForDashboardPath,
} from "@/utils/dashboard-feature-access.ts";
import { isPlanGateOpen } from "@/utils/subscription/subscription.ts";

/**
 * Client-side route guard. Redirects MEMBER-role users away from routes
 * their teams have not been granted access to.
 *
 * - /dashboard/settings is always allowed (excluded from the map).
 * - Members with an empty feature set are sent to /dashboard/settings.
 * - Owners / admins (allowedFeatures === null) bypass all checks.
 *
 * It also catches the other half of "you cannot be here": a route whose feature is not
 * on the org's plan. That is a different answer from a permission problem — an owner on
 * the Free plan needs the billing page, not their admin — so it renders
 * {@link PlanUpgradeRequired} in place of the page rather than redirecting. The server
 * still enforces the gate; this only replaces a broken page and a 403 with an answer.
 */
export function RouteAccessGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const navigate = useNavigate();
  const { allowedFeatures, isPending } = useTeamFeatures();
  const { data: subscription, isPending: subscriptionPending } = useSubscription();

  useEffect(() => {
    // null = bypass (super-admin), Set = restrict (member)
    if (allowedFeatures === null || isPending) return;

    // /dashboard exactly → will be handled by dashboard/page.tsx redirect;
    // let it pass through here so that page can choose the right destination.
    if (pathname === "/dashboard") return;

    const required = getRequiredFeatureForDashboardPath(pathname);

    if (required && !allowedFeatures.has(required)) {
      navigate({
        to: DASHBOARD_NO_PERMISSION_FALLBACK,
        replace: true,
      });
    }
  }, [pathname, allowedFeatures, isPending]);

  const planGate = getPlanGateForDashboardPath(pathname);
  // Wait for the subscription before judging: rendering the upgrade screen against an
  // undefined subscription would flash it at paying customers on every cold load.
  if (
    planGate &&
    !subscriptionPending &&
    subscription &&
    !isPlanGateOpen(subscription, planGate.gate)
  ) {
    return <PlanUpgradeRequired feature={planGate.label} />;
  }

  return <>{children}</>;
}
