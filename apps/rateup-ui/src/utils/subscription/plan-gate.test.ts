import { describe, expect, test } from "vitest";

import { SubscriptionFeaturePathName } from "@/types/enums.ts";
import { getAccessDenialReason, isPlanDenial } from "@/utils/apiError.ts";
import { isPlanGateOpen } from "@/utils/subscription/subscription.ts";

const sub = (features: unknown) => ({ features }) as { features?: SubscriptionFeatures };

describe("isPlanGateOpen", () => {
  test("an explicit false is closed — this is how Free is written", () => {
    const free = sub({
      whatsapp: { active: true, campaign: { active: false } },
    });
    expect(isPlanGateOpen(free, SubscriptionFeaturePathName.WhatsappCampaign)).toBe(false);
    // The inbox stays open on Free; only the tier gates close.
    expect(isPlanGateOpen(free, SubscriptionFeaturePathName.Whatsapp)).toBe(true);
  });

  test("an explicit true is open", () => {
    const plus = sub({
      whatsapp: { active: true, campaign: { active: true } },
    });
    expect(isPlanGateOpen(plus, SubscriptionFeaturePathName.WhatsappCampaign)).toBe(true);
  });

  test("an ABSENT sub-gate inherits its parent, so pre-split records keep working", () => {
    // Written before whatsapp.campaign was split out of whatsapp.active. Reading this
    // as false would tell a paying customer that campaigns are not on their plan.
    const legacy = sub({ whatsapp: { active: true } });
    expect(isPlanGateOpen(legacy, SubscriptionFeaturePathName.WhatsappCampaign)).toBe(true);
    expect(isPlanGateOpen(legacy, SubscriptionFeaturePathName.WhatsappLoyalty)).toBe(true);
  });

  test("an absent sub-gate under an inactive parent stays closed", () => {
    const off = sub({ whatsapp: { active: false } });
    expect(isPlanGateOpen(off, SubscriptionFeaturePathName.WhatsappCampaign)).toBe(false);
  });

  test("no subscription and no features are closed, not open", () => {
    expect(isPlanGateOpen(null, SubscriptionFeaturePathName.WhatsappCampaign)).toBe(false);
    expect(isPlanGateOpen(undefined, SubscriptionFeaturePathName.WhatsappCampaign)).toBe(false);
    expect(isPlanGateOpen(sub(undefined), SubscriptionFeaturePathName.WhatsappCampaign)).toBe(
      false,
    );
  });

  test("a top-level gate has no parent to inherit from", () => {
    expect(isPlanGateOpen(sub({}), SubscriptionFeaturePathName.WebSurvey)).toBe(false);
    expect(
      isPlanGateOpen(sub({ webSurvey: { active: true } }), SubscriptionFeaturePathName.WebSurvey),
    ).toBe(true);
  });
});

describe("getAccessDenialReason", () => {
  const denial = (status: number, data: unknown) => ({
    response: { status, data },
  });

  test("reads the API's own reason", () => {
    expect(getAccessDenialReason(denial(403, { reason: "subscription", message: "nope" }))).toBe(
      "subscription",
    );
    expect(getAccessDenialReason(denial(403, { reason: "team", message: "nope" }))).toBe("team");
  });

  test("falls back to the message for API builds that predate `reason`", () => {
    expect(
      getAccessDenialReason(
        denial(403, {
          message: "This feature is not included in your subscription",
        }),
      ),
    ).toBe("subscription");
    expect(
      getAccessDenialReason(
        denial(403, {
          message: "Access to 'campaigns' is not enabled for your team",
        }),
      ),
    ).toBe("team");
    expect(getAccessDenialReason(denial(403, { message: "Subscription expired" }))).toBe(
      "subscription_expired",
    );
  });

  test("an unrecognised 403 is a denial, but of unknown kind", () => {
    expect(getAccessDenialReason(denial(403, { message: "Nope" }))).toBe("unknown");
    // An unknown denial must not be treated as a billing problem — it falls through to
    // the permission screen, which is the safer of the two wrong answers.
    expect(isPlanDenial(denial(403, { message: "Nope" }))).toBe(false);
  });

  test("is null for anything that is not a 403", () => {
    expect(getAccessDenialReason(denial(500, { message: "boom" }))).toBeNull();
    expect(getAccessDenialReason(denial(401, {}))).toBeNull();
    expect(getAccessDenialReason(new Error("network"))).toBeNull();
  });
});
