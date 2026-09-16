import { describe, expect, test } from "vitest";

import { LOYALTY_FEEDBACK_FLOW_CATEGORY } from "@/types/enums.ts";

import { FLOW_PURPOSES } from "../constants.tsx";
import {
  hasTemplates,
  isFlowType,
  isWizardStep,
  nextStep,
  previousStep,
  stepsFor,
  templateCategoryFor,
} from "./createFlowWizard.steps.ts";

describe("flow purposes", () => {
  test("nine purposes: Meta's eight plus RateUp's own", () => {
    expect(FLOW_PURPOSES).toHaveLength(9);
    expect(FLOW_PURPOSES.map((p) => p.value)).toEqual([
      "SIGN_UP",
      "SIGN_IN",
      "APPOINTMENT_BOOKING",
      "LEAD_GENERATION",
      "CONTACT_US",
      "CUSTOMER_SUPPORT",
      "SURVEY",
      "LOYALTY_FEEDBACK",
      "OTHER",
    ]);
  });

  test("values are unique and every purpose carries an icon", () => {
    const values = FLOW_PURPOSES.map((p) => p.value);
    expect(new Set(values).size).toBe(values.length);
    for (const purpose of FLOW_PURPOSES) {
      expect(purpose.icon).toBeTruthy();
    }
  });

  // Loyalty feedback is one purpose among nine, not the headline — it sits after Survey,
  // second from last. A change here is a change to how much prominence it gets.
  test("loyalty feedback is eighth, not first", () => {
    expect(FLOW_PURPOSES.findIndex((p) => p.value === LOYALTY_FEEDBACK_FLOW_CATEGORY)).toBe(7);
  });

  // The compatibility contract for stored rows and for `?for=`: a category Meta adds later
  // must read as unknown rather than resolve to the wrong purpose.
  test("a category we do not list is not a purpose", () => {
    expect(isFlowType("APPOINTMENT_BOOKING")).toBe(true);
    expect(isFlowType("SOMETHING_META_ADDED_LATER")).toBe(false);
  });
});

describe("hasTemplates", () => {
  // The templates endpoint answers every category but this one with an empty catalogue, so
  // a second `true` here would send the user to an empty step.
  test("only loyalty feedback has a ready-made start", () => {
    expect(hasTemplates(LOYALTY_FEEDBACK_FLOW_CATEGORY)).toBe(true);
    for (const purpose of FLOW_PURPOSES) {
      if (purpose.value === LOYALTY_FEEDBACK_FLOW_CATEGORY) continue;
      expect(hasTemplates(purpose.value)).toBe(false);
    }
  });
});

describe("templateCategoryFor", () => {
  // This is the guard against the create call being rejected as an unknown template. The
  // catalogue query is keyed on what this returns, and a disabled react-query still serves
  // whatever is cached under its key — so a purpose with no templates must key on nothing
  // rather than share loyalty feedback's key.
  test("only a purpose that has templates loads a catalogue", () => {
    expect(templateCategoryFor(LOYALTY_FEEDBACK_FLOW_CATEGORY)).toBe(
      LOYALTY_FEEDBACK_FLOW_CATEGORY,
    );
    expect(templateCategoryFor("SIGN_UP")).toBeUndefined();
    expect(templateCategoryFor(undefined)).toBeUndefined();
  });

  test("no purpose but loyalty feedback keys on a catalogue", () => {
    for (const purpose of FLOW_PURPOSES) {
      if (purpose.value === LOYALTY_FEEDBACK_FLOW_CATEGORY) continue;
      expect(templateCategoryFor(purpose.value)).toBeUndefined();
    }
  });
});

describe("narrowing helpers", () => {
  test("isFlowType accepts a category, rejects the retired identifiers", () => {
    expect(isFlowType("SIGN_UP")).toBe(true);
    expect(isFlowType(LOYALTY_FEEDBACK_FLOW_CATEGORY)).toBe(true);
    // The pre-grid wizard used these; a stale ?for= link must not resolve.
    expect(isFlowType("loyalty_feedback")).toBe(false);
    expect(isFlowType("other")).toBe(false);
    expect(isFlowType("survey")).toBe(false);
    expect(isFlowType(undefined)).toBe(false);
  });

  test("isWizardStep", () => {
    expect(isWizardStep("template")).toBe(true);
    expect(isWizardStep(undefined)).toBe(false);
  });
});

describe("stepsFor / nextStep / previousStep", () => {
  test("nothing chosen yet: only the purpose step", () => {
    expect(stepsFor(undefined)).toEqual(["type"]);
    expect(nextStep(undefined, "type")).toBeNull();
  });

  test("loyalty feedback walks type → template → details", () => {
    expect(stepsFor(LOYALTY_FEEDBACK_FLOW_CATEGORY)).toEqual(["type", "template", "details"]);
    expect(nextStep(LOYALTY_FEEDBACK_FLOW_CATEGORY, "type")).toBe("template");
    expect(nextStep(LOYALTY_FEEDBACK_FLOW_CATEGORY, "template")).toBe("details");
    expect(nextStep(LOYALTY_FEEDBACK_FLOW_CATEGORY, "details")).toBeNull();
    expect(previousStep(LOYALTY_FEEDBACK_FLOW_CATEGORY, "details")).toBe("template");
  });

  test("a purpose with no templates skips that step both ways", () => {
    expect(stepsFor("SIGN_UP")).toEqual(["type", "details"]);
    expect(nextStep("SIGN_UP", "type")).toBe("details");
    expect(previousStep("SIGN_UP", "details")).toBe("type");
    expect(previousStep("SIGN_UP", "type")).toBeNull();
  });

  test("every purpose ends at details", () => {
    for (const purpose of FLOW_PURPOSES) {
      const steps = stepsFor(purpose.value);
      expect(steps.at(-1)).toBe("details");
      expect(nextStep(purpose.value, "details")).toBeNull();
    }
  });
});
