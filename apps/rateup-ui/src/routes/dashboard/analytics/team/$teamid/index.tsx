import { createFileRoute, redirect } from "@tanstack/react-router";

/** A team's drill-down moved to /dashboard/analytics/teams/$teamId; old links keep working. */
export const Route = createFileRoute("/dashboard/analytics/team/$teamid/")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: "/dashboard/analytics/teams/$teamId",
      params: { teamId: params.teamid },
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
