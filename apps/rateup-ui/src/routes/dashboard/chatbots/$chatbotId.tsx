import { createFileRoute } from "@tanstack/react-router";

import { ChatbotEditor } from "@/components/dashboard/chatbots/ChatbotEditor.tsx";
import { parseChatbotEditorSearch } from "@/components/dashboard/chatbots/chatbotEditorSearch.ts";

export const Route = createFileRoute("/dashboard/chatbots/$chatbotId")({
  validateSearch: parseChatbotEditorSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const { chatbotId } = Route.useParams();
  return <ChatbotEditor chatbotId={chatbotId} />;
}
