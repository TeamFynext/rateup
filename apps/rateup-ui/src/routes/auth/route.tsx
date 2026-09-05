import { createFileRoute, Outlet } from "@tanstack/react-router";

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
  component: () => <Outlet />,
  head: () => ({
    ...noindexHead(undefined, { follow: false }),
    links: [{ rel: "stylesheet", href: appCss }],
  }),
});
