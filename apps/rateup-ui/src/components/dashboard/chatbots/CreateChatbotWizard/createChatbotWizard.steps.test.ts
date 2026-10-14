import { describe, expect, test } from "vitest";

import { AutomationPlatform } from "@/types/platform.ts";

import {
  firstStep,
  FROM_SCRATCH,
  isStepComplete,
  nextStep,
  previousStep,
  stepsFor,
} from "./createChatbotWizard.steps.ts";

describe("stepsFor / nextStep / previousStep", () => {
  test("from the generic button: channel → starting point → details", () => {
    expect(stepsFor(false)).toEqual(["channel", "start", "details"]);
    expect(firstStep(false)).toBe("channel");
    expect(nextStep(false, "channel")).toBe("start");
    expect(nextStep(false, "start")).toBe("details");
    expect(nextStep(false, "details")).toBeNull();
    expect(previousStep(false, "details")).toBe("start");
    expect(previousStep(false, "channel")).toBeNull();
  });

  // Opened from a channel's own page, there is nothing to choose on the channel step.
  test("from a channel's page the channel step is skipped both ways", () => {
    expect(stepsFor(true)).toEqual(["start", "details"]);
    expect(firstStep(true)).toBe("start");
    expect(nextStep(true, "start")).toBe("details");
    expect(previousStep(true, "start")).toBeNull();
    expect(nextStep(true, "channel")).toBeNull();
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
