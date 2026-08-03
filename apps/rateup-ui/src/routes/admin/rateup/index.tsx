import { createFileRoute } from "@tanstack/react-router";

import { RateupPlan } from "@/components/admin/rateup/RateupPlan.tsx";

export const Route = createFileRoute("/admin/rateup/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RateupPlan />;
}
