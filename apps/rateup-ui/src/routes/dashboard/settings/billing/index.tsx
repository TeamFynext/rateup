import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { BillingPage } from "@/components/dashboard/settings/billing/BillingPage.tsx";

// `?tab=` so a link can land on the usage meters or the charge history rather than always
// on the plan. `.catch` keeps an unknown value from throwing a search-validation error on
// an old bookmark — it falls back to the plan tab.
const searchSchema = z.object({
  tab: z.enum(["plan", "usage", "history"]).optional().catch(undefined),
});

export const Route = createFileRoute("/dashboard/settings/billing/")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { tab } = Route.useSearch();
  return <BillingPage tab={tab ?? "plan"} />;
}
