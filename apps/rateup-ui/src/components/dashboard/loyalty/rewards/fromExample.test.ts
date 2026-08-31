import { describe, expect, it } from "vitest";

import type { RewardExamplePick } from "../giveback/RewardExamplePicker";
import { buildExample, rewardExamplesFor } from "../onboarding/rewardExamples";
import { giftFromExample, pointRewardFromExample } from "./fromExample";
import type { GiftFormValues, PointRewardFormValues } from "./schemas";

const POINT_DEFAULTS: PointRewardFormValues = {
  name: "",
  description: "",
  rewardType: "fixed-discount",
  pointsCost: 0,
  cashbackAmount: 0,
  discountPercentage: 0,
  estimatedValue: 0,
  restrictions: "",
  waTemplateId: "",
  tierIds: [],
  minimumSpend: undefined,
  availableDays: [],
  timeFrom: undefined,
  timeTo: undefined,
};

const GIFT_DEFAULTS: GiftFormValues = {
  name: "",
  description: "",
  giftQuantity: 1,
  estimatedValue: 0,
  restrictions: "",
  waTemplateId: "",
  tierIds: [],
};

const CONTEXT = {
  averageOrderValue: 250,
  earnRate: { pointsPerUnit: 1, multiplier: 1 },
  currencyCode: "INR",
  currencySymbol: "₹",
};

function pickOf(kind: "free_item" | "discount_percentage" | "discount_fixed"): RewardExamplePick {
  const example = rewardExamplesFor("cafe")[kind][0];
  const built = buildExample(example, CONTEXT);
  expect(built).not.toBeNull();
  return { kind, built: built! };
}

describe("pointRewardFromExample", () => {
  it("maps a free item onto this editor's own vocabulary", () => {
    const values = pointRewardFromExample(pickOf("free_item"), POINT_DEFAULTS);

    expect(values.rewardType).toBe("free-item");
    expect(values.estimatedValue).toBeGreaterThan(0);
    expect(values.pointsCost).toBeGreaterThan(0);
    expect(values.name).not.toBe("");
    // Only the field this type shows is filled — the others would be dead values.
    expect(values.cashbackAmount).toBe(0);
    expect(values.discountPercentage).toBe(0);
  });

  it("maps cash off to a cashback amount", () => {
    const values = pointRewardFromExample(pickOf("discount_fixed"), POINT_DEFAULTS);

    expect(values.rewardType).toBe("fixed-discount");
    expect(values.cashbackAmount).toBeGreaterThan(0);
    expect(values.estimatedValue).toBe(0);
    expect(values.discountPercentage).toBe(0);
  });

  it("maps a percentage off to a discount percentage", () => {
    const values = pointRewardFromExample(pickOf("discount_percentage"), POINT_DEFAULTS);

    expect(values.rewardType).toBe("percentage-discount");
    expect(values.discountPercentage).toBeGreaterThan(0);
    expect(values.cashbackAmount).toBe(0);
    expect(values.estimatedValue).toBe(0);
  });

  it("keeps every other default, so the form's own fields survive", () => {
    const values = pointRewardFromExample(pickOf("free_item"), {
      ...POINT_DEFAULTS,
      tierIds: ["tier-1"],
      restrictions: "Weekdays only",
    });

    expect(values.tierIds).toEqual(["tier-1"]);
    expect(values.restrictions).toBe("Weekdays only");
  });

  it("a blank tile still selects the right type, so the right field is on screen", () => {
    const values = pointRewardFromExample({ kind: "free_item", built: null }, POINT_DEFAULTS);

    expect(values.rewardType).toBe("free-item");
    expect(values.name).toBe("");
    expect(values.pointsCost).toBe(0);
  });
});

describe("giftFromExample", () => {
  it("prefers the item's own name over the example's headline", () => {
    const values = giftFromExample(pickOf("free_item"), GIFT_DEFAULTS);

    // "Free coffee" is the headline; "Regular hot drink" is the thing handed over.
    expect(values.name).toBe("Regular hot drink");
    expect(values.estimatedValue).toBeGreaterThan(0);
    expect(values.giftQuantity).toBe(1);
  });

  it("returns the defaults untouched for a blank tile", () => {
    expect(giftFromExample({ kind: "free_item", built: null }, GIFT_DEFAULTS)).toEqual(
      GIFT_DEFAULTS,
    );
  });
});
