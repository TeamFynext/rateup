import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  ChatbotsPage,
  type ChatbotChannelParam,
} from "@/components/dashboard/chatbots/ChatbotsPage.tsx";

const CHANNELS: readonly ChatbotChannelParam[] = ["whatsapp", "instagram", "messenger"];

function isChannel(value: unknown): value is ChatbotChannelParam {
  return CHANNELS.includes(value as ChatbotChannelParam);
}

export const Route = createFileRoute("/dashboard/chatbots/")({
  validateSearch: (search: Record<string, unknown>): { channel?: ChatbotChannelParam } => ({
    channel: isChannel(search.channel) ? search.channel : undefined,
  }),
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
