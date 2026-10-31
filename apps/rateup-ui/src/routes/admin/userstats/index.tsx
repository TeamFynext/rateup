import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL: /admin/userstats was renamed to /admin/user-stats. Kept as a redirect so bookmarks keep working.
export const Route = createFileRoute("/admin/userstats/")({
  beforeLoad: ({ params, search }) => {
    throw redirect({ to: "/admin/user-stats", params, search, replace: true });
  },
});
