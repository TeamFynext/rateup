import { createFileRoute, redirect } from "@tanstack/react-router";

import { parseChatbotEditorSearch } from "@/components/dashboard/chatbots/chatbotEditorSearch.ts";

/** Chatbots were renamed Journeys; old editor links keep working. */
export const Route = createFileRoute("/dashboard/chatbots/$chatbotId")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: "/dashboard/automation/journeys/$journeyId",
      params: { journeyId: params.chatbotId },
      search: parseChatbotEditorSearch(location.search as Record<string, unknown>),
      replace: true,
    });
  },
});
