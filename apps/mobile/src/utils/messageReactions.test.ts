import { describe, expect, it } from "vitest";
import { buildReactionIndex, parseReaction, reactionTargetId } from "./messageReactions";

const waReceived = (id: string, at: string) => ({
  sourcePlatform: "WHATSAPP",
  waCreatedAt: at,
  messageBody: { exchangeProcess: "receive", receive: { messages: [{ id, type: "text" }] } },
});
const waCustomerReaction = (to: string, emoji: string, at: string) => ({
  sourcePlatform: "WHATSAPP",
  waCreatedAt: at,
  messageBody: {
    exchangeProcess: "receive",
    receive: {
      messages: [{ id: `r-${at}`, type: "reaction", reaction: { message_id: to, emoji } }],
    },
  },
});
const waAgentReaction = (to: string, emoji: string, at: string) => ({
  sourcePlatform: "WHATSAPP",
  waCreatedAt: at,
  sender: { name: "Asha" },
  messageBody: {
    exchangeProcess: "send",
    send: { type: "reaction", reaction: { message_id: to, emoji } },
  },
});

describe("message reactions", () => {
  it("targets a received WhatsApp message by its wamid", () => {
    expect(reactionTargetId(waReceived("wamid.1", "2026-01-01"))).toBe("wamid.1");
  });

  it("keeps the newest reaction per side and drops cleared ones", () => {
    const index = buildReactionIndex([
      waAgentReaction("wamid.1", "👍", "2026-01-01T10:02:00Z"),
      waCustomerReaction("wamid.1", "😂", "2026-01-01T10:01:00Z"),
      waAgentReaction("wamid.1", "❤️", "2026-01-01T10:00:00Z"),
      waCustomerReaction("wamid.2", "", "2026-01-01T10:05:00Z"),
      waCustomerReaction("wamid.2", "🙏", "2026-01-01T10:04:00Z"),
    ]);
    expect(index.get("wamid.1")).toEqual([
      { emoji: "👍", from: "business", by: "Asha" },
      { emoji: "😂", from: "customer", by: undefined },
    ]);
    expect(index.has("wamid.2")).toBe(false);
  });

  it("reads Instagram's named reactions and unreacts", () => {
    const react = {
      sourcePlatform: "INSTAGRAM",
      messageBody: {
        exchangeProcess: "receive",
        receive: { reaction: { mid: "m1", action: "react", reaction: "love" } },
      },
    };
    expect(parseReaction(react)).toEqual({ targetId: "m1", emoji: "❤️", from: "customer" });
    const unreact = {
      ...react,
      messageBody: {
        exchangeProcess: "receive",
        receive: { reaction: { mid: "m1", action: "unreact" } },
      },
    };
    expect(parseReaction(unreact)?.emoji).toBe("");
  });

  it("is null for an ordinary message", () => {
    expect(parseReaction(waReceived("wamid.1", "2026-01-01"))).toBeNull();
  });
});
