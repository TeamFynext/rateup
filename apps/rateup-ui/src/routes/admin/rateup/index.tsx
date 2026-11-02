import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL: /admin/rateup was renamed to /admin/plans. Kept as a redirect so bookmarks keep working.
export const Route = createFileRoute("/admin/rateup/")({
  beforeLoad: ({ params, search }) => {
    throw redirect({ to: "/admin/plans", params, search, replace: true });
  },
});
