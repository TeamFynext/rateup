import { createFileRoute, redirect } from "@tanstack/react-router";

import { DASHBOARD_PERIODS } from "@/backend/loyalty/dashboard/dashboardPeriods";
import { oneOf } from "@/utils/search.ts";

/** The loyalty dashboard is the Overview now; old links keep working, `?period=` included. */
export const Route = createFileRoute("/dashboard/loyalty/dashboard/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/dashboard/loyalty/overview",
      search: {
        period: oneOf(DASHBOARD_PERIODS, (location.search as Record<string, unknown>).period),
      },
      replace: true,
    });
  },
});
