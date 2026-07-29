import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    loyaltyProgram: { findUnique: vi.fn() },
    loyaltyEventTrigger: { findFirst: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));
vi.mock("../contact/contact.utils.js", () => ({ handleSendTemplate: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { getLoyaltyProgramByOrg } from "./program/program.service.js";
import { handleSendTemplate } from "../contact/contact.utils.js";
import { LoyaltyEventType } from "../../types/enums.js";
import { dispatchLoyaltyNotification } from "./loyaltyWaDispatcher.js";
import {
  isLReferralAction,
  isPurchaseAction,
  LoyaltyActionType,
  parsePhoneforWa,
  requireLoyaltyProgram,
} from "./util.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  loyaltyProgram: Record<string, Mock>;
  loyaltyEventTrigger: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function activeProgram(over: Record<string, unknown> = {}) {
  return {
    status: "active",
    whatsappNotifications: true,
    pointsActivityAlerts: true,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (getLoyaltyProgramByOrg as Mock).mockResolvedValue({ id: "prog-1" });
  db.loyaltyProgram.findUnique.mockResolvedValue(activeProgram());
  db.loyaltyEventTrigger.findFirst.mockResolvedValue(null);
});

// ===========================================================================
// util.ts
// ===========================================================================

describe("requireLoyaltyProgram", () => {
  test("attaches the org's program to the request and lets it through", async () => {
    const request: any = { user: { orgId: ORG } };
    const rep = reply();

    await requireLoyaltyProgram(request, rep);

    expect(getLoyaltyProgramByOrg).toHaveBeenCalledWith(ORG);
    expect(request.loyaltyProgram).toEqual({ id: "prog-1" });
    expect(rep.code).not.toHaveBeenCalled();
  });

  test("refuses a request with no org in the session", async () => {
    const rep = reply();

    await requireLoyaltyProgram({ user: {} } as any, rep);

    expect(rep.code).toHaveBeenCalledWith(400);
    expect(rep.send).toHaveBeenCalledWith({ error: "Missing orgId in user context" });
  });

  test("tolerates a request with no user at all", async () => {
    const rep = reply();

    await requireLoyaltyProgram({} as any, rep);

    expect(rep.code).toHaveBeenCalledWith(400);
  });

  test("answers 404 when the org has no program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await requireLoyaltyProgram({ user: { orgId: ORG } } as any, rep);

    expect(rep.code).toHaveBeenCalledWith(404);
    expect(rep.send).toHaveBeenCalledWith({ error: "Loyalty program not found" });
  });

  // NOTE: this preHandler is exported and documented but registered on no route
  // in the module — every controller resolves the program itself by calling
  // getLoyaltyProgramByOrg inline instead. See issues.txt 20.32.
  test("is a preHandler no route uses", async () => {
    // Recorded as a behavioural fact: it resolves and attaches, and nothing more.
    const request: any = { user: { orgId: ORG } };

    expect(await requireLoyaltyProgram(request, reply())).toBeUndefined();
  });
});

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

  // NOTE: only the FIRST plus is removed, and only when leading. A number typed
  // as "++91…" or "91+…" is passed through unchanged into a WhatsApp send.
  // See issues.txt 20.32.
  test("removes only one leading plus", () => {
    expect(parsePhoneforWa("++919000000001")).toBe("+919000000001");
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
    expect(isLReferralAction("Nonsense")).toBe(false);
    expect(isPurchaseAction("Nonsense")).toBe(false);
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

    expect(handleSendTemplate).not.toHaveBeenCalled();
  });

  test("says nothing while the program is inactive", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(activeProgram({ status: "draft" }));

    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, payload);

    expect(handleSendTemplate).not.toHaveBeenCalled();
  });

  test("says nothing when WhatsApp notifications are switched off", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(activeProgram({ whatsappNotifications: false }));

    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.REWARD_ISSUED, payload);

    expect(handleSendTemplate).not.toHaveBeenCalled();
  });

  test("the points-alert switch only gates the two point events", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(activeProgram({ pointsActivityAlerts: false }));

    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, payload);
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ADJUSTED, payload);
    expect(handleSendTemplate).not.toHaveBeenCalled();

    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.REWARD_ISSUED, {
      ...payload,
      rewardName: "Free coffee",
    });
    expect(handleSendTemplate).toHaveBeenCalledTimes(1);
  });

  test("says nothing when the payload has no phone number", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: "",
    } as any);

    expect(handleSendTemplate).not.toHaveBeenCalled();
  });

  // NOTE: the whole body is wrapped in try/catch and the catch only logs, so a
  // failed notification never reaches the caller. That is deliberate — the
  // comment says "silence error to avoid blocking transaction" — but it also
  // means a template that is wrong for every customer fails silently forever.
  // See issues.txt 20.32.
  test("swallows every failure rather than surfacing it", async () => {
    (handleSendTemplate as Mock).mockRejectedValue(new Error("meta rejected the template"));

    await expect(
      dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, payload),
    ).resolves.toBeUndefined();
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
    expect((handleSendTemplate as Mock).mock.calls[0][0]).toBe("tmpl-trigger");
  });

  test("falls back to the reward's own template when no trigger is configured", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.REWARD_ISSUED, {
      customerPhone: "919000000001",
      rewardWaTemplateId: "tmpl-reward",
    });

    expect((handleSendTemplate as Mock).mock.calls[0][0]).toBe("tmpl-reward");
  });

  // handleSendTemplate returns early on a null id, so this is a silent no-send.
  test("sends a null template id when neither is configured", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.REWARD_ISSUED, {
      customerPhone: "919000000001",
    });

    expect((handleSendTemplate as Mock).mock.calls[0][0]).toBeNull();
  });
});

describe("dispatchLoyaltyNotification — the template parameters", () => {
  function params() {
    return (handleSendTemplate as Mock).mock.calls[0][3];
  }

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

  // NOTE: pins current behaviour. Every parameter is appended only when its value
  // is present, so a customer with no stored name shifts every later placeholder
  // up by one — {{1}} becomes the points instead of the name. The template has
  // no way to detect it. See issues.txt 20.32.
  test("a missing name shifts every later placeholder up by one", async () => {
    await dispatchLoyaltyNotification(ORG, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: "919000000001",
      points: 100,
      balanceAfter: 600,
    });

    expect(params()).toEqual(["100", "600"]);
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
