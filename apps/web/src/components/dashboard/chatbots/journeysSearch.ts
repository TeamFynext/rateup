import type { ChatbotChannelParam } from "./ChatbotsPage.tsx";

const CHANNELS: readonly ChatbotChannelParam[] = ["whatsapp", "instagram", "messenger"];

function isChannel(value: unknown): value is ChatbotChannelParam {
  return CHANNELS.includes(value as ChatbotChannelParam);
}

/**
 * The Journeys list's search params: `?channel=` filters it to one channel. Apart from
 * the page so the old `/dashboard/chatbots` redirect can read it without pulling the page
 * into the client entry.
 */
export function parseJourneysSearch(search: Record<string, unknown>): {
  channel?: ChatbotChannelParam;
} {
  return { channel: isChannel(search.channel) ? search.channel : undefined };
}
