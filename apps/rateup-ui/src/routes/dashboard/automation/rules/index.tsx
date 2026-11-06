import { createFileRoute } from "@tanstack/react-router";

import { AutomationPage } from "@/components/dashboard/automation/AutomationPage.tsx";

export const Route = createFileRoute("/dashboard/automation/rules/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AutomationPage />;
}
