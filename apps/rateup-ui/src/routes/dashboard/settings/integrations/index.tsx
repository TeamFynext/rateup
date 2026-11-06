import { createFileRoute } from "@tanstack/react-router";

import { IntegrationsPage } from "@/components/dashboard/settings/integrations/IntegrationsPage.tsx";

export const Route = createFileRoute("/dashboard/settings/integrations/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <IntegrationsPage />;
}
