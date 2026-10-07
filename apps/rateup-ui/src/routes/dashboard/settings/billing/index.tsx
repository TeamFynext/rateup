import { createFileRoute } from "@tanstack/react-router";

import { BillingPage } from "@/components/dashboard/settings/billing/BillingPage.tsx";
import { oneOf } from "@/utils/search.ts";

// `?tab=` so a link can land on the usage meters or the charge history rather than always
// on the plan. An unknown value (an old bookmark) falls back to the plan tab.
const BILLING_TABS = ["plan", "usage", "history"] as const;

export const Route = createFileRoute("/dashboard/settings/billing/")({
  validateSearch: (search: Record<string, unknown>): { tab?: (typeof BILLING_TABS)[number] } => ({
    tab: oneOf(BILLING_TABS, search.tab),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { tab } = Route.useSearch();
  return <BillingPage tab={tab ?? "plan"} />;
}
