import { describe, expect, test } from "vitest";

import { AutomationPlatform } from "@/types/platform.ts";

import {
  FROM_SCRATCH,
  isStepComplete,
  nextStep,
  previousStep,
  WIZARD_STEPS,
} from "./createChatbotWizard.steps.ts";

describe("nextStep / previousStep", () => {
  test("channel → starting point → details", () => {
    expect(WIZARD_STEPS).toEqual(["channel", "start", "details"]);
    expect(nextStep("channel")).toBe("start");
    expect(nextStep("start")).toBe("details");
    expect(nextStep("details")).toBeNull();
    expect(previousStep("details")).toBe("start");
    expect(previousStep("channel")).toBeNull();
  });
});

describe("isStepComplete", () => {
  test("the channel step needs a channel", () => {
    expect(isStepComplete("channel", {})).toBe(false);
    expect(isStepComplete("channel", { platform: AutomationPlatform.FACEBOOK })).toBe(true);
  });

  test("the starting point accepts an example or starting from scratch", () => {
    expect(isStepComplete("start", {})).toBe(false);
    expect(isStepComplete("start", { start: "fb-page-welcome" })).toBe(true);
    expect(isStepComplete("start", { start: FROM_SCRATCH })).toBe(true);
  });

  // The same rule as the old create form: at least three characters, ignoring spaces.
  test("details needs a name of at least three characters", () => {
    expect(isStepComplete("details", { name: "  ab  " })).toBe(false);
    expect(isStepComplete("details", { name: "Bot" })).toBe(true);
  });
});
