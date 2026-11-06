import { createFileRoute, redirect } from "@tanstack/react-router";

/** Rules moved to /dashboard/automation/rules; old links (and `?platform=` etc.) keep working. */
export const Route = createFileRoute("/dashboard/automation/$automationId/")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: "/dashboard/automation/rules/$ruleId",
      params: { ruleId: params.automationId },
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
