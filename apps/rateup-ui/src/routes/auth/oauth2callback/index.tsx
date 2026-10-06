import { createFileRoute } from "@tanstack/react-router";

import { OAuthCallback } from "@/components/dashboard/settings/integrations/connect/OAuthCallback.tsx";

/**
 * Google Sheets' OAuth return address: the redirect URI registered in Google Cloud Console
 * before the shared callback page existed, so it stays. It finishes the connect exactly as
 * `/dashboard/settings/integrations/$id/callback` does for every other provider.
 */
export const Route = createFileRoute("/auth/oauth2callback/")({
  component: () => <OAuthCallback integration="googlesheet" />,
});
