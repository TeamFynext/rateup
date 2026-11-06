import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Pure pass-through. It deliberately has **no** `head()`.
 *
 * It used to apply `buildPageHead("/blog")` to every child, and TanStack concatenates a route's
 * `links` with its parents' rather than overriding them — so every post rendered a second
 * `<link rel="canonical">` pointing at /blog, on top of its own. The blog index owns that head now.
 *
 * The layout itself stays because the route generator nests `rss.xml`, `sitemap.xml`, `tag/*` and
 * `author/*` under it; removing the file leaves those children parented to a route that no longer
 * exists, and `/blog/sitemap.xml` starts resolving as a post slug.
 */
export const Route = createFileRoute("/(marketing)/blog")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
