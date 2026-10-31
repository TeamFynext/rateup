import { createFileRoute, redirect } from "@tanstack/react-router";

import { parseChatbotEditorSearch } from "@/components/dashboard/chatbots/chatbotEditorSearch.ts";

/** The chatbot editor moved to /dashboard/journeys; old links keep working. */
export const Route = createFileRoute("/dashboard/instagram/flowbots/$flowbotId")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: "/dashboard/automation/journeys/$journeyId",
      params: { journeyId: params.flowbotId },
      search: parseChatbotEditorSearch(location.search as Record<string, unknown>),
      replace: true,
    });
  },
});
