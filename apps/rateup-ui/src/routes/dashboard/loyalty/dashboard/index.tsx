import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { DASHBOARD_PERIODS } from "@/backend/loyalty/dashboard/dashboard.query";
import { OverviewPage } from "@/components/dashboard/loyalty/overview/OverviewPage.tsx";

// The no-programme redirect lives on the parent `/dashboard/loyalty` layout route, so
// every loyalty URL gets it, not just this one.
const searchSchema = z.object({
  period: z.enum(DASHBOARD_PERIODS).optional().catch(undefined),
});

export const Route = createFileRoute("/dashboard/loyalty/dashboard/")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { period } = Route.useSearch();
  return <OverviewPage period={period ?? "30d"} />;
}
