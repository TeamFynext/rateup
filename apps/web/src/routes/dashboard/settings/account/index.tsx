import { createFileRoute, redirect } from "@tanstack/react-router";

/** Profile & Business moved to /dashboard/settings/profile; old links keep working. */
export const Route = createFileRoute("/dashboard/settings/account/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/dashboard/settings/profile",
      // The old URL's query, carried across as-is: the target's own validateSearch
      // parses it, so this route does not restate (and drift from) that schema.
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
