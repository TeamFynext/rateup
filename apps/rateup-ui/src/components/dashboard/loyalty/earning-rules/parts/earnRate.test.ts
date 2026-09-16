import { describe, expect, test } from "vitest";

import { earnPairFromRate, pointsFor, rateFromEarnPair, sameRate } from "./earnRate";

describe("earnPairFromRate", () => {
  test("a whole rate is per one unit", () => {
    expect(earnPairFromRate(1)).toEqual({ spend: 1, points: 1 });
    expect(earnPairFromRate(2)).toEqual({ spend: 1, points: 2 });
  });

  test("a fraction becomes the smallest friendly spend that earns whole points", () => {
    expect(earnPairFromRate(0.1)).toEqual({ spend: 10, points: 1 });
    expect(earnPairFromRate(0.01)).toEqual({ spend: 100, points: 1 });
    expect(earnPairFromRate(0.15)).toEqual({ spend: 20, points: 3 });
    expect(earnPairFromRate(1 / 150)).toEqual({ spend: 150, points: 1 });
    // The stored, six-place version of the same rate reads back the same way.
    expect(earnPairFromRate(0.006667)).toEqual({ spend: 150, points: 1 });
    expect(earnPairFromRate(rateFromEarnPair(80, 3))).toEqual({ spend: 80, points: 3 });
  });

  test("a rate stored at six places round-trips its pair", () => {
    const rate = rateFromEarnPair(150, 1);
    expect(rate).toBe(0.006667);
    expect(pointsFor(150, rate)).toBe(1);
    expect(pointsFor(149, rate)).toBe(0);
  });

  test("zero and nonsense rates give a harmless pair", () => {
    expect(earnPairFromRate(0)).toEqual({ spend: 100, points: 0 });
    expect(earnPairFromRate(Number.NaN)).toEqual({ spend: 100, points: 0 });
  });
});

describe("rateFromEarnPair", () => {
  test("divides and rounds to storage precision", () => {
    expect(rateFromEarnPair(100, 10)).toBe(0.1);
    expect(rateFromEarnPair(3, 1)).toBe(0.333333);
    expect(rateFromEarnPair(0, 5)).toBe(0);
    expect(rateFromEarnPair(10, -1)).toBe(0);
  });

  test("sameRate tolerates the last stored digit", () => {
    expect(sameRate(0.333333, { spend: 3, points: 1 })).toBe(true);
    expect(sameRate(0.5, { spend: 3, points: 1 })).toBe(false);
  });
});
