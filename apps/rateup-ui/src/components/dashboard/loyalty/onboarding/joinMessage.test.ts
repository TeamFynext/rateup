import { describe, expect, test } from "vitest";

import { buildJoinReplyText, type JoinMessageInput } from "./joinMessage";

const base: JoinMessageInput = {
  programName: "Kettle & Co Rewards",
  pointsName: "Beans",
  currencySymbol: "₹",
  currencyCode: "INR",
  signupBonus: 50,
  balanceKeyword: "points",
  rules: [
    {
      name: "Standard",
      status: "active",
      pointsPerUnit: 1,
      multiplier: 1,
      bonusPoints: 0,
      allowedDays: [],
      isDefault: true,
    },
    {
      name: "Weekend",
      status: "active",
      pointsPerUnit: 1,
      multiplier: 2,
      bonusPoints: 0,
      allowedDays: ["sun", "sat"],
      isDefault: false,
    },
  ],
  rewards: [
    { name: "Free filter coffee", pointsCost: 500 },
    { name: "10% off", pointsCost: 300 },
  ],
};

describe("buildJoinReplyText", () => {
  test("quotes the earn rate, the extras and the rewards the merchant set", () => {
    const text = buildJoinReplyText(base);

    expect(text).toContain("Welcome to Kettle & Co Rewards!");
    expect(text).toContain("• 1 Bean for every ₹1 you spend");
    // Described against the base rate, and the days come back in week order.
    expect(text).toContain("• 2× Beans on Sat and Sun");
    expect(text).toContain("• 50 Beans to start you off");
    // Cheapest reward first — the one a new member can actually reach.
    expect(text.indexOf("10% off — 300 Beans")).toBeLessThan(
      text.indexOf("Free filter coffee — 500 Beans"),
    );
    expect(text).toContain("Reply POINTS any time to check your balance.");
  });

  test("skips rules that are off, and rules the customer would not notice", () => {
    const text = buildJoinReplyText({
      ...base,
      rules: [
        ...base.rules.map((rule) =>
          rule.isDefault ? rule : { ...rule, status: "inactive" as const },
        ),
        // Same rate as the base rule and no bonus: nothing to say about it.
        {
          name: "Tuesdays",
          status: "active",
          pointsPerUnit: 1,
          multiplier: 1,
          bonusPoints: 0,
          allowedDays: ["tue"],
          isDefault: false,
        },
      ],
    });

    expect(text).not.toContain("Sat and Sun");
    expect(text).not.toContain("Tue");
  });

  test("names a minimum spend and a flat bonus", () => {
    const text = buildJoinReplyText({
      ...base,
      rules: [
        base.rules[0],
        {
          name: "Big baskets",
          status: "active",
          pointsPerUnit: 1,
          multiplier: 1,
          bonusPoints: 25,
          allowedDays: [],
          minPurchaseAmount: 1000,
          isDefault: false,
        },
      ],
    });

    expect(text).toContain("• 25 Beans extra on orders over ₹1,000");
  });

  test("caps the reward list and counts the rest", () => {
    const text = buildJoinReplyText({
      ...base,
      rewards: Array.from({ length: 6 }, (_, index) => ({
        name: `Reward ${index}`,
        pointsCost: (index + 1) * 100,
      })),
    });

    expect(text).toContain("Reward 3 — 400 Beans");
    expect(text).not.toContain("Reward 4 —");
    expect(text).toContain("…and 2 more");
  });

  test("drops the sections a bare program has nothing to say in", () => {
    const text = buildJoinReplyText({
      ...base,
      signupBonus: 0,
      rules: [],
      rewards: [],
      balanceKeyword: "",
    });

    expect(text).toBe("Welcome to Kettle & Co Rewards! 🎉 You're in.");
  });
});
