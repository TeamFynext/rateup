import { describe, expect, test } from "vitest";

import { WaQuestions } from "../../../types/enums.js";
import {
  buildFeedbackFlowJson,
  buildFeedbackTemplateMessage,
  DEFAULT_HAPPY_MIN_RATING,
  FEEDBACK_DRAFT_KEYS,
  FEEDBACK_DRAFTS,
  FEEDBACK_FLOW_SCREEN_ID,
  feedbackDraftForApi,
  findOverallRatingElement,
  getFeedbackDraft,
  isFeedbackDraftKey,
  setHappyMinRating,
  suggestFeedbackDraftKey,
} from "./flowTemplates.js";

describe("the draft catalogue", () => {
  test("has one definition per key, and the restaurant draft asks the three things the brief named", () => {
    expect(FEEDBACK_DRAFTS.map((d) => d.key)).toEqual([...FEEDBACK_DRAFT_KEYS]);
    expect(getFeedbackDraft("restaurant")?.questions.map((q) => q.title)).toEqual([
      "Overall experience",
      "Food quality",
      "Service",
      "Anything we could do better?",
    ]);
    expect(getFeedbackDraft("nope")).toBeUndefined();
  });

  test("isFeedbackDraftKey narrows", () => {
    expect(isFeedbackDraftKey("gym")).toBe(true);
    expect(isFeedbackDraftKey("cafe")).toBe(false);
    expect(isFeedbackDraftKey(undefined)).toBe(false);
  });

  test("the suggestion maps the onboarding presets, and falls back to generic", () => {
    expect(suggestFeedbackDraftKey("cafe")).toBe("restaurant");
    expect(suggestFeedbackDraftKey("retail")).toBe("retail");
    expect(suggestFeedbackDraftKey("salon")).toBe("salon");
    expect(suggestFeedbackDraftKey("gym")).toBe("gym");
    expect(suggestFeedbackDraftKey("generic")).toBe("generic");
    expect(suggestFeedbackDraftKey(null)).toBe("generic");
    expect(suggestFeedbackDraftKey("something-else")).toBe("generic");
  });
});

describe("buildFeedbackFlowJson", () => {
  // What the reply handlers need to be true of every draft, whichever one is picked.
  test.each(FEEDBACK_DRAFTS.map((draft) => [draft.key, draft] as const))(
    "%s produces a single terminal screen in the v2 dialect",
    (_key, draft) => {
      const json = buildFeedbackFlowJson(draft);
      expect(json.version).toBe("7.2");
      expect(json.screens).toHaveLength(1);

      const screen = json.screens[0]!;
      expect(screen.id).toBe(FEEDBACK_FLOW_SCREEN_ID);
      expect(screen.terminal).toBe(true);
      expect(screen.layout.type).toBe("SingleColumnLayout");

      const children = screen.layout.children;
      const interactive = children.filter((c) => typeof c.name === "string");
      // v2 answers are keyed by name and looked up by id, so the two must agree.
      for (const element of interactive) {
        expect(element.id).toBe(element.name);
        expect(element.name).toMatch(/^[a-z_]+$/);
      }
      expect(new Set(interactive.map((c) => c.name)).size).toBe(interactive.length);

      const ratings = children.filter((c) => c.metaType === WaQuestions.Rating);
      expect(ratings.length).toBe(draft.questions.filter((q) => q.kind === "rating").length);
      for (const rating of ratings) {
        expect(rating.type).toBe("Dropdown");
        expect(rating["data-source"]?.map((choice) => choice.id)).toEqual([
          "1",
          "2",
          "3",
          "4",
          "5",
        ]);
      }

      // Exactly one element decides the Google-review question, at the default threshold.
      const gated = children.filter((c) => c.googleReview !== undefined);
      expect(gated).toHaveLength(1);
      expect(gated[0]?.googleReview).toEqual({ minRating: DEFAULT_HAPPY_MIN_RATING });

      const footer = children.at(-1)!;
      expect(footer.type).toBe("Footer");
      expect(footer["on-click-action"]?.name).toBe("complete");
    },
  );

  test("honours a custom happy threshold", () => {
    const json = buildFeedbackFlowJson(getFeedbackDraft("salon")!, { happyMinRating: 5 });
    expect(findOverallRatingElement(json)?.googleReview).toEqual({ minRating: 5 });
  });
});

describe("setHappyMinRating", () => {
  test("rewrites only the gated element and leaves the input untouched", () => {
    const original = buildFeedbackFlowJson(getFeedbackDraft("restaurant")!);
    const updated = setHappyMinRating(original, 3);

    expect(findOverallRatingElement(updated)?.googleReview).toEqual({ minRating: 3 });
    expect(findOverallRatingElement(original)?.googleReview).toEqual({
      minRating: DEFAULT_HAPPY_MIN_RATING,
    });
    const gatedCount = updated.screens[0]!.layout.children.filter(
      (c) => c.googleReview !== undefined,
    ).length;
    expect(gatedCount).toBe(1);
  });
});

describe("API shapes", () => {
  test("feedbackDraftForApi carries titles, kinds and a renderable preview", () => {
    const api = feedbackDraftForApi(getFeedbackDraft("gym")!);
    expect(api.key).toBe("gym");
    expect(api.questions).toEqual([
      { title: "Overall experience", kind: "rating" },
      { title: "Equipment & facilities", kind: "rating" },
      { title: "Trainers & staff", kind: "rating" },
      { title: "Anything we could do better?", kind: "text" },
    ]);
    expect(api.previewJson.screens[0]?.id).toBe(FEEDBACK_FLOW_SCREEN_ID);
  });

  test("the interactive opener names the business when there is one", () => {
    expect(buildFeedbackTemplateMessage("Kettle & Co").body).toContain("at Kettle & Co");
    expect(buildFeedbackTemplateMessage("  ").body).not.toContain(" at ");
    expect(buildFeedbackTemplateMessage(null).cta).toBe("Share feedback");
  });
});
