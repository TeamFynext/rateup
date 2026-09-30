import { createFileRoute } from "@tanstack/react-router";

import { OAuthCallback } from "@/components/dashboard/settings/integrations/connect/OAuthCallback.tsx";

/**
 * The shared OAuth return address. Zoho keeps its own `zoho/callback` route, which wins over
 * this one as the more specific match, because its redirect URI is registered with Zoho.
 */
export const Route = createFileRoute("/dashboard/settings/integrations/$id/callback/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <OAuthCallback integration={id} />;
}
