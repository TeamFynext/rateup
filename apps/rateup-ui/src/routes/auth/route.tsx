import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppProviders } from "@/components/AppProviders";
import { loadAppRuntime } from "@/lib/appRuntime";
import { noindexHead } from "@/lib/metadata.ts";

import appCss from "@/styles/app.css?url";

/**
 * Layout for the OAuth callback routes (`/auth/fb`, `/auth/shopify/*`, `/auth/oauth2callback`).
 *
 * Two jobs: attach `app.css`, since these render app components rather than marketing ones, and
 * keep the callbacks out of the index — they are transient redirect screens with a code in the
 * query string and nothing to rank for.
 */
export const Route = createFileRoute("/auth")({
  beforeLoad: loadAppRuntime,
  component: () => (
    <AppProviders>
      <Outlet />
    </AppProviders>
  ),
  head: () => ({
    ...noindexHead(undefined, { follow: false }),
    links: [{ rel: "stylesheet", href: appCss }],
  }),
});
