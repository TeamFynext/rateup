import { describe, expect, test } from "vitest";

import type { VipTierFormValues } from "./schemas";
import { findVipTier, removedTiers, toTiersPayload } from "./vipTier";

const vip = {
  id: "v",
  name: "VIP",
  color: "#f8951d",
  threshold: 5000,
  pointsMultiplier: 1,
  benefitsDescription: "  ",
};

const values: VipTierFormValues = {
  tiersEnabled: true,
  qualificationWindowMonths: 6,
  base: { id: "b", name: " Member ", color: "#5A8CC6" },
  upper: [vip],
};

describe("toTiersPayload", () => {
  test("writes the base pinned to zero spend at 1×, then each upper tier", () => {
    const payload = toTiersPayload(values);
    expect(payload.tiers).toEqual([
      {
        id: "b",
        name: "Member",
        threshold: 0,
        pointsMultiplier: 1,
        color: "#5a8cc6",
        benefitsDescription: null,
      },
      {
        id: "v",
        name: "VIP",
        threshold: 5000,
        pointsMultiplier: 1,
        color: "#f8951d",
        benefitsDescription: null,
      },
    ]);
    expect(payload.qualificationWindowMonths).toBe(6);
    expect(payload.deleteMissing).toBe(true);
  });

  test("writes up to three rows, upper tiers ordered by spend however they were typed", () => {
    const payload = toTiersPayload({
      ...values,
      upper: [
        { ...vip, id: "top", name: "VIP+", threshold: 20000, pointsMultiplier: 2 },
        { ...vip, pointsMultiplier: 1.5 },
      ],
    });
    expect(payload.tiers.map((tier) => [tier.name, tier.threshold, tier.pointsMultiplier])).toEqual(
      [
        ["Member", 0, 1],
        ["VIP", 5000, 1.5],
        ["VIP+", 20000, 2],
      ],
    );
  });

  test("a window of 0 months means lifetime spend, which the API spells as null", () => {
    expect(
      toTiersPayload({ ...values, qualificationWindowMonths: 0 }).qualificationWindowMonths,
    ).toBeNull();
  });

  test("keeps the perks text when there is one", () => {
    const payload = toTiersPayload({
      ...values,
      upper: [{ ...vip, benefitsDescription: "Priority booking" }],
    });
    expect(payload.tiers[1].benefitsDescription).toBe("Priority booking");
  });
});

const saved = [
  {
    id: "t0",
    name: "Bronze",
    threshold: "0",
    pointsMultiplier: "1",
    color: "#a",
    benefitsDescription: null,
  },
  {
    id: "t1",
    name: "Silver",
    threshold: "1000",
    pointsMultiplier: "1",
    color: "#b",
    benefitsDescription: null,
  },
  {
    id: "t2",
    name: "Gold",
    threshold: "5000.00",
    pointsMultiplier: "2",
    color: "#c",
    benefitsDescription: null,
  },
];

describe("findVipTier", () => {
  test("is the highest tier above zero spend", () => {
    expect(findVipTier(saved)?.id).toBe("t2");
    expect(findVipTier([saved[0]])).toBeUndefined();
  });
});

describe("removedTiers", () => {
  test("lists saved tiers matched by neither id nor name", () => {
    const removed = removedTiers(saved, {
      ...values,
      base: { name: "bronze", color: "#5a8cc6" },
      upper: [{ id: "t2", name: "Gold", color: "#c", threshold: 5000, pointsMultiplier: 1 }],
    });
    expect(removed.map((t) => t.id)).toEqual(["t1"]);
  });

  test("nothing is removed when every saved tier is still in the form", () => {
    expect(
      removedTiers(saved, {
        ...values,
        base: { id: "t0", name: "Bronze", color: "#a" },
        upper: [
          { id: "t1", name: "Silver", color: "#b", threshold: 1000, pointsMultiplier: 1 },
          { id: "t2", name: "Gold", color: "#c", threshold: 5000, pointsMultiplier: 2 },
        ],
      }),
    ).toEqual([]);
  });
});
