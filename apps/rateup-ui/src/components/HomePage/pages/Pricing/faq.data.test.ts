import { describe, expect, test } from "vitest";

import { buildFaqs } from "@/components/HomePage/pages/Pricing/faq.data.ts";
import {
  conversationPackAnswer,
  resolveConversationPack,
} from "@/components/HomePage/pages/Pricing/pricing.data.ts";

const PACK = {
  id: "addon",
  name: "CONVERSATION PACK",
  displayName: "Conversation pack",
  description: [],
  monthlyPrice: 1_200,
  usdMonthlyPrice: 19,
  features: { whatsapp: { conversation: { count: { max: 5_000 } } } },
} as unknown as Parameters<typeof resolveConversationPack>[0];

describe("the conversation pack the pricing page quotes", () => {
  test("is read from the catalog, not written into the copy", () => {
    // A price typed into the FAQ would keep quoting ₹1,200 after the catalog moved on,
    // promising a figure nobody is charged.
    const answer = conversationPackAnswer(resolveConversationPack([PACK] as never));

    expect(answer).toContain("₹1,200");
    expect(answer).toContain("$19");
    expect(answer).toContain("5,000");
  });

  test("follows the catalog when the price changes", () => {
    const repriced = [{ ...PACK, monthlyPrice: 1_500, usdMonthlyPrice: 25 }];

    expect(conversationPackAnswer(resolveConversationPack(repriced as never))).toContain("₹1,500");
  });

  test("says nothing about a pack the catalog does not sell", () => {
    expect(resolveConversationPack([])).toBeNull();
    expect(resolveConversationPack(undefined)).toBeNull();
  });

  test("still answers the question when no pack is on sale", () => {
    // The allowance question is worth answering either way; it just drops the price.
    const answer = conversationPackAnswer(null);

    expect(answer).toContain("top it up");
    expect(answer).not.toMatch(/₹|\$/);
  });

  test("tells a free reader to upgrade rather than to buy a pack", () => {
    // The same rule the API enforces: Free cannot buy packs, so the page must not imply it.
    expect(conversationPackAnswer(resolveConversationPack([PACK] as never))).toMatch(
      /on Free the better move is to upgrade/,
    );
  });
});

describe("the FAQ entries and their structured data", () => {
  test("carry the priced answer, not the empty placeholder", () => {
    const entry = buildFaqs([PACK] as never).find(
      (faq) => faq.question === "What if I run out of conversations?",
    );

    expect(entry?.answer).toContain("₹1,200");
  });

  test("leave every other answer untouched", () => {
    const before = buildFaqs(undefined);
    const after = buildFaqs([PACK] as never);
    const others = (list: ReturnType<typeof buildFaqs>) =>
      list.filter((faq) => faq.question !== "What if I run out of conversations?");

    expect(others(after)).toEqual(others(before));
  });
});
