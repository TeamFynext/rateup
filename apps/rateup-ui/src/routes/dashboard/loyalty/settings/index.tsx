import { createFileRoute } from "@tanstack/react-router";

import { LoyaltySettingsPage } from "@/components/dashboard/loyalty/settings/LoyaltySettingsPage.tsx";

export const Route = createFileRoute("/dashboard/loyalty/settings/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <LoyaltySettingsPage />;
}
