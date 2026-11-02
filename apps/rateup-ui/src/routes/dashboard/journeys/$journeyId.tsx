import { createFileRoute, redirect } from "@tanstack/react-router";

/** Journeys moved under Automation; old links keep working with their query. */
export const Route = createFileRoute("/dashboard/journeys/$journeyId")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: "/dashboard/automation/journeys/$journeyId",
      params,
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
