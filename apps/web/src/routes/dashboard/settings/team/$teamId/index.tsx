import { createFileRoute, redirect } from "@tanstack/react-router";

/** Teams moved to /dashboard/settings/teams; old links keep working. */
export const Route = createFileRoute("/dashboard/settings/team/$teamId/")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: "/dashboard/settings/teams/$teamId",
      params: { teamId: params.teamId },
      // The old URL's query, carried across as-is: the target's own validateSearch
      // parses it, so this route does not restate (and drift from) that schema.
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
