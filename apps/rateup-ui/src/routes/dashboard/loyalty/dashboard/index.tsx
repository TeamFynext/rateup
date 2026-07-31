import { createFileRoute } from "@tanstack/react-router";

import { LoyaltyPrograms } from "@/components/dashboard/loyalty/dashboard/LoyaltyPrograms.tsx";

export const Route = createFileRoute("/dashboard/loyalty/dashboard/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <LoyaltyPrograms />;
}
