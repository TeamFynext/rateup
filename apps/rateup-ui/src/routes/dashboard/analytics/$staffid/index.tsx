import { createFileRoute, redirect } from "@tanstack/react-router";

/** An agent's drill-down moved to /dashboard/analytics/agents/$agentId; old links keep working. */
export const Route = createFileRoute("/dashboard/analytics/$staffid/")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: "/dashboard/analytics/agents/$agentId",
      params: { agentId: params.staffid },
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
