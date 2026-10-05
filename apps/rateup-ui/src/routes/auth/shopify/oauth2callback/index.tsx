import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * No longer a callback: Shopify returns installs to the API
 * (`/api/public/integrations/shopify/auth/callback`). Kept so an old bookmark lands on the
 * Shopify page rather than a 404.
 */
export const Route = createFileRoute("/auth/shopify/oauth2callback/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/settings/integrations/$id", params: { id: "shopify" } });
  },
});
