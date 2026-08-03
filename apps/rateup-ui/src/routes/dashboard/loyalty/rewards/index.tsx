import { createFileRoute } from "@tanstack/react-router";

import { RewardsPage } from "@/components/dashboard/loyalty/rewards/RewardsPage.tsx";

export const Route = createFileRoute("/dashboard/loyalty/rewards/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RewardsPage />;
}
