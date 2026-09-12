import { describe, expect, test } from "vitest";

import type { SavedOnboardingData } from "@/backend/loyalty/onboarding.api";

import { paperHex } from "./brochurePapers.ts";
import {
  autoBlurb,
  brochureRows,
  buildMaterialsDefaults,
  defaultEarnLine,
  parseMaterials,
  pointsLabelOf,
  type MaterialsContext,
} from "./materials.ts";

const program = {
  name: "Just Foodinn Rewards",
  currencyName: "Points",
  currencyCode: "INR",
  currencySymbol: "₹",
  brandColor: "#1c518e",
};

const rewards: SavedOnboardingData["rewards"] = [
  {
    id: "r-pancake",
    name: "Plain pancakes",
    description: null,
    pointsCost: 1000,
    rewardType: "point",
    rewardValue: { type: "free_item", item_name: "Plain Pancakes", item_value: 120, quantity: 1 },
  },
  {
    id: "r-cash",
    name: "₹1,000 off",
    description: null,
    pointsCost: 5000,
    rewardType: "point",
    rewardValue: { type: "discount_fixed", amount: 1000 },
  },
  {
    id: "r-pct",
    name: "10% off",
    description: null,
    pointsCost: 3000,
    rewardType: "point",
    rewardValue: { type: "discount_percentage", percentage: 10, max_discount_amount: null },
  },
  {
    id: "r-coupon",
    name: "Coupon",
    description: null,
    pointsCost: 0,
    rewardType: "coupon",
    rewardValue: { code: "X" },
  },
  {
    id: "r-retired",
    name: "Old",
    description: null,
    status: "INACTIVE",
    pointsCost: 10,
    rewardType: "point",
    rewardValue: { type: "free_item", item_name: "Old", quantity: 1 },
  },
];

const rules: SavedOnboardingData["rules"] = [
  {
    id: "rule",
    name: "Standard",
    description: null,
    pointsPerUnit: "1.000000",
    multiplier: "1.00",
    bonusPoints: 0,
    allowedDays: [],
    isDefault: true,
    priority: 0,
  },
];

const context: MaterialsContext = { program, rules, rewards, joinKeyword: "join" };

describe("parseMaterials", () => {
  test("accepts a partial version-1 document and rejects anything else", () => {
    expect(parseMaterials({ version: 1, brochure: { title: "Hi" } })).toEqual({
      version: 1,
      brochure: { title: "Hi" },
    });
    expect(parseMaterials({ version: 2 })).toBeNull();
    expect(parseMaterials("nope")).toBeNull();
    expect(parseMaterials(null)).toBeNull();
  });
});

describe("buildMaterialsDefaults", () => {
  test("writes the brochure from the programme when nothing is stored", () => {
    const materials = buildMaterialsDefaults(context, null);
    expect(materials.qr).toEqual({
      headline: "Scan to join Just Foodinn Rewards",
      subline: "Earn Points on every visit",
      showHero: true,
      footnote: "Just send “join”",
    });
    expect(materials.brochure.title).toBe("Just Foodinn Rewards");
    expect(materials.brochure.earnLine).toBe("₹1 spent = 1 Point");
    // Point rewards only, cheapest first; the coupon and the retired reward are left out.
    expect(materials.brochure.rewards.map((r) => r.rewardId)).toEqual([
      "r-pancake",
      "r-pct",
      "r-cash",
    ]);
    expect(materials.brochure.rewards[0].blurb).toBe("Get Plain Pancakes on us");
    expect(materials.brochure.rewards[2].blurb).toBe("₹1,000 off your bill");
  });

  test("keeps the merchant's copy and reconciles the reward list", () => {
    const stored = parseMaterials({
      version: 1,
      qr: { headline: "Join us" },
      brochure: {
        title: "Foodinn Club",
        rewards: [
          { rewardId: "r-cash", include: false, blurb: "A grand off the bill" },
          { rewardId: "r-gone", include: true, blurb: "Deleted since" },
        ],
      },
    });
    const materials = buildMaterialsDefaults(context, stored);
    expect(materials.qr.headline).toBe("Join us");
    expect(materials.qr.subline).toBe("Earn Points on every visit");
    expect(materials.brochure.title).toBe("Foodinn Club");
    expect(materials.brochure.tagline).toBe("Get rewarded on every purchase");
    expect(materials.brochure.rewards).toEqual([
      { rewardId: "r-pancake", include: true, blurb: "Get Plain Pancakes on us" },
      { rewardId: "r-pct", include: true, blurb: "10% off your bill" },
      { rewardId: "r-cash", include: false, blurb: "A grand off the bill" },
    ]);
  });

  test("a brochure with nothing stored opens on the menu card, warm white, no QR", () => {
    const brochure = buildMaterialsDefaults(context, null).brochure;
    expect(brochure.design).toBe("menu");
    expect(brochure.background).toBe(paperHex("warm-white", program.brandColor));
    // Off by default: the counter poster already carries a code, so this one is opt-in.
    expect(brochure.showQr).toBe(false);
  });

  test("a stored design and background colour are kept", () => {
    const stored = parseMaterials({
      version: 1,
      brochure: { design: "tent", background: "#2D211C", showQr: true },
    });
    const brochure = buildMaterialsDefaults(context, stored).brochure;
    expect(brochure.design).toBe("tent");
    // Normalised, so the picker and the card agree on one spelling.
    expect(brochure.background).toBe("#2d211c");
    expect(brochure.showQr).toBe(true);
  });

  // The background used to be one of eleven named papers. A document written then still
  // has to print the colour the merchant chose, not fall back to warm white.
  test("a document stored before the background was a free colour keeps its look", () => {
    const stored = parseMaterials({ version: 1, brochure: { paper: "deep-ink" } });
    const brochure = buildMaterialsDefaults(context, stored).brochure;
    expect(brochure.background).toBe(paperHex("deep-ink", program.brandColor));
  });

  test("a saved hex wins over a paper name left beside it", () => {
    const stored = parseMaterials({
      version: 1,
      brochure: { paper: "deep-ink", background: "#faf3e3" },
    });
    expect(buildMaterialsDefaults(context, stored).brochure.background).toBe("#faf3e3");
  });

  test("a background that is not a colour falls back rather than printing junk", () => {
    const stored = parseMaterials({ version: 1, brochure: { background: "rebeccapurple" } });
    expect(buildMaterialsDefaults(context, stored).brochure.background).toBe(
      paperHex("warm-white", program.brandColor),
    );
  });

  // A document written by a later build, or hand-edited. The copy must survive even when
  // the layout it names does not, which is why these are parsed as plain strings and
  // narrowed here rather than by the schema.
  test("a design or paper this build does not know falls back without losing the copy", () => {
    const stored = parseMaterials({
      version: 1,
      brochure: { design: "trifold", paper: "letterpress", title: "Foodinn Club" },
    });
    const brochure = buildMaterialsDefaults(context, stored).brochure;
    expect(brochure.design).toBe("menu");
    expect(brochure.background).toBe(paperHex("warm-white", program.brandColor));
    expect(brochure.title).toBe("Foodinn Club");
  });

  // The rateup.app footer prints on every design now, so a document that switched it off
  // is read for its copy and that one field ignored.
  test("an older document's powered-by preference is ignored, not honoured", () => {
    const stored = parseMaterials({
      version: 1,
      brochure: { title: "Foodinn Club", showPoweredBy: false },
    });
    const brochure = buildMaterialsDefaults(context, stored).brochure;
    expect(brochure.title).toBe("Foodinn Club");
    expect(brochure).not.toHaveProperty("showPoweredBy");
  });
});

describe("helpers", () => {
  test("earn line reads the default rule as a whole-number pair", () => {
    expect(
      defaultEarnLine({
        ...context,
        rules: [{ ...rules[0], pointsPerUnit: "0.006667" }],
      }),
    ).toBe("₹150 spent = 1 Point");
    expect(defaultEarnLine({ ...context, rules: [] })).toBe("");
  });

  test("blurbs fall back to the reward's name when the value is unreadable", () => {
    expect(autoBlurb({ ...rewards[0], rewardValue: {} }, program)).toBe("Plain pancakes");
  });

  test("points label is PTS for points and the unit itself otherwise", () => {
    expect(pointsLabelOf("Points")).toBe("PTS");
    expect(pointsLabelOf("Beans")).toBe("BEANS");
  });

  test("brochure rows are the included lines with their cost, cheapest first", () => {
    const rows = brochureRows(
      {
        rewards: [
          { rewardId: "r-cash", include: true, blurb: "" },
          { rewardId: "r-pancake", include: true, blurb: "Pancakes!" },
          { rewardId: "r-pct", include: false, blurb: "x" },
        ],
      },
      rewards,
    );
    expect(rows).toEqual([
      { points: 1000, blurb: "Pancakes!", tier: null },
      { points: 5000, blurb: "₹1,000 off", tier: null },
    ]);
  });

  test("a reward gated on a tier carries that tier, so the brochure can mark it", () => {
    const tiers: SavedOnboardingData["tiers"] = [
      {
        id: "t0",
        name: "Member",
        threshold: 0,
        pointsMultiplier: 1,
        color: "#5a8cc6",
        benefitsDescription: null,
      },
      {
        id: "t1",
        name: "VIP",
        threshold: 5000,
        pointsMultiplier: 1,
        color: "#f8951d",
        benefitsDescription: null,
      },
    ];
    const rows = brochureRows(
      { rewards: [{ rewardId: "r-cash", include: true, blurb: "" }] },
      [{ ...rewards[1], availableForTiers: ["t1"] }],
      tiers,
    );
    expect(rows[0].tier).toEqual({ id: "t1", name: "VIP", color: "#f8951d", threshold: 5000 });
  });
});
