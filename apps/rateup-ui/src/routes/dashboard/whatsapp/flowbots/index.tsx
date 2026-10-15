import { createFileRoute } from "@tanstack/react-router";

import { ChatbotList } from "@/components/dashboard/chatbots/ChatbotList.tsx";
import { AutomationPlatform } from "@/types/platform.ts";

export const Route = createFileRoute("/dashboard/whatsapp/flowbots/")({
  component: FlowbotsPage,
});

function FlowbotsPage() {
  return (
    <ChatbotList
      platform={AutomationPlatform.WHATSAPP}
      detailsBasePath="/dashboard/whatsapp/flowbots"
    />
  );
}
