import { createFileRoute, redirect } from "@tanstack/react-router";

import { parseJourneysSearch } from "@/components/dashboard/chatbots/journeysSearch.ts";

/** Journeys moved under Automation; old links keep working, `?channel=` included. */
export const Route = createFileRoute("/dashboard/journeys/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/dashboard/automation/journeys",
      search: parseJourneysSearch(location.search as Record<string, unknown>),
      replace: true,
    });
  },
});
