import { createFileRoute } from "@tanstack/react-router";

import { IntegrationDetailPage } from "@/components/dashboard/settings/integrations/IntegrationDetailPage.tsx";

export const Route = createFileRoute("/dashboard/settings/integrations/$id/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <IntegrationDetailPage />;
}
