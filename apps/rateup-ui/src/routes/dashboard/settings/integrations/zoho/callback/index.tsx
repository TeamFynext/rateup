import { createFileRoute } from "@tanstack/react-router";

import { ZohoCallback } from "@/components/dashboard/settings/integrations/zoho/callback/ZohoCallback.tsx";

export const Route = createFileRoute("/dashboard/settings/integrations/zoho/callback/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ZohoCallback />;
}
