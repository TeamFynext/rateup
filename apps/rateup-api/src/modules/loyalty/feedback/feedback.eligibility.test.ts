import { describe, expect, test } from "vitest";

import { WaFlowStatus } from "../../../types/enums.js";
import { buildFeedbackFlowJson, getFeedbackDraft } from "../../whatsapp/flows/flowTemplates.js";
import { feedbackEligibility } from "./feedback.eligibility.js";

const json = buildFeedbackFlowJson(getFeedbackDraft("restaurant")!);
const eligibleFlow = { json, version: 2, status: WaFlowStatus.DRAFT };

describe("feedbackEligibility", () => {
  test("a template-built flow is eligible whether draft or published", () => {
    expect(feedbackEligibility(eligibleFlow)).toEqual({ eligible: true });
    expect(feedbackEligibility({ ...eligibleFlow, status: WaFlowStatus.PUBLISHED })).toEqual({
      eligible: true,
    });
  });

  test("a v1 flow is not", () => {
    expect(feedbackEligibility({ ...eligibleFlow, version: 1 })).toMatchObject({
      eligible: false,
      reason: expect.stringContaining("old editor"),
    });
  });

  test.each([WaFlowStatus.DEPRECATED, WaFlowStatus.BLOCKED, WaFlowStatus.THROTTLED])(
    "a %s flow is not",
    (status) => {
      expect(feedbackEligibility({ ...eligibleFlow, status })).toEqual({
        eligible: false,
        reason: "No longer usable at Meta",
      });
    },
  );

  test("a flow whose gate was removed is not", () => {
    const stripped = structuredClone(json);
    for (const element of stripped.screens[0]!.layout.children) delete element.googleReview;
    expect(feedbackEligibility({ ...eligibleFlow, json: stripped })).toMatchObject({
      eligible: false,
      reason: expect.stringContaining("threshold"),
    });
  });

  test("a gate that is null, or on an element whose id and name differ, does not count", () => {
    const nulled = structuredClone(json);
    const overall = nulled.screens[0]!.layout.children.find((e) => e.name === "overall_rating")!;
    overall.googleReview = null;
    expect(feedbackEligibility({ ...eligibleFlow, json: nulled }).eligible).toBe(false);

    const renamed = structuredClone(json);
    const mismatched = renamed.screens[0]!.layout.children.find(
      (e) => e.name === "overall_rating",
    )!;
    mismatched.id = "something_else";
    expect(feedbackEligibility({ ...eligibleFlow, json: renamed }).eligible).toBe(false);
  });
});
