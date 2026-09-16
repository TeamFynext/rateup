import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import { buildFeedbackMetricTiles } from "./feedbackMetricTiles.ts";

const t = ((key: string, opts?: Record<string, unknown>) =>
  key.replace(/\{(\w+)\}/g, (_m, name: string) =>
    String(opts?.[name] ?? ""),
  )) as unknown as TFunction;

describe("buildFeedbackMetricTiles", () => {
  test("nothing to show before the results land", () => {
    expect(buildFeedbackMetricTiles(t, undefined)).toEqual([]);
  });

  test("six tiles, in order, with the denominators in the notes", () => {
    const tiles = buildFeedbackMetricTiles(t, {
      sent: 80,
      completed: 50,
      completionRate: 0.625,
      happy: 40,
      happyRate: 0.8,
      reviewClicks: 12,
      rewardsGranted: 9,
    });
    expect(tiles.map((tile) => tile.id)).toEqual([
      "sent",
      "completed",
      "completion_rate",
      "happy_rate",
      "review_clicks",
      "rewards_granted",
    ]);
    expect(tiles.map((tile) => tile.value)).toEqual(["80", "50", "63%", "80%", "12", "9"]);
    expect(tiles[1]?.note).toBe("50 of 80 finished the survey");
    expect(tiles[3]?.note).toBe("40 rated you above the threshold");
    expect(tiles.every((tile) => tile.delta === null)).toBe(true);
  });

  test("rates with no denominator show a dash, not NaN", () => {
    const tiles = buildFeedbackMetricTiles(t, {
      sent: 0,
      completed: 0,
      completionRate: null,
      happy: 0,
      happyRate: null,
      reviewClicks: 0,
      rewardsGranted: 0,
    });
    expect(tiles[2]?.value).toBe("—");
    expect(tiles[3]?.value).toBe("—");
  });
});
