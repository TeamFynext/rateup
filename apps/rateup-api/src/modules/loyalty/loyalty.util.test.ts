import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    loyaltyProgram: { findUnique: vi.fn() },
    loyaltyEventTrigger: { findFirst: vi.fn() },
    waTemplate: { findUnique: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));
// Fully replaced, not spread over the original: loading the real module drags in the
// WhatsApp send stack, which imports the dispatcher back before this mock is in place.
// The renderer is small enough to restate; loyaltyMessaging.test.ts covers the real one.
vi.mock("./loyaltyMessaging.js", () => ({
  sendLoyaltyMessage: vi.fn(),
  renderTemplateBody: (components: unknown, params: string[]) => {
    if (!Array.isArray(components)) return null;
    const body = components.find(
      (c: { type?: string }) => String(c?.type ?? "").toUpperCase() === "BODY",
    ) as { text?: string } | undefined;
    if (!body?.text) return null;
    return body.text.replace(
      /\{\{(\d+)\}\}/g,
      (_m: string, i: string) => params[Number(i) - 1] ?? "",
    );
  },
}));

import prisma from "../../utils/prisma.js";
import { getLoyaltyProgramByOrg } from "./program/program.service.js";
import { sendLoyaltyMessage } from "./loyaltyMessaging.js";
import { LoyaltyEventType } from "../../types/enums.js";
import { dispatchLoyaltyNotification } from "./loyaltyWaDispatcher.js";
import { isLReferralAction, isPurchaseAction, LoyaltyActionType, parsePhoneforWa } from "./util.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  loyaltyProgram: Record<string, Mock>;
  loyaltyEventTrigger: Record<string, Mock>;
  waTemplate: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";

function activeProgram(over: Record<string, unknown> = {}) {
  return {
    status: "active",
    whatsappNotifications: true,
    pointsActivityAlerts: true,
    sendTextInSession: true,
    ...over,
  };
}

/** What sendLoyaltyMessage was asked to send, for the first call. */
function sendInput() {
  return (sendLoyaltyMessage as Mock).mock.calls[0][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  (sendLoyaltyMessage as Mock).mockImplementation(
    async (input: { waTemplateId: string | null }) => ({
      sent: true,
      mode: "template",
      templateId: input.waTemplateId,
      text: null,
      skippedReason: null,
    }),
  );
  (getLoyaltyProgramByOrg as Mock).mockResolvedValue({ id: "prog-1" });
  db.loyaltyProgram.findUnique.mockResolvedValue(activeProgram());
  db.loyaltyEventTrigger.findFirst.mockResolvedValue(null);
  db.waTemplate.findUnique.mockResolvedValue(null);
});

// ===========================================================================
// util.ts
// ===========================================================================

describe("parsePhoneforWa", () => {
  test("strips a single leading plus", () => {
    expect(parsePhoneforWa("+919000000001")).toBe("919000000001");
  });

  test("leaves a bare number alone", () => {
    expect(parsePhoneforWa("919000000001")).toBe("919000000001");
  });

  test("tolerates an empty or missing value", () => {
    expect(parsePhoneforWa("")).toBe("");
    expect(parsePhoneforWa(undefined as any)).toBeUndefined();
  });

  test("removes every leading plus", () => {
    expect(parsePhoneforWa("++919000000001")).toBe("919000000001");
  });

  // Still only LEADING ones: a plus in the middle is not a formatting artefact and
  // stripping it would silently change the number.
  test("leaves a plus that is not at the front alone", () => {
    expect(parsePhoneforWa("91+9000000001")).toBe("91+9000000001");
  });
});

describe("the action-type predicates", () => {
  test("only a referral purchase is a referral action", () => {
    expect(isLReferralAction(LoyaltyActionType.ReferralPurchase)).toBe(true);
    expect(isLReferralAction(LoyaltyActionType.DirectPurchase)).toBe(false);
  });

  test("both purchase kinds are purchase actions", () => {
    expect(isPurchaseAction(LoyaltyActionType.ReferralPurchase)).toBe(true);
    expect(isPurchaseAction(LoyaltyActionType.DirectPurchase)).toBe(true);
    expect(isPurchaseAction(LoyaltyActionType.FeedBack)).toBe(false);
  });

  test("an unknown action is neither", () => {
    expect(isLReferralAction("Nonsense" as unknown as LoyaltyActionType)).toBe(false);
    expect(isPurchaseAction("Nonsense" as unknown as LoyaltyActionType)).toBe(false);
  });
});

// ===========================================================================
// loyaltyWaDispatcher.ts
// ===========================================================================

describe("dispatchLoyaltyNotification — the gates", () => {
  const payload = { customerPhone: "919000000001", customerName: "Ann", points: 100 };

  test("says nothing when the org has no loyalty program", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(null);

    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, payload);

    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
  });

  test("says nothing while the program is inactive", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(activeProgram({ status: "draft" }));

    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, payload);

    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
  });

  test("says nothing when WhatsApp notifications are switched off", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(activeProgram({ whatsappNotifications: false }));

    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.REWARD_ISSUED, payload);

    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
  });

  test("the points-alert switch only gates the two point events", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(activeProgram({ pointsActivityAlerts: false }));

    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, payload);
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ADJUSTED, payload);
    expect(sendLoyaltyMessage).not.toHaveBeenCalled();

    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplateId: "tmpl-trigger" });
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.REWARD_ISSUED, {
      ...payload,
      rewardName: "Free coffee",
    });
    expect(sendLoyaltyMessage).toHaveBeenCalledTimes(1);
  });

  test("says nothing when the payload has no phone number", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: "",
    } as any);

    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
  });

  test("swallows the failure rather than blocking the caller, and says so", async () => {
    // clearAllMocks keeps implementations, so a sticky rejection would leak into later tests.
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplateId: "tmpl-trigger" });
    (sendLoyaltyMessage as Mock).mockRejectedValueOnce(new Error("meta rejected the template"));

    await expect(
      dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, payload),
    ).resolves.toMatchObject({ sent: false, skippedReason: "send_failed" });
  });

  test("names the gate that stopped it", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(activeProgram({ status: "draft" }));

    expect(await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, payload)).toEqual(
      {
        sent: false,
        channel: null,
        mode: null,
        templateId: null,
        text: null,
        skippedReason: "program_inactive",
      },
    );
  });
});

describe("dispatchLoyaltyNotification — resolving the template", () => {
  test("prefers an enabled event trigger for that event type", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplateId: "tmpl-trigger" });

    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: "919000000001",
      rewardWaTemplateId: "tmpl-reward",
    });

    expect(db.loyaltyEventTrigger.findFirst.mock.calls[0][0].where).toEqual({
      program: { orgId: ORG },
      eventType: LoyaltyEventType.POINTS_ISSUED,
      enabled: true,
    });
    expect(sendInput().waTemplateId).toBe("tmpl-trigger");
  });

  test("falls back to the reward's own template when no trigger is configured", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.REWARD_ISSUED, {
      customerPhone: "919000000001",
      rewardWaTemplateId: "tmpl-reward",
    });

    expect(sendInput().waTemplateId).toBe("tmpl-reward");
  });

  test("sends nothing when neither is configured, and reports no template", async () => {
    const outcome = await dispatchLoyaltyNotification(ORG, LoyaltyEventType.REWARD_ISSUED, {
      customerPhone: "919000000001",
    });

    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ sent: false, skippedReason: "no_template" });
  });

  test("hands the program's text-in-window switch to the sender", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(activeProgram({ sendTextInSession: false }));
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplateId: "tmpl-trigger" });

    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: "919000000001",
    });

    expect(sendInput()).toMatchObject({
      orgId: ORG,
      phone: "919000000001",
      waTemplateId: "tmpl-trigger",
      preferTextInSession: false,
    });
  });

  test("reports how the message went out — text inside an open window", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplateId: "tmpl-trigger" });
    (sendLoyaltyMessage as Mock).mockResolvedValueOnce({
      sent: true,
      mode: "text",
      templateId: "tmpl-trigger",
      text: "Hi Ann",
      skippedReason: null,
    });

    const outcome = await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: "919000000001",
      customerName: "Ann",
    });

    expect(outcome).toMatchObject({ sent: true, mode: "text", text: "Hi Ann" });
  });

  test("passes on a template that Meta has not approved yet", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplateId: "tmpl-trigger" });
    (sendLoyaltyMessage as Mock).mockResolvedValueOnce({
      sent: false,
      mode: null,
      templateId: "tmpl-trigger",
      text: null,
      skippedReason: "template_not_approved",
    });

    const outcome = await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: "919000000001",
    });

    expect(outcome).toMatchObject({ sent: false, skippedReason: "template_not_approved" });
  });

  test("reports an accepted send with the words the customer received", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({
      waTemplateId: "tmpl-trigger",
      waTemplate: {
        data: {
          components: [
            { type: "HEADER", text: "Kettle & Co" },
            { type: "BODY", text: "Hi {{1}}, you earned {{2}} Beans. Balance {{3}}." },
          ],
        },
      },
    });

    const outcome = await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: "919000000001",
      customerName: "Ann",
      points: 43,
      balanceAfter: 1283,
    });

    expect(outcome).toEqual({
      sent: true,
      channel: "whatsapp",
      mode: "template",
      templateId: "tmpl-trigger",
      text: "Hi Ann, you earned 43 Beans. Balance 1283.",
      skippedReason: null,
    });
  });

  test("a refused send is reported, text and all", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplateId: "tmpl-trigger" });
    (sendLoyaltyMessage as Mock).mockResolvedValueOnce({
      sent: false,
      mode: "template",
      templateId: "tmpl-trigger",
      text: null,
      skippedReason: "send_failed",
    });

    const outcome = await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: "919000000001",
      customerName: "Ann",
      points: 43,
      balanceAfter: 1283,
    });

    expect(outcome).toMatchObject({
      sent: false,
      templateId: "tmpl-trigger",
      skippedReason: "send_failed",
    });
  });

  test("looks the reward's own template up to render its text", async () => {
    db.waTemplate.findUnique.mockResolvedValue({
      data: { components: [{ type: "BODY", text: "{{1}}, show code {{3}} for your {{2}}." }] },
    });

    const outcome = await dispatchLoyaltyNotification(ORG, LoyaltyEventType.REWARD_ISSUED, {
      customerPhone: "919000000001",
      customerName: "Ann",
      rewardName: "Free coffee",
      redemptionCode: "KC-4471",
      rewardWaTemplateId: "tmpl-reward",
    });

    expect(outcome.text).toBe("Ann, show code KC-4471 for your Free coffee.");
  });
});

describe("dispatchLoyaltyNotification — the template parameters", () => {
  function params() {
    return sendInput().params;
  }

  beforeEach(() => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplateId: "tmpl-trigger" });
  });

  test("a points event carries the name, the points and the new balance", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: "919000000001",
      customerName: "Ann",
      points: 100,
      balanceAfter: 600,
    });

    expect(params()).toEqual(["Ann", "100", "600"]);
  });

  test("a reward event carries the name, the reward, the code and the cost", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.REWARD_REDEEMED, {
      customerPhone: "919000000001",
      customerName: "Ann",
      rewardName: "Free coffee",
      redemptionCode: "RU-ABC123",
      points: -100,
    });

    expect(params()).toEqual(["Ann", "Free coffee", "RU-ABC123", "100"]);
  });

  test("a tier event carries the name and the new tier", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.TIER_UPGRADED, {
      customerPhone: "919000000001",
      customerName: "Ann",
      newTier: "Gold",
      oldTier: "Silver",
    });

    expect(params()).toEqual(["Ann", "Gold"]);
  });

  test("a missing name leaves its slot empty rather than shifting the rest", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: "919000000001",
      points: 100,
      balanceAfter: 600,
    });

    expect(params()).toEqual(["", "100", "600"]);
  });

  test("a missing reward name does not promote the code into its place", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.REWARD_ISSUED, {
      customerPhone: "919000000001",
      customerName: "Ann",
      redemptionCode: "SHORT123",
    });

    expect(params()).toEqual(["Ann", "", "SHORT123", ""]);
  });

  test("a zero balance is still sent, unlike a missing one", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: "919000000001",
      customerName: "Ann",
      points: 0,
      balanceAfter: 0,
    });

    expect(params()).toEqual(["Ann", "0", "0"]);
  });

  test("the old tier is never sent, only the new one", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.TIER_UPGRADED, {
      customerPhone: "919000000001",
      customerName: "Ann",
      newTier: "Gold",
      oldTier: "Silver",
    });

    expect(params()).not.toContain("Silver");
  });
});
