import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ChatbotsPage } from "@/components/dashboard/chatbots/ChatbotsPage.tsx";
import { parseJourneysSearch } from "@/components/dashboard/chatbots/journeysSearch.ts";

export const Route = createFileRoute("/dashboard/automation/journeys/")({
  validateSearch: parseJourneysSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const { channel } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <ChatbotsPage
      channel={channel}
      onChannelChange={(next) => void navigate({ search: { channel: next }, replace: true })}
    />
  );
}
