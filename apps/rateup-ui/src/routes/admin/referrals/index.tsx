import { createFileRoute } from "@tanstack/react-router";

import { ReferralsPage } from "@/components/admin/referrals/ReferralsPage.tsx";

export const Route = createFileRoute("/admin/referrals/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ReferralsPage />;
}
