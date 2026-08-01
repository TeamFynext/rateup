import { createFileRoute } from "@tanstack/react-router";

import { EarningRulesPage } from "@/components/dashboard/loyalty/earning-rules/EarningRulesPage.tsx";

export const Route = createFileRoute("/dashboard/loyalty/earning-rules/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <EarningRulesPage />;
}
