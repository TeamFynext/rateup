import { createFileRoute } from "@tanstack/react-router";

import { AnalyticsPage } from "@/components/dashboard/analytics/AnalyticsPage.tsx";

export const Route = createFileRoute("/dashboard/analytics/$staffid/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AnalyticsPage />;
}
