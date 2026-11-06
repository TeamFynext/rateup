import { describe, expect, test } from "vitest";

import { LoyaltyEventType } from "../../../types/enums.js";
import { LOYALTY_EVENT_TEMPLATE_NAMES } from "../loyaltyEventTemplates.js";
import { eventVars, LOYALTY_EVENT_CATALOG } from "./catalog.js";

const events = Object.values(LoyaltyEventType);

describe("LOYALTY_EVENT_CATALOG", () => {
  test("covers every event, under the template name the wizard submits", () => {
    for (const event of events) {
      expect(LOYALTY_EVENT_CATALOG[event]?.templateName, event).toBe(
        LOYALTY_EVENT_TEMPLATE_NAMES[event],
      );
    }
  });

  // A default body may be submitted to Meta as it stands, so it has to pass Meta's rules:
  // variables numbered in order of appearance, none at the very start or end.
  test.each(events)("%s: its default body is a submittable template", (event) => {
    const { defaultBody, params } = LOYALTY_EVENT_CATALOG[event];
    const numbers = [...defaultBody.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));

    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
    expect(numbers.length).toBeLessThanOrEqual(params.length);
    expect(defaultBody.trim().startsWith("{{")).toBe(false);
    expect(defaultBody.trim().endsWith("}}")).toBe(false);
  });
});

describe("eventVars", () => {
  test("puts each value in its catalog slot", () => {
    expect(
      eventVars(LoyaltyEventType.REWARD_REDEEMED, {
        cost: 500,
        name: "Ann",
        code: "RU-1",
        rewardName: "Coffee",
      }),
    ).toEqual(["Ann", "Coffee", "RU-1", "500"]);
  });

  test("a missing value is an empty slot, not a shifted one", () => {
    expect(eventVars(LoyaltyEventType.REWARD_ISSUED, { name: "Ann", code: "RU-1" })).toEqual([
      "Ann",
      "",
      "RU-1",
      "",
    ]);
  });
});
