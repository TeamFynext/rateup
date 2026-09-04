import { createFileRoute, Outlet } from "@tanstack/react-router";

import { noindexHead } from "@/lib/metadata.ts";

/**
 * Layout for the tenant-facing utility URLs — short links (`/ws`, `/was`, `/lt`, `/qr`), public
 * surveys and testimonial walls, loyalty registration and the cashier screen.
 *
 * These leak into the index from shared WhatsApp messages and bloat it with per-tenant pages that
 * have no search intent. They are `noindex, nofollow` rather than a robots.txt `Disallow`: Google
 * has to crawl a URL to see the noindex, and blocking would freeze the `/ws/*` URLs already in the
 * index. Individual routes may still override this with their own head.
 */
export const Route = createFileRoute("/(public-facing)")({
  component: () => <Outlet />,
  head: () => noindexHead(undefined, { follow: false }),
});
