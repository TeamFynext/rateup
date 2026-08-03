import { createFileRoute } from "@tanstack/react-router";

import { SecurityPage } from "@/components/dashboard/settings/security/SecurityPage.tsx";

export const Route = createFileRoute("/dashboard/settings/security/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SecurityPage />;
}
