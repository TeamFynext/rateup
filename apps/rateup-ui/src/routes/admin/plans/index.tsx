import { createFileRoute } from "@tanstack/react-router";

import { RateupPlan } from "@/components/admin/rateup/RateupPlan.tsx";

export const Route = createFileRoute("/admin/plans/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RateupPlan />;
}
