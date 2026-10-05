import { createFileRoute } from "@tanstack/react-router";

import { OAuthCallback } from "@/components/dashboard/settings/integrations/connect/OAuthCallback.tsx";

/**
 * The shared OAuth return address for every provider. Zoho's redirect URI registered with Zoho,
 * `/dashboard/settings/integrations/zoho/callback`, is this route with `$id` = `zoho`.
 */
export const Route = createFileRoute("/dashboard/settings/integrations/$id/callback/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <OAuthCallback integration={id} />;
}
