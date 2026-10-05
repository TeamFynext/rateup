import { createFileRoute } from "@tanstack/react-router";

import {
  DASHBOARD_PERIODS,
  type DashboardPeriod,
} from "@/backend/loyalty/dashboard/dashboardPeriods";
import { OverviewPage } from "@/components/dashboard/loyalty/overview/OverviewPage.tsx";
import { oneOf } from "@/utils/search.ts";

// The no-programme redirect lives on the parent `/dashboard/loyalty` layout route, so
// every loyalty URL gets it, not just this one.
export const Route = createFileRoute("/dashboard/loyalty/dashboard/")({
  validateSearch: (search: Record<string, unknown>): { period?: DashboardPeriod } => ({
    period: oneOf(DASHBOARD_PERIODS, search.period),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { period } = Route.useSearch();
  return <OverviewPage period={period ?? "30d"} />;
}
