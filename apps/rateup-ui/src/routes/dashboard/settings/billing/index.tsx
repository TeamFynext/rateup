import { createFileRoute } from "@tanstack/react-router";

import { BillingPage } from "@/components/dashboard/settings/billing/BillingPage.tsx";

export const Route = createFileRoute("/dashboard/settings/billing/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <BillingPage />;
}
