import { createFileRoute } from "@tanstack/react-router";

import { AutomationPage } from "@/components/dashboard/automation/AutomationPage.tsx";

export const Route = createFileRoute("/dashboard/automation/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AutomationPage />;
}
