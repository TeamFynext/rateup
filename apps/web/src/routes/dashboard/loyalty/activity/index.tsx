import { createFileRoute } from "@tanstack/react-router";

import { validateActivitySearch } from "@/components/dashboard/loyalty/activity/activity.filters.ts";
import { ActivityPage } from "@/components/dashboard/loyalty/activity/ActivityPage.tsx";

// Activity — the ledger, with a Pending filter that absorbs Approvals.
export const Route = createFileRoute("/dashboard/loyalty/activity/")({
  validateSearch: validateActivitySearch,
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  return <ActivityPage search={search} />;
}
