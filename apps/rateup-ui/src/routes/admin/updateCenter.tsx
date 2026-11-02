import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL: /admin/updateCenter was renamed to /admin/update-center. Kept as a redirect so
// bookmarks keep working. A flat file rather than updateCenter/index.tsx: the route generator
// names both folders "UpdateCenter", and the duplicate import breaks routeTree.gen.ts.
export const Route = createFileRoute("/admin/updateCenter")({
  beforeLoad: ({ params, search }) => {
    throw redirect({ to: "/admin/update-center", params, search, replace: true });
  },
});
