"use client";

import { useEffect } from "react";

import { useNavigate, useRouterState } from "@tanstack/react-router";

import { useTeamFeatures } from "@/context/TeamFeaturesContext.tsx";
import {
  DASHBOARD_NO_PERMISSION_FALLBACK,
  getRequiredFeatureForDashboardPath,
} from "@/utils/dashboard-feature-access.ts";

/**
 * Client-side route guard. Redirects MEMBER-role users away from routes
 * their teams have not been granted access to.
 *
 * - /dashboard/settings is always allowed (excluded from the map).
 * - Members with an empty feature set are sent to /dashboard/settings.
 * - Owners / admins (allowedFeatures === null) bypass all checks.
 */
export function RouteAccessGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const navigate = useNavigate();
  const { allowedFeatures, isPending } = useTeamFeatures();

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

  return <>{children}</>;
}
