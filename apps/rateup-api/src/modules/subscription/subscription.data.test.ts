import { describe, expect, test } from "vitest";

import { FreePlanSubscriptionFeatures, getFreeSubscriptionFeatures } from "./subscription.data.js";

describe("getFreeSubscriptionFeatures", () => {
  const free = getFreeSubscriptionFeatures() as any;

  test("caps WhatsApp at 500 conversations and keeps the channel active", () => {
    expect(free.whatsapp.active).toBe(true);
    expect(free.whatsapp.conversation.active).toBe(true);
    expect(free.whatsapp.conversation.count.max).toBe(500);
  });

  test("caps web surveys at 2 forms / 50 monthly responses", () => {
    expect(free.webSurvey.active).toBe(true);
    expect(free.webSurvey.count.max).toBe(2);
    expect(free.webSurvey.count.monthlyResponseLimit).toBe(50);
  });

  test("allows a single team + team member", () => {
    expect(free.team.count.max).toBe(1);
    expect(free.team.teamMember.count.max).toBe(1);
  });

  test("no longer carries the retired menu or ticket features", () => {
    expect("menu" in free).toBe(false);
    expect("ticket" in free).toBe(false);
  });

  test("keeps AI and reputation management switched off", () => {
    expect(free.ai.active).toBe(false);
    expect(free.reputationManagement.active).toBe(false);
  });

  test("merges overrides over the defaults", () => {
    const overridden = getFreeSubscriptionFeatures({
      team: { count: { max: 5 }, teamMember: { count: { max: 5 }, active: true }, active: true },
    }) as any;
    expect(overridden.team.count.max).toBe(5);
    // untouched defaults survive
    expect(overridden.whatsapp.conversation.count.max).toBe(500);
  });

  test("FreePlanSubscriptionFeatures is the memoised default", () => {
    expect(FreePlanSubscriptionFeatures).toEqual(getFreeSubscriptionFeatures());
  });
});
