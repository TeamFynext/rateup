import { createFileRoute, redirect } from "@tanstack/react-router";

import { parseChatbotEditorSearch } from "@/components/dashboard/chatbots/chatbotEditorSearch.ts";

/** The chatbot editor moved to /dashboard/chatbots; old links keep working. */
export const Route = createFileRoute("/dashboard/whatsapp/flowbots/$flowbotId/")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: "/dashboard/chatbots/$chatbotId",
      params: { chatbotId: params.flowbotId },
      search: parseChatbotEditorSearch(location.search as Record<string, unknown>),
      replace: true,
    });
  },
});
