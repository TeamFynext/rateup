import { createFileRoute } from "@tanstack/react-router";

import { ApprovalsPage } from "@/components/dashboard/loyalty/approvals/ApprovalsPage.tsx";

export const Route = createFileRoute("/dashboard/loyalty/approvals/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ApprovalsPage />;
}
