import { createFileRoute, redirect } from "@tanstack/react-router";

import { parseJourneysSearch } from "@/components/dashboard/chatbots/journeysSearch.ts";

/** Chatbots were renamed Journeys; old links keep working, `?channel=` included. */
export const Route = createFileRoute("/dashboard/chatbots/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/dashboard/automation/journeys",
      search: parseJourneysSearch(location.search as Record<string, unknown>),
      replace: true,
    });
  },
});
