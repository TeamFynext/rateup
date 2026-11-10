/**
 * What each channel accepts in one message, from Meta's docs. A server-side copy of the UI's
 * `PLATFORM_LIMITS` (rateup-ui/src/types/platformLimits.ts): keep the two in step. Media
 * sizes are checked at upload in the UI only; a save carries keys, not files.
 */

import { parseToWhatsAppFormat } from "../../meta/whatsapp/webhook/whatsapp.utils.js";
import type { ChatbotPlatform } from "./journeyBlocks.js";

interface ChannelLimits {
  text: number;
  caption: number;
  quickReplies: { max: number; title: number };
  cards: { max: number; title: number; subtitle: number; buttons: number; buttonTitle: number };
}

const META_CHOICES = {
  quickReplies: { max: 13, title: 20 },
  cards: { max: 10, title: 80, subtitle: 80, buttons: 3, buttonTitle: 20 },
};

export const CHANNEL_LIMITS: Record<ChatbotPlatform, ChannelLimits> = {
  WHATSAPP: { text: 4096, caption: 1024, ...META_CHOICES },
  INSTAGRAM: { text: 1000, caption: 1000, ...META_CHOICES },
  FACEBOOK: { text: 2000, caption: 2000, ...META_CHOICES },
};

/** A message field's length as it is sent: rich text once turned into text, a string as is. */
export function sentLength(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{")) {
      try {
        return parseToWhatsAppFormat(JSON.parse(trimmed)).length;
      } catch {
        // Not JSON after all: count it as typed.
      }
    }
    return value.length;
  }
  if (typeof value === "object") {
    return parseToWhatsAppFormat(value as Parameters<typeof parseToWhatsAppFormat>[0]).length;
  }
  return 0;
}

export interface LimitProblem {
  nodeId: string;
  label: string;
  message: string;
}

interface GraphNode {
  id?: string;
  type?: string | null;
  data?: Record<string, unknown> | null;
}

const INPUT_NODES = new Set([
  "textInputNode",
  "numberInputNode",
  "emailInputNode",
  "phoneInputNode",
  "dateInputNode",
]);

const titleOf = (value: unknown) => (typeof value === "string" ? value : "");
const listOf = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** The first thing wrong with one node on this channel, or null. */
function nodeProblem(node: GraphNode, limits: ChannelLimits): string | null {
  const data = node.data ?? {};
  const tooLong = (value: unknown, max: number) => sentLength(value) > max;

  switch (node.type) {
    case "textNode":
      return tooLong(data.body, limits.text)
        ? `Message text is over ${limits.text} characters`
        : null;
    case "imageNode":
    case "videoNode":
    case "documentNode":
      return tooLong(data.caption, limits.caption)
        ? `Caption is over ${limits.caption} characters`
        : null;
    case "instagramQuickReplyNode": {
      if (tooLong(data.text, limits.text)) return `Message text is over ${limits.text} characters`;
      const replies = listOf<{ title?: unknown }>(data.quick_replies);
      const { max, title } = limits.quickReplies;
      if (replies.length > max) return `More than ${max} quick replies`;
      if (replies.some((reply) => titleOf(reply?.title).length > title)) {
        return `A quick reply is over ${title} characters`;
      }
      return null;
    }
    case "instagramGenericTemplateNode": {
      const cards = listOf<{ title?: unknown; subtitle?: unknown; buttons?: unknown }>(
        data.elements,
      );
      const { max, title, subtitle, buttons, buttonTitle } = limits.cards;
      if (cards.length > max) return `More than ${max} cards`;
      for (const card of cards) {
        if (titleOf(card?.title).length > title) return `A card title is over ${title} characters`;
        if (titleOf(card?.subtitle).length > subtitle) {
          return `A card subtitle is over ${subtitle} characters`;
        }
        const cardButtons = listOf<{ title?: unknown }>(card?.buttons);
        if (cardButtons.length > buttons) return `More than ${buttons} buttons on a card`;
        if (cardButtons.some((button) => titleOf(button?.title).length > buttonTitle)) {
          return `A card button is over ${buttonTitle} characters`;
        }
      }
      return null;
    }
    default:
      if (node.type && INPUT_NODES.has(node.type) && tooLong(data.question, limits.text)) {
        return `Question is over ${limits.text} characters`;
      }
      return null;
  }
}

/** Every node in a chatbot graph that breaks its channel's limits, one problem each. */
export function limitProblems(
  graph: { nodes?: GraphNode[] } | undefined,
  platform: ChatbotPlatform,
): LimitProblem[] {
  const limits = CHANNEL_LIMITS[platform];
  const problems: LimitProblem[] = [];
  for (const node of graph?.nodes ?? []) {
    const message = nodeProblem(node, limits);
    if (message) {
      const label = titleOf(node.data?.label) || node.type || "A block";
      problems.push({ nodeId: node.id ?? "", label, message });
    }
  }
  return problems;
}
