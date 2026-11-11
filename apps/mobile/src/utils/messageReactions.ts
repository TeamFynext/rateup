/**
 * Reactions arrive as messages of their own that point at another message. Like the web
 * inbox, the thread hides them and draws each as a small emoji under the message it
 * reacts to. Each side (the customer, the business) holds one reaction per message: a
 * newer one replaces it, and an empty emoji (WhatsApp) or "unreact" (Instagram) clears it.
 */

/** Instagram and Messenger react with a named reaction; "love" is the only one they send. */
export const IG_REACTIONS: Record<string, string> = { love: "❤️" };

export type MessageReaction = { emoji: string; from: "customer" | "business"; by?: string };

type ParsedReaction = { targetId: string; emoji: string; from: MessageReaction["from"] };

const isMeta = (platform?: string) => platform === "INSTAGRAM" || platform === "FACEBOOK";

function igEmoji(emoji?: string, reaction?: string): string {
  return emoji || (reaction ? (IG_REACTIONS[reaction] ?? "") : "");
}

/** The reaction a message carries, or null when it is not a reaction. */
export function parseReaction(message: any): ParsedReaction | null {
  const body = message?.messageBody;
  if (!body) return null;
  if (body.exchangeProcess === "receive") {
    const receive = body.receive;
    if (isMeta(message.sourcePlatform)) {
      const r = receive?.reaction;
      if (!r?.mid) return null;
      return {
        targetId: r.mid,
        emoji: r.action === "unreact" ? "" : igEmoji(r.emoji, r.reaction),
        from: "customer",
      };
    }
    const m = receive?.messages?.[0];
    if (m?.type !== "reaction" || !m.reaction?.message_id) return null;
    return { targetId: m.reaction.message_id, emoji: m.reaction.emoji ?? "", from: "customer" };
  }
  if (body.exchangeProcess === "send") {
    const send = body.send;
    if (isMeta(message.sourcePlatform)) {
      if (send?.sender_action !== "react" || !send.payload?.message_id) return null;
      return {
        targetId: send.payload.message_id,
        emoji: igEmoji(send.payload.emoji, send.payload.reaction),
        from: "business",
      };
    }
    if (send?.type !== "reaction" || !send.reaction?.message_id) return null;
    return {
      targetId: send.reaction.message_id,
      emoji: send.reaction.emoji ?? "",
      from: "business",
    };
  }
  return null;
}

/** The id Meta knows a message by — what a reaction to it points at, and what we send. */
export function reactionTargetId(message: any): string | undefined {
  const body = message?.messageBody;
  if (body?.exchangeProcess === "receive" && !isMeta(message.sourcePlatform)) {
    return body.receive?.messages?.[0]?.id ?? message.messageId;
  }
  return message?.messageId ?? undefined;
}

const time = (m: any) => new Date(m?.waCreatedAt ?? m?.createdAt ?? 0).getTime();

/** Every message's current reactions, keyed by `reactionTargetId`. */
export function buildReactionIndex(messages: any[]): Map<string, MessageReaction[]> {
  // Newest reaction per (target, side) wins, whatever order the list is in.
  const latest = new Map<string, { at: number; reaction: ParsedReaction; by?: string }>();
  for (const message of messages) {
    const reaction = parseReaction(message);
    if (!reaction) continue;
    const key = `${reaction.targetId}|${reaction.from}`;
    const at = time(message);
    const prev = latest.get(key);
    if (!prev || at >= prev.at) latest.set(key, { at, reaction, by: message.sender?.name });
  }
  const index = new Map<string, MessageReaction[]>();
  for (const { reaction, by } of latest.values()) {
    if (!reaction.emoji) continue;
    const list = index.get(reaction.targetId) ?? [];
    list.push({ emoji: reaction.emoji, from: reaction.from, by });
    index.set(reaction.targetId, list);
  }
  return index;
}
