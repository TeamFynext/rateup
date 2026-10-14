import { createFileRoute } from "@tanstack/react-router";

import CallsPage from "@/components/whatsapp/calling/history/CallsPage.tsx";

export const Route = createFileRoute("/dashboard/analytics/calls/")({
  validateSearch: (search: Record<string, unknown>): { tab?: "log" | "analytics" } => ({
    tab: search.tab === "analytics" ? "analytics" : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <CallsPage />;
}
