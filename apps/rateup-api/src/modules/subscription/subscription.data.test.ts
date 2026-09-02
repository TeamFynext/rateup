import { describe, expect, test } from "vitest";

import {
  FreePlanSubscriptionFeatures,
  getEnterpriseSubscriptionFeatures,
  getFreeSubscriptionFeatures,
  isUnlimitedAllowance,
  getMaxSubscriptionFeatures,
  getPlusSubscriptionFeatures,
  getProSubscriptionFeatures,
  UNLIMITED_COUNT,
} from "./subscription.data.js";

describe("getFreeSubscriptionFeatures", () => {
  const free = getFreeSubscriptionFeatures() as any;

  test("caps WhatsApp at 100 metered conversations and keeps the channel active", () => {
    expect(free.whatsapp.active).toBe(true);
    expect(free.whatsapp.conversation.active).toBe(true);
    expect(free.whatsapp.conversation.count.max).toBe(100);
  });

  test("caps web surveys at 2 forms / 50 monthly responses", () => {
    expect(free.webSurvey.active).toBe(true);
    expect(free.webSurvey.count.max).toBe(2);
    expect(free.webSurvey.count.monthlyResponseLimit).toBe(100);
  });

  test("allows a single team + team member", () => {
    expect(free.team.count.max).toBe(1);
    expect(free.team.teamMember.count.max).toBe(1);
  });

  test("no longer carries the retired menu or ticket features", () => {
    expect("menu" in free).toBe(false);
    expect("ticket" in free).toBe(false);
  });

  test("keeps the Meta Business Agent switched off (it is a Pro-and-above feature)", () => {
    expect(free.ai.active).toBe(false);
  });

  test("no longer carries the retired reputation management feature", () => {
    expect("reputationManagement" in free).toBe(false);
  });

  test("closes the Starter-and-above capability gates while keeping the inbox open", () => {
    // whatsapp.active stays true — Free gets the full WhatsApp/IG/Messenger inbox.
    // The capability gates are what tier Free down.
    expect(free.whatsapp.active).toBe(true);
    expect(free.whatsapp.campaign?.active).toBe(false);
    expect(free.whatsapp.loyalty?.active).toBe(false);
    expect(free.whatsapp.referrals?.active).toBe(false);
    expect(free.whatsapp.catalog?.active).toBe(false);
  });

  test("merges overrides over the defaults", () => {
    const overridden = getFreeSubscriptionFeatures({
      team: { count: { max: 5 }, teamMember: { count: { max: 5 }, active: true }, active: true },
    }) as any;
    expect(overridden.team.count.max).toBe(5);
    // untouched defaults survive
    expect(overridden.whatsapp.conversation.count.max).toBe(100);
  });

  test("FreePlanSubscriptionFeatures is the memoised default", () => {
    expect(FreePlanSubscriptionFeatures).toEqual(getFreeSubscriptionFeatures());
  });
});

describe("paid tier presets", () => {
  const plus = getPlusSubscriptionFeatures();
  const pro = getProSubscriptionFeatures();
  const max = getMaxSubscriptionFeatures();
  const enterprise = getEnterpriseSubscriptionFeatures();

  test("conversations and form submissions carry the same number on every tier", () => {
    // The catalog sells them as one figure ("5,000 conversations / 5,000 form
    // submissions"), so a tier whose two halves drift apart is advertising something it
    // does not enforce.
    for (const tier of [getFreeSubscriptionFeatures(), plus, pro, max, enterprise]) {
      expect(tier.whatsapp.conversation.count.max).toBe(tier.webSurvey.count.monthlyResponseLimit);
    }
  });

  test("Plus, Pro and Max carry the published limits", () => {
    expect(plus.team.count.max).toBe(2);
    expect(plus.team.teamMember.count.max).toBe(10);
    expect(plus.whatsapp.conversation.count.max).toBe(5_000);
    expect(plus.webSurvey.count.monthlyResponseLimit).toBe(5_000);

    expect(pro.team.count.max).toBe(5);
    expect(pro.team.teamMember.count.max).toBe(30);
    expect(pro.whatsapp.conversation.count.max).toBe(20_000);
    expect(pro.webSurvey.count.monthlyResponseLimit).toBe(20_000);

    expect(max.team.count.max).toBe(10);
    expect(max.team.teamMember.count.max).toBe(100);
    expect(max.whatsapp.conversation.count.max).toBe(50_000);
    expect(max.webSurvey.count.monthlyResponseLimit).toBe(50_000);
  });

  test("paid tiers stay below the unlimited sentinel", () => {
    // The trap this guards. `isUnlimitedAllowance` decides whether an allowance is
    // metered at all — the send gate, the limit email and the dashboard banner all read
    // it. A priced tier whose limit reaches UNLIMITED_COUNT would silently stop being
    // enforced: no refused sends, no warnings, nothing failing to say so. If you are
    // here because you raised a tier's limit, raise UNLIMITED_COUNT further above it
    // rather than lowering this expectation.
    for (const [label, tier] of [
      ["Free", getFreeSubscriptionFeatures()],
      ["Plus", plus],
      ["Pro", pro],
      ["Max", max],
    ] as const) {
      const counts = [
        tier.whatsapp.conversation.count.max,
        tier.webSurvey.count.monthlyResponseLimit,
        tier.team.count.max,
        tier.team.teamMember.count.max,
      ];
      for (const count of counts) {
        expect(isUnlimitedAllowance(count), `${label} must remain metered`).toBe(false);
      }
    }
  });

  test("Enterprise is the only tier that reads as uncapped", () => {
    expect(isUnlimitedAllowance(enterprise.whatsapp.conversation.count.max)).toBe(true);
    expect(isUnlimitedAllowance(max.whatsapp.conversation.count.max)).toBe(false);
  });

  test("the ladder never steps backwards", () => {
    // The middle rung only works as an upsell if every count moves the same direction.
    const rungs = [plus, pro, max, enterprise];
    for (let i = 1; i < rungs.length; i++) {
      expect(rungs[i].whatsapp.conversation.count.max).toBeGreaterThan(
        rungs[i - 1].whatsapp.conversation.count.max,
      );
      expect(rungs[i].team.count.max).toBeGreaterThan(rungs[i - 1].team.count.max);
      expect(rungs[i].team.teamMember.count.max).toBeGreaterThan(
        rungs[i - 1].team.teamMember.count.max,
      );
    }
  });

  test("campaigns, loyalty, referrals and catalog open from Plus", () => {
    for (const tier of [plus, pro, max, enterprise]) {
      expect(tier.whatsapp.campaign?.active).toBe(true);
      expect(tier.whatsapp.loyalty?.active).toBe(true);
      expect(tier.whatsapp.referrals?.active).toBe(true);
      expect(tier.whatsapp.catalog?.active).toBe(true);
    }
  });

  test("the Meta Business Agent is Max and above only", () => {
    expect(getFreeSubscriptionFeatures().ai.active).toBe(false);
    expect(plus.ai.active).toBe(false);
    expect(pro.ai.active).toBe(false);
    expect(max.ai.active).toBe(true);
    expect(enterprise.ai.active).toBe(true);
  });

  test("every tier keeps the inbox — whatsapp.active is never the tier lever", () => {
    for (const tier of [getFreeSubscriptionFeatures(), plus, pro, max, enterprise]) {
      expect(tier.whatsapp.active).toBe(true);
    }
  });

  test("Enterprise is effectively unlimited on every count", () => {
    expect(enterprise.team.count.max).toBe(UNLIMITED_COUNT);
    expect(enterprise.team.teamMember.count.max).toBe(UNLIMITED_COUNT);
    expect(enterprise.whatsapp.conversation.count.max).toBe(UNLIMITED_COUNT);
    expect(enterprise.webSurvey.count.monthlyResponseLimit).toBe(UNLIMITED_COUNT);
  });
});
