import { createFileRoute, redirect } from "@tanstack/react-router";

// The Users page became Members; old links and bookmarks still land somewhere useful.
export const Route = createFileRoute("/dashboard/settings/users/")({
  loader: () => {
    throw redirect({ to: "/dashboard/settings/members", replace: true });
  },
});
