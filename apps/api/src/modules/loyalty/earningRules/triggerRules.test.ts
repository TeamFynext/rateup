import { describe, expect, test } from "vitest";

import { isPurchaseRule, onlyPurchaseRules, toInstagramMentionConfig } from "./triggerRules.js";

describe("trigger rules", () => {
  const mention = { conditions: { trigger: "instagram_mention" } };

  test("a rule with a trigger never counts as a purchase rule", () => {
    expect(isPurchaseRule(mention)).toBe(false);
    expect(isPurchaseRule({ conditions: {} })).toBe(true);
    expect(isPurchaseRule({ conditions: null })).toBe(true);
    expect(onlyPurchaseRules([mention, { conditions: {} }])).toHaveLength(1);
  });

  test("reads the option with defaults for a missing or partial rule", () => {
    expect(toInstagramMentionConfig(null)).toMatchObject({
      id: null,
      enabled: false,
      cooldownDays: 7,
    });
    expect(
      toInstagramMentionConfig({
        id: "r1",
        status: "active",
        bonusPoints: 30,
        conditions: { trigger: "instagram_mention", mentionKinds: ["STORY"], cooldownDays: 0 },
      }),
    ).toEqual({
      id: "r1",
      enabled: true,
      pointsPerMention: 30,
      mentionKinds: ["STORY"],
      cooldownDays: 0,
    });
  });
});
