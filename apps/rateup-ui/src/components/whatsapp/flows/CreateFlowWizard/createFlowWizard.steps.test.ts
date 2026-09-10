import { describe, expect, test } from "vitest";

import {
  FLOW_TYPE_META,
  isFlowType,
  isWizardStep,
  nextStep,
  previousStep,
  stepsFor,
} from "./createFlowWizard.steps.ts";

describe("flow types", () => {
  test("loyalty feedback fixes the category and has templates; other asks for categories", () => {
    expect(FLOW_TYPE_META.loyalty_feedback).toEqual({
      categories: ["LOYALTY_FEEDBACK"],
      hasTemplates: true,
    });
    expect(FLOW_TYPE_META.other).toEqual({ hasTemplates: false });
  });

  test("narrowing helpers", () => {
    expect(isFlowType("other")).toBe(true);
    expect(isFlowType("survey")).toBe(false);
    expect(isWizardStep("template")).toBe(true);
    expect(isWizardStep(undefined)).toBe(false);
  });
});

describe("stepsFor / nextStep / previousStep", () => {
  test("nothing chosen yet: only the type step", () => {
    expect(stepsFor(undefined)).toEqual(["type"]);
    expect(nextStep(undefined, "type")).toBeNull();
  });

  test("loyalty feedback walks type → template → details", () => {
    expect(stepsFor("loyalty_feedback")).toEqual(["type", "template", "details"]);
    expect(nextStep("loyalty_feedback", "type")).toBe("template");
    expect(nextStep("loyalty_feedback", "template")).toBe("details");
    expect(nextStep("loyalty_feedback", "details")).toBeNull();
    expect(previousStep("loyalty_feedback", "details")).toBe("template");
  });

  test("other skips the template step both ways", () => {
    expect(stepsFor("other")).toEqual(["type", "details"]);
    expect(nextStep("other", "type")).toBe("details");
    expect(previousStep("other", "details")).toBe("type");
    expect(previousStep("other", "type")).toBeNull();
  });
});
