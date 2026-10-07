import { describe, expect, test } from "vitest";

import { buildFaqs } from "@/components/HomePage/pages/Pricing/faq.data.ts";
import { limitAnswer, resolvePack } from "@/components/HomePage/pages/Pricing/pricing.data.ts";

const CONTACT_PACK = {
  id: "addon-contacts",
  name: "ACTIVE CONTACT PACK",
  displayName: "Active contact pack",
  description: [],
  monthlyPrice: 999,
  usdMonthlyPrice: 19,
  features: { whatsapp: { activeContacts: { count: { max: 1_000 } } } },
};

const CREDIT_PACK = {
  id: "addon-credits",
  name: "CAMPAIGN CREDIT PACK",
  displayName: "Campaign credit pack",
  description: [],
  monthlyPrice: 499,
  usdMonthlyPrice: 10,
  features: { whatsapp: { campaignCredits: { count: { max: 10_000 } } } },
};

const PLANS = [CONTACT_PACK, CREDIT_PACK] as never;
const LIMIT_QUESTION = "What happens when I hit a limit?";

function answerFor(plans: never, showPrice = true) {
  return limitAnswer(
    { contacts: resolvePack(plans, "contacts"), credits: resolvePack(plans, "credits") },
    showPrice,
  );
}

describe("the packs the pricing page quotes", () => {
  test("are read from the catalog, not written into the copy", () => {
    const answer = answerFor(PLANS);

    expect(answer).toContain("1,000 contacts for 30 days, ₹999 / $19");
    expect(answer).toContain("10,000 credits for 90 days, ₹499 / $10");
  });

  test("follow the catalog when a price changes", () => {
    const repriced = [{ ...CONTACT_PACK, monthlyPrice: 1_499 }, CREDIT_PACK] as never;

    expect(answerFor(repriced)).toContain("₹1,499");
  });

  test("say nothing about a pack the catalog does not sell", () => {
    expect(resolvePack([], "contacts")).toBeNull();
    expect(resolvePack(undefined, "credits")).toBeNull();
    expect(answerFor([CREDIT_PACK] as never)).not.toContain("active contact pack");
  });

  test("still answer the question when no pack is on sale", () => {
    const answer = limitAnswer({ contacts: null, credits: null });

    expect(answer).toContain("already active this month");
    expect(answer).not.toMatch(/₹|\$/);
  });

  test("quote no figure when prices are withheld", () => {
    expect(answerFor(PLANS, false)).not.toMatch(/₹|\$/);
  });

  test("tell a free reader to upgrade rather than to buy a pack", () => {
    // Free cannot buy packs; the API refuses the order.
    expect(answerFor(PLANS)).toMatch(/On Free, upgrading is the way to raise a limit/);
  });
});

describe("the FAQ entries and their structured data", () => {
  test("carry the priced answer, not the empty placeholder", () => {
    const entry = buildFaqs(PLANS).find((faq) => faq.question === LIMIT_QUESTION);

    expect(entry?.answer).toContain("₹999");
  });

  test("leave every other answer untouched", () => {
    const others = (list: ReturnType<typeof buildFaqs>) =>
      list.filter((faq) => faq.question !== LIMIT_QUESTION);

    expect(others(buildFaqs(PLANS))).toEqual(others(buildFaqs(undefined)));
  });

  test("say Meta bills message fees and the AI agent directly", () => {
    const entry = buildFaqs(undefined).find((faq) => faq.question.includes("message charges"));

    expect(entry?.answer).toMatch(/Meta Business AI agent/);
    expect(entry?.answer).toMatch(/0% markup/);
  });
});
