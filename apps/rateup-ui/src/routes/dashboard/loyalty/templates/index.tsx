import { createFileRoute } from "@tanstack/react-router";

import { LoyaltyTemplateListPage } from "@/components/dashboard/loyalty/templates/LoyaltyTemplateListPage.tsx";

export const Route = createFileRoute("/dashboard/loyalty/templates/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <LoyaltyTemplateListPage />;
}
