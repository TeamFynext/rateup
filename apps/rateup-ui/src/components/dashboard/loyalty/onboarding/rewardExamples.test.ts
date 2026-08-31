import { describe, expect, it } from "vitest";

import type { LoyaltyPresetKey } from "@/backend/loyalty/onboarding.api";

import { rewardEconomics } from "../giveback/calculateGiveback";
import { buildExample, REWARD_EXAMPLE_KINDS, rewardExamplesFor } from "./rewardExamples";
import { readCap, readItemValue, readRewardValueType } from "./rewardValue";

/** The typical order value each starter pack ships with, from the API's presets.ts. */
const PRESET_AOV: Record<LoyaltyPresetKey, number> = {
  cafe: 250,
  retail: 1200,
  salon: 1500,
  gym: 2000,
  generic: 500,
};

const PRESET_KEYS = Object.keys(PRESET_AOV) as LoyaltyPresetKey[];
const EARN = { pointsPerUnit: 1, multiplier: 1 };

function contextFor(averageOrderValue: number | null) {
  return { averageOrderValue, earnRate: EARN, currencyCode: "INR", currencySymbol: "₹" };
}

describe("rewardExamplesFor", () => {
  it.each(PRESET_KEYS)("gives %s all three kinds", (presetKey) => {
    const examples = rewardExamplesFor(presetKey);
    for (const kind of REWARD_EXAMPLE_KINDS) {
      expect(examples[kind].length).toBeGreaterThan(0);
      expect(examples[kind].every((example) => example.kind === kind)).toBe(true);
    }
  });

  it("gives every business its own free-item vocabulary", () => {
    const names = PRESET_KEYS.map((key) =>
      rewardExamplesFor(key)
        .free_item.map((example) => example.name)
        .join("|"),
    );
    expect(new Set(names).size).toBe(PRESET_KEYS.length);
  });

  it("offers the same percentage and cash examples to everyone", () => {
    const cafe = rewardExamplesFor("cafe");
    for (const key of PRESET_KEYS) {
      expect(rewardExamplesFor(key).discount_percentage).toBe(cafe.discount_percentage);
      expect(rewardExamplesFor(key).discount_fixed).toBe(cafe.discount_fixed);
    }
  });

  it("has globally unique ids, so they are safe as React keys", () => {
    const ids = PRESET_KEYS.flatMap((key) =>
      REWARD_EXAMPLE_KINDS.flatMap((kind) => rewardExamplesFor(key)[kind].map((e) => e.id)),
    );
    expect(new Set(ids).size).toBe(new Set(ids).size);
    for (const key of PRESET_KEYS) {
      const perPreset = REWARD_EXAMPLE_KINDS.flatMap((kind) =>
        rewardExamplesFor(key)[kind].map((e) => e.id),
      );
      expect(new Set(perPreset).size).toBe(perPreset.length);
    }
  });
});

describe("buildExample", () => {
  it("returns null without an order value, rather than guessing", () => {
    const example = rewardExamplesFor("cafe").free_item[0];
    expect(buildExample(example, contextFor(null))).toBeNull();
    expect(buildExample(example, contextFor(0))).toBeNull();
  });

  it("scales a free item with the order value instead of hardcoding money", () => {
    const example = rewardExamplesFor("cafe").free_item[0];
    const small = buildExample(example, contextFor(250));
    const large = buildExample(example, contextFor(2500));
    expect(small).not.toBeNull();
    expect(large).not.toBeNull();
    expect(readItemValue(large?.rewardValue)).toBeGreaterThan(
      readItemValue(small?.rewardValue) ?? 0,
    );
  });

  it("names a cash reward after its money, so it reads right in any currency", () => {
    const example = rewardExamplesFor("cafe").discount_fixed[0];
    expect(buildExample(example, contextFor(250))?.label).toContain("off");
    expect(buildExample(example, contextFor(250))?.label).toMatch(/\d/);
  });

  it("puts the cap in both the value and the label when there is one", () => {
    const capped = rewardExamplesFor("cafe").discount_percentage.find((e) => e.capAovMultiple);
    expect(capped).toBeDefined();
    const built = buildExample(capped!, contextFor(1000));
    expect(readCap(built?.rewardValue)).toBe(500);
    expect(built?.label).toContain("up to");
  });

  it("leaves the cap null when the example has none", () => {
    const uncapped = rewardExamplesFor("cafe").discount_percentage.find((e) => !e.capAovMultiple);
    const built = buildExample(uncapped!, contextFor(1000));
    expect(readCap(built?.rewardValue)).toBeNull();
  });

  it("still builds when nothing is earned per unit spent, just without a price", () => {
    const example = rewardExamplesFor("cafe").free_item[0];
    const built = buildExample(example, {
      ...contextFor(250),
      earnRate: { pointsPerUnit: 0, multiplier: 1 },
    });
    expect(built).not.toBeNull();
    expect(built?.pointsCost).toBeNull();
  });
});

describe("every example is priced into the healthy band", () => {
  const cases = PRESET_KEYS.flatMap((presetKey) =>
    REWARD_EXAMPLE_KINDS.flatMap((kind) =>
      rewardExamplesFor(presetKey)[kind].map(
        (example) => [presetKey, example.id, example] as const,
      ),
    ),
  );

  it.each(cases)("%s / %s", (presetKey, _id, example) => {
    const aov = PRESET_AOV[presetKey];
    const built = buildExample(example, contextFor(aov));

    expect(built).not.toBeNull();
    expect(built?.pointsCost).not.toBeNull();
    expect(readRewardValueType(built?.rewardValue)).toBe(example.kind);

    const economics = rewardEconomics({
      rewardValue: built?.rewardValue,
      pointsCost: built?.pointsCost ?? 0,
      earnRate: EARN,
      averageOrderValue: aov,
    });

    expect(economics.band).toBe("healthy");
    expect(economics.givebackPct).toBeGreaterThan(2.7);
    expect(economics.givebackPct).toBeLessThan(3.3);
  });
});
