import { createFileRoute } from "@tanstack/react-router";

import { ChatbotEditor } from "@/components/dashboard/chatbots/ChatbotEditor.tsx";
import { parseChatbotEditorSearch } from "@/components/dashboard/chatbots/chatbotEditorSearch.ts";

export const Route = createFileRoute("/dashboard/automation/journeys/$journeyId")({
  validateSearch: parseChatbotEditorSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const { journeyId } = Route.useParams();
  return <ChatbotEditor chatbotId={journeyId} />;
}
