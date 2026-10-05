import { createFileRoute, Outlet } from "@tanstack/react-router";

import marketingCss from "@/styles/marketing.css?url";

/**
 * Layout for the marketing site.
 *
 * Its only job is the cache header. Nothing here is prerendered, so every marketing page's TTFB
 * was a Node render plus — on `/pricing` and `/blog` — an upstream API call. `s-maxage` lets
 * Cloudflare serve the HTML from the edge with prerender-level TTFB while the origin keeps
 * rendering on demand, which is what preserves the `Accept: text/markdown` negotiation and the
 * `Link: api-catalog` header that static prerendering would drop.
 *
 * `Vary: Accept` is not optional: `createMarkdownMiddleware` returns markdown instead of HTML for
 * the same URL when the client asks for it, and without the Vary the edge would serve one to the
 * other. Session state never reaches SSR — `useHasSessionCookie` runs in an effect — so the HTML is
 * identical for every visitor and is safe to share.
 *
 * `headers` from every matched route are merged by the server handler, so a child route can add
 * to this (the homepage's api-catalog `Link`) or override the cache policy if it ever needs to.
 */
export const Route = createFileRoute("/(marketing)")({
  component: RouteComponent,
  /* The marketing half of the Tailwind scan. `base.css` on the root carries the shell and the
     shadcn primitives; this adds the marketing components on top, and the dashboard's classes
     are in neither. */
  head: () => ({ links: [{ rel: "stylesheet", href: marketingCss }] }),
  headers: () => ({
    "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    Vary: "Accept",
  }),
});

function RouteComponent() {
  return <Outlet />;
}
