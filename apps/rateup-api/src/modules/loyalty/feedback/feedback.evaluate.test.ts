import { describe, expect, test } from "vitest";

import { buildFeedbackFlowJson, getFeedbackDraft } from "./feedback.drafts.js";
import { extractOverallRating, parseRating, ratingAveragesByElement } from "./feedback.evaluate.js";

const JSON_RESTAURANT = buildFeedbackFlowJson(getFeedbackDraft("restaurant")!);

describe("parseRating", () => {
  test("reads the choice id as the star count", () => {
    expect(parseRating("4")).toBe(4);
    expect(parseRating(5)).toBe(5);
    expect(parseRating(["2"])).toBe(2);
  });

  test("ignores anything that is not a 1–5 rating", () => {
    expect(parseRating("0")).toBeNull();
    expect(parseRating("6")).toBeNull();
    expect(parseRating("great")).toBeNull();
    expect(parseRating(null)).toBeNull();
    expect(parseRating(undefined)).toBeNull();
    expect(parseRating({})).toBeNull();
  });
});

describe("extractOverallRating", () => {
  test("reads the gated element's answer", () => {
    const answers = [
      { questionId: "food_quality", response: "5" },
      { questionId: "overall_rating", response: "3" },
    ];
    expect(extractOverallRating(JSON_RESTAURANT, answers)).toBe(3);
  });

  test("is null when the overall question was not answered", () => {
    expect(extractOverallRating(JSON_RESTAURANT, [{ questionId: "service", response: "4" }])).toBe(
      null,
    );
    expect(extractOverallRating({ version: "7.2", screens: [] }, [])).toBeNull();
  });
});

describe("ratingAveragesByElement", () => {
  test("averages each rating element and lists unrated ones with null", () => {
    const sets = [
      [
        { questionId: "overall_rating", response: "5" },
        { questionId: "food_quality", response: "4" },
        { questionId: "comments", response: "Loved it" },
      ],
      [
        { questionId: "overall_rating", response: "2" },
        { questionId: "food_quality", response: "not-a-rating" },
      ],
    ];
    expect(ratingAveragesByElement(JSON_RESTAURANT, sets)).toEqual([
      { elementId: "overall_rating", title: "Overall experience", average: 3.5, count: 2 },
      { elementId: "food_quality", title: "Food quality", average: 4, count: 1 },
      { elementId: "service", title: "Service", average: null, count: 0 },
    ]);
  });

  test("rounds to two decimals", () => {
    const sets = [
      [{ questionId: "overall_rating", response: "5" }],
      [{ questionId: "overall_rating", response: "4" }],
      [{ questionId: "overall_rating", response: "4" }],
    ];
    expect(ratingAveragesByElement(JSON_RESTAURANT, sets)[0]?.average).toBe(4.33);
  });
});
