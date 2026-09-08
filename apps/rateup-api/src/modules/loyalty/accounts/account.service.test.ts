import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    contact: { findFirst: vi.fn(), create: vi.fn() },
    customerLoyaltyAccount: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customerReward: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    loyaltyProgram: { findUnique: vi.fn() },
    loyaltyWaCommand: { findFirst: vi.fn() },
    loyaltyTier: { findFirst: vi.fn() },
    loyaltyReward: { findUnique: vi.fn(), findFirst: vi.fn() },
    loyaltyTransaction: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../earningRulesEngine.js", () => ({
  calculatePointsForPurchase: vi.fn(),
  checkAndUpgradeTier: vi.fn(),
  generateReferralCode: vi.fn(() => "ANN-AB12"),
}));

vi.mock("../../../utils/misc/random.utils.js", () => ({
  generateRewardShortCode: vi.fn(() => "SHORT1"),
}));

vi.mock("../../whatsapp/whatsappSurvey/wasurvey.service.js", () => ({ sendTextMessage: vi.fn() }));
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.utils.js", () => ({
  generateWhatsAppJoinLink: vi.fn(() => "https://wa.me/join"),
}));
vi.mock("../loyaltyWaDispatcher.js", () => ({
  dispatchLoyaltyNotification: vi.fn(),
  NOTIFICATION_NOT_SENT: {
    sent: false,
    channel: null,
    mode: null,
    templateId: null,
    text: null,
    skippedReason: null,
  },
}));

import prisma from "../../../utils/prisma.js";
import { calculatePointsForPurchase, checkAndUpgradeTier } from "../earningRulesEngine.js";
import { sendTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import { dispatchLoyaltyNotification } from "../loyaltyWaDispatcher.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import {
  assignRewardToCustomer,
  awardPoints,
  createCustomerAccount,
  getCustomerAccountByPhone,
  getCustomerAccounts,
  getLCustomerByPhone,
  lookupContactByPhone,
  getRewardByShortCode,
  markRewardAsRedeemed,
  updateCustomerAccount,
} from "./account.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  contact: Record<string, Mock>;
  customerLoyaltyAccount: Record<string, Mock>;
  customerReward: Record<string, Mock>;
  loyaltyProgram: Record<string, Mock>;
  loyaltyTier: Record<string, Mock>;
  loyaltyReward: Record<string, Mock>;
  loyaltyTransaction: Record<string, Mock>;
  $transaction: Mock;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const PROGRAM = "prog-1";

const signupInput = { name: "Ann", phone: "+919000000001", orgId: ORG } as any;

interface ProgramFixture {
  id: string;
  signupBonus: number;
  referralBonus: number;
  referralBonusType: string;
  referralRewardId: string | null;
  refereeBonus: number;
  refereeBonusType: string;
  refereeRewardId: string | null;
}

function program(over: Record<string, unknown> = {}) {
  const base: ProgramFixture = {
    id: PROGRAM,
    signupBonus: 0,
    referralBonus: 0,
    referralBonusType: "points",
    referralRewardId: null,
    refereeBonus: 0,
    refereeBonusType: "points",
    refereeRewardId: null,
  };
  return { ...base, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.contact.findFirst.mockResolvedValue(null);
  db.contact.create.mockResolvedValue({
    id: "contact-1",
    orgId: ORG,
    phone: "919000000001",
    name: "Ann",
  });
  db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);
  db.customerLoyaltyAccount.findFirst.mockResolvedValue(null);
  db.customerLoyaltyAccount.findMany.mockResolvedValue([]);
  db.customerLoyaltyAccount.create.mockResolvedValue({
    id: "acct-1",
    programId: PROGRAM,
    contactId: "contact-1",
    currentPoints: 0,
    lifetimePoints: 0,
    referralCode: "ANN-AB12",
    contact: { id: "contact-1", name: "Ann", phone: "919000000001", orgId: ORG },
  });
  db.customerLoyaltyAccount.update.mockResolvedValue({ id: "acct-1", currentPoints: 0 });
  db.customerReward.findUnique.mockResolvedValue(null);
  db.customerReward.create.mockResolvedValue({ id: "cr-1", shortCode: "SHORT1" });
  db.loyaltyProgram.findUnique.mockResolvedValue(program());
  db.loyaltyTier.findFirst.mockResolvedValue(null);
  db.loyaltyReward.findUnique.mockResolvedValue({ id: "rwd-1", name: "Free coffee" });
  db.loyaltyReward.findFirst.mockResolvedValue({ id: "rwd-1", name: "Free coffee" });
  db.loyaltyTransaction.create.mockResolvedValue({ id: "txn-1" });
  db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
  (calculatePointsForPurchase as Mock).mockResolvedValue({ points: 100, rule: { id: "rule-1" } });
  (checkAndUpgradeTier as Mock).mockResolvedValue({ upgraded: false });
});

// ===========================================================================
// createCustomerAccount — the contact
// ===========================================================================

describe("createCustomerAccount — the contact behind the account", () => {
  test("strips every plus out of the phone before matching", async () => {
    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(db.contact.findFirst.mock.calls[0][0].where).toEqual({
      phone: "919000000001",
      orgId: ORG,
    });
  });

  test("reuses an existing contact in the org", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "contact-existing", orgId: ORG });

    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(db.contact.create).not.toHaveBeenCalled();
    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data.contactId).toBe(
      "contact-existing",
    );
  });

  test("creates a loyalty-sourced contact when the phone is new", async () => {
    await createCustomerAccount({ ...signupInput, email: "a@b.c" }, PROGRAM, ORG);

    expect(db.contact.create.mock.calls[0][0].data).toMatchObject({
      orgId: ORG,
      phone: "919000000001",
      name: "Ann",
      email: "a@b.c",
      source: "loyalty_program",
      dob: null,
    });
  });

  test("parses a supplied date of birth", async () => {
    await createCustomerAccount({ ...signupInput, dob: "1990-05-05T00:00:00.000Z" }, PROGRAM, ORG);

    expect(db.contact.create.mock.calls[0][0].data.dob).toEqual(
      new Date("1990-05-05T00:00:00.000Z"),
    );
  });
});

describe("createCustomerAccount — an account that already exists", () => {
  test("refuses to enrol an active account twice", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ id: "acct-1", status: "active" });

    await expect(createCustomerAccount(signupInput, PROGRAM, ORG)).rejects.toThrow(
      "Customer account already exists",
    );
  });

  test("reactivates an inactive account instead of creating another", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ id: "acct-1", status: "inactive" });
    db.customerLoyaltyAccount.update.mockResolvedValue({
      id: "acct-1",
      contact: { name: "Ann" },
    });

    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0]).toMatchObject({
      where: { id: "acct-1" },
      data: { status: "active" },
    });
    expect(db.customerLoyaltyAccount.create).not.toHaveBeenCalled();
  });

  test("welcomes a reactivated customer only when a sending number was supplied", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ id: "acct-1", status: "inactive" });
    db.customerLoyaltyAccount.update.mockResolvedValue({ id: "acct-1", contact: { name: "Ann" } });

    await createCustomerAccount(signupInput, PROGRAM, ORG);
    expect(sendTextMessage).not.toHaveBeenCalled();

    await createCustomerAccount(signupInput, PROGRAM, ORG, "919999999999");
    expect(sendTextMessage).toHaveBeenCalledWith(
      { phone: "919000000001", orgId: ORG },
      null,
      "🎉 Welcome back Ann!",
    );
  });
});

// ===========================================================================
// createCustomerAccount — bonuses
// ===========================================================================

describe("createCustomerAccount — the signup bonus", () => {
  test("credits the signup bonus into the opening balance", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ signupBonus: 500 }));

    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data).toMatchObject({
      currentPoints: 500,
      lifetimePoints: 500,
    });
    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      source: "signup_bonus",
      points: 500,
      balanceAfter: 500,
    });
    // Credited in the create, so nothing needs to follow it up.
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("writes no signup ledger row when the program offers no bonus", async () => {
    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  test("announces the signup bonus to the customer", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ signupBonus: 500 }));

    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(dispatchLoyaltyNotification).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.POINTS_ISSUED,
      expect.objectContaining({ points: 500, balanceAfter: 500, reason: "Signup Bonus" }),
    );
  });

  test("sends the welcome and join link only with a sending number", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ signupBonus: 500 }));

    await createCustomerAccount(signupInput, PROGRAM, ORG, "919999999999");

    expect((sendTextMessage as Mock).mock.calls).toHaveLength(2);
    expect((sendTextMessage as Mock).mock.calls[1][2]).toBe("https://wa.me/join");
  });
});

describe("createCustomerAccount — the join confirmation", () => {
  // The welcome message used to sit inside the `signupBonus > 0` block, and signupBonus
  // defaults to 0 with no UI to change it — so joining a normal program silently sent
  // nothing. Confirming the join does not depend on there being points to announce.
  test("welcomes the member even when the program pays no signup bonus", async () => {
    await createCustomerAccount(signupInput, PROGRAM, ORG, "919999999999");

    const calls = (sendTextMessage as Mock).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][2]).toContain("You are now registered in our Loyalty Program.");
    expect(calls[1][2]).toBe("https://wa.me/join");
  });

  test("still says nothing about points when there is no signup bonus", async () => {
    await createCustomerAccount(signupInput, PROGRAM, ORG, "919999999999");

    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
    expect(dispatchLoyaltyNotification).not.toHaveBeenCalled();
  });

  test("stays silent without a sending number to build the link from", async () => {
    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(sendTextMessage).not.toHaveBeenCalled();
  });
});

describe("createCustomerAccount — referrals", () => {
  const referrer = { id: "acct-referrer", currentPoints: 200 };

  test("ignores a referral code that matches nothing", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(null);

    await createCustomerAccount({ ...signupInput, referCode: "NOPE-1234" }, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data.referredById).toBeNull();
  });

  test("looks the referral code up inside the same program, ignoring case", async () => {
    await createCustomerAccount({ ...signupInput, referCode: "ann-ab12" }, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.findFirst.mock.calls[0][0].where).toEqual({
      programId: PROGRAM,
      referralCode: { equals: "ann-ab12", mode: "insensitive" },
    });
  });

  test("credits the referrer's balance and lifetime points", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(referrer);

    await createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: "acct-referrer" },
      data: { currentPoints: { increment: 50 }, lifetimePoints: { increment: 50 } },
    });
  });

  test("records the referrer's bonus in the ledger", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(referrer);
    db.customerLoyaltyAccount.update.mockResolvedValue({ id: "acct-referrer", currentPoints: 250 });

    await createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG);

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      accountId: "acct-referrer",
      source: "referral",
      points: 50,
      balanceAfter: 250,
    });
  });

  test("credits the referee's bonus into the opening balance", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ refereeBonus: 25 }));
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(referrer);

    await createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data).toMatchObject({
      currentPoints: 25,
      lifetimePoints: 25,
      referredById: "acct-referrer",
    });
  });

  test("the referee's ledger row matches the balance it actually has", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ refereeBonus: 25, signupBonus: 500 }));
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(referrer);

    await createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG);

    const opening = db.customerLoyaltyAccount.create.mock.calls[0][0].data.currentPoints;
    expect(opening).toBe(525);
    const refereeRow = db.loyaltyTransaction.create.mock.calls.find(
      (c) => c[0].data.accountId === "acct-1",
    );
    expect(refereeRow![0].data.balanceAfter).toBe(opening);
  });

  test("the referrer's ledger balance comes from the write, not from a stale read", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(referrer);
    db.customerLoyaltyAccount.update.mockResolvedValue({ id: "acct-referrer", currentPoints: 999 });

    await createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG);

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data.balanceAfter).toBe(999);
  });

  test("a gift referral assigns the reward instead of adding points", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(
      program({ referralBonusType: "gift", referralRewardId: "rwd-1", referralBonus: 50 }),
    );
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(referrer);
    // assignRewardToCustomer re-reads the referrer's account for the dispatch.
    db.customerLoyaltyAccount.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "acct-referrer",
      programId: PROGRAM,
      contact: { phone: "9", orgId: ORG },
    });

    await createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG);

    expect(db.customerReward.create).toHaveBeenCalled();
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  test("tolerates a gift the referrer already holds", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(
      program({ referralBonusType: "gift", referralRewardId: "rwd-1" }),
    );
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(referrer);
    db.customerLoyaltyAccount.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "acct-referrer", programId: PROGRAM, contact: null });
    db.customerReward.findUnique.mockResolvedValue({ id: "already" });

    await expect(
      createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG),
    ).resolves.toBeDefined();
  });
});

describe("createCustomerAccount — the opening tier", () => {
  test("takes the entry tier to be the lowest threshold, not a priority number", async () => {
    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(db.loyaltyTier.findFirst.mock.calls[0][0]).toMatchObject({
      where: { programId: PROGRAM },
      orderBy: { threshold: "asc" },
    });
  });

  test("leaves the account untiered when the program has no tiers at all", async () => {
    db.loyaltyTier.findFirst.mockResolvedValue(null);

    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data.currentTierId).toBeNull();
  });

  test("uses the entry tier when the program has one", async () => {
    db.loyaltyTier.findFirst.mockResolvedValue({ id: "tier-second" });

    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data.currentTierId).toBe(
      "tier-second",
    );
  });
});

// ===========================================================================
// awardPoints
// ===========================================================================

describe("awardPoints", () => {
  const customer = {
    id: "acct-1",
    programId: PROGRAM,
    contact: { id: "contact-1", name: "Ann", phone: "919000000001", orgId: ORG },
    program: { id: PROGRAM },
    currentTier: { id: "tier-1", name: "Bronze" },
  };

  beforeEach(() => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(customer);
    db.customerLoyaltyAccount.update.mockResolvedValue({
      id: "acct-1",
      currentPoints: 600,
      lifetimePoints: 600,
      totalSpend: 1000,
    });
  });

  test("refuses to award points to a contact with no loyalty account", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);

    await expect(awardPoints(PROGRAM, "contact-1", 500, {})).rejects.toThrow(
      "Customer account not found. Create account first.",
    );
  });

  test("credits the balance, the lifetime total and the spend together", async () => {
    await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { increment: 100 },
      lifetimePoints: { increment: 100 },
      totalSpend: { increment: 500 },
    });
  });

  test("records the award against the post-update balance", async () => {
    await awardPoints(PROGRAM, "contact-1", 500, { orderId: "ord-1" });

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      accountId: "acct-1",
      transactionType: "earn",
      source: "purchase",
      points: 100,
      balanceAfter: 600,
    });
  });

  test("records which earning rule priced the purchase", async () => {
    (calculatePointsForPurchase as Mock).mockResolvedValue({
      points: 100,
      rule: { id: "rule-1", name: "Double points Tuesday" },
    });

    await awardPoints(PROGRAM, "contact-1", 500, {});

    const metadata = db.loyaltyTransaction.create.mock.calls[0][0].data.metadata;
    expect(metadata.appliedRuleId).toBe("rule-1");
    expect(metadata.appliedRuleName).toBe("Double points Tuesday");
  });

  test("carries the purchase context into the ledger metadata", async () => {
    await awardPoints(PROGRAM, "contact-1", 500, { orderId: "ord-1", channel: "whatsapp" });

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data.metadata).toMatchObject({
      purchaseAmount: 500,
      orderId: "ord-1",
      channel: "whatsapp",
    });
  });

  test("re-evaluates the tier against the updated lifetime spend", async () => {
    await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(checkAndUpgradeTier).toHaveBeenCalledWith("acct-1", 1000);
  });

  test("tells the customer their points were issued", async () => {
    await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(dispatchLoyaltyNotification).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.POINTS_ISSUED,
      expect.objectContaining({ points: 100, balanceAfter: 600, reason: "Purchase" }),
    );
  });

  test("announces a tier move as an upgrade", async () => {
    (checkAndUpgradeTier as Mock).mockResolvedValue({
      upgraded: true,
      newTier: { name: "Silver" },
    });

    await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(dispatchLoyaltyNotification).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.TIER_UPGRADED,
      expect.objectContaining({ newTier: "Silver", oldTier: "Bronze" }),
    );
  });

  test("says nothing when the contact has no phone", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ ...customer, contact: null });

    await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(dispatchLoyaltyNotification).not.toHaveBeenCalled();
  });

  test("credits the balance before the ledger row is written, untransacted", async () => {
    await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(db.customerLoyaltyAccount.update.mock.invocationCallOrder[0]).toBeLessThan(
      db.loyaltyTransaction.create.mock.invocationCallOrder[0],
    );
  });

  test("hands the receipt the rule that priced it, in plain numbers", async () => {
    (calculatePointsForPurchase as Mock).mockResolvedValue({
      points: 100,
      rule: { id: "rule-1", name: "Happy hour", multiplier: "2.00", bonusPoints: 10 },
    });

    const result = await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(result.rule).toEqual({
      id: "rule-1",
      name: "Happy hour",
      multiplier: 2,
      bonusPoints: 10,
    });
    expect(result.pointsAwarded).toBe(100);
  });

  test("hands the receipt where the customer sits and how far the next tier is", async () => {
    (checkAndUpgradeTier as Mock).mockResolvedValue({
      upgraded: false,
      direction: "none",
      currentTier: {
        id: "tier-1",
        name: "Bronze",
        threshold: "0",
        pointsMultiplier: "1.00",
        color: "#a00",
      },
      nextTier: { id: "tier-2", name: "Silver", threshold: "5000", pointsMultiplier: "1.25" },
      amountToNext: 4000,
    });

    const result = await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(result.tier).toEqual({
      current: { id: "tier-1", name: "Bronze", threshold: 0, pointsMultiplier: 1, color: "#a00" },
      previous: "Bronze",
      upgraded: false,
      next: { id: "tier-2", name: "Silver", threshold: 5000, pointsMultiplier: 1.25, color: null },
      amountToNext: 4000,
    });
  });

  test("reports what the dispatcher did with the WhatsApp message", async () => {
    (dispatchLoyaltyNotification as Mock).mockResolvedValue({
      sent: true,
      channel: "whatsapp",
      templateId: "tmpl-1",
      text: "Hi Ann, you earned 100 points.",
      skippedReason: null,
    });

    const result = await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(result.notification).toMatchObject({
      sent: true,
      text: "Hi Ann, you earned 100 points.",
    });
    expect(result.tierNotification).toBeNull();
  });

  test("treats a dispatcher that returns nothing as not sent", async () => {
    (dispatchLoyaltyNotification as Mock).mockResolvedValue(undefined);

    const result = await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(result.notification).toEqual({
      sent: false,
      channel: null,
      mode: null,
      templateId: null,
      text: null,
      skippedReason: null,
    });
  });

  test("says why nothing was sent when the contact has no phone", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ ...customer, contact: null });

    const result = await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(result.notification.skippedReason).toBe("no_phone");
  });
});

// ===========================================================================
// reads
// ===========================================================================

describe("getCustomerAccounts", () => {
  test("lists a program's accounts newest first", async () => {
    await getCustomerAccounts(PROGRAM);

    expect(db.customerLoyaltyAccount.findMany.mock.calls[0][0]).toMatchObject({
      where: { programId: PROGRAM },
      orderBy: { createdAt: "desc" },
    });
  });

  test("a name filter matches only the name", async () => {
    await getCustomerAccounts(PROGRAM, undefined, "ann");

    expect(db.customerLoyaltyAccount.findMany.mock.calls[0][0].where.contact).toEqual({
      name: { contains: "ann", mode: "insensitive" },
    });
  });

  test("a search matches the name or the phone", async () => {
    await getCustomerAccounts(PROGRAM, "9190");

    expect(db.customerLoyaltyAccount.findMany.mock.calls[0][0].where.contact.OR).toHaveLength(2);
  });

  test("a name filter takes precedence over a search", async () => {
    await getCustomerAccounts(PROGRAM, "9190", "ann");

    expect(db.customerLoyaltyAccount.findMany.mock.calls[0][0].where.contact).not.toHaveProperty(
      "OR",
    );
  });
});

describe("getCustomerAccountByPhone", () => {
  test("returns nothing when the org has no such contact", async () => {
    db.contact.findFirst.mockResolvedValue(null);

    expect(await getCustomerAccountByPhone(PROGRAM, "919000000001", ORG)).toBeNull();
    expect(db.customerLoyaltyAccount.findUnique).not.toHaveBeenCalled();
  });

  test("resolves the contact inside the org before the account", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "contact-1" });

    await getCustomerAccountByPhone(PROGRAM, "919000000001", ORG);

    expect(db.contact.findFirst.mock.calls[0][0].where).toEqual({
      phone: "919000000001",
      orgId: ORG,
    });
    expect(db.customerLoyaltyAccount.findUnique.mock.calls[0][0].where).toEqual({
      programId_contactId: { programId: PROGRAM, contactId: "contact-1" },
    });
  });
});

describe("getLCustomerByPhone", () => {
  test("strips a leading plus and scopes through the contact's org", async () => {
    await getLCustomerByPhone("+919000000001", ORG);

    expect(db.customerLoyaltyAccount.findFirst.mock.calls[0][0].where).toEqual({
      contact: { phone: "919000000001", orgId: ORG },
    });
  });
});

describe("updateCustomerAccount", () => {
  test("scopes the write to the caller's program", async () => {
    await updateCustomerAccount("acct-other-org", { status: "closed" } as any, PROGRAM);

    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: "acct-other-org", programId: PROGRAM },
      data: { status: "closed" },
    });
  });
});

// ===========================================================================
// reward assignment
// ===========================================================================

describe("assignRewardToCustomer", () => {
  beforeEach(() => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({
      id: "acct-1",
      programId: PROGRAM,
      contact: { name: "Ann", phone: "919000000001", orgId: ORG },
    });
  });

  test("refuses when the account does not exist", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);

    await expect(assignRewardToCustomer("nope", "rwd-1")).rejects.toThrow(
      "Customer account not found",
    );
  });

  test("refuses when the reward does not exist", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(null);

    await expect(assignRewardToCustomer("acct-1", "nope")).rejects.toThrow("Reward not found");
  });

  test("refuses a reward the customer already holds", async () => {
    db.customerReward.findUnique.mockResolvedValue({ id: "cr-existing" });

    await expect(assignRewardToCustomer("acct-1", "rwd-1")).rejects.toThrow(
      "Reward is already assigned to this customer",
    );
  });

  test("issues the assignment with a short code", async () => {
    await assignRewardToCustomer("acct-1", "rwd-1");

    expect(db.customerReward.create.mock.calls[0][0].data).toMatchObject({
      rewardId: "rwd-1",
      accountId: "acct-1",
      shortCode: "SHORT1",
      status: "ISSUED",
    });
  });

  // The short code, unlike the redemption code, IS checked for collisions.
  test("keeps drawing short codes until it finds a free one", async () => {
    const { generateRewardShortCode } = await import("../../../utils/misc/random.utils.js");
    (generateRewardShortCode as Mock).mockReturnValueOnce("TAKEN1").mockReturnValueOnce("FREE01");
    db.customerReward.findUnique
      .mockResolvedValueOnce(null) // the already-assigned check
      .mockResolvedValueOnce({ id: "collision" }) // TAKEN1 is in use
      .mockResolvedValueOnce(null); // FREE01 is free

    await assignRewardToCustomer("acct-1", "rwd-1");

    expect(db.customerReward.create.mock.calls[0][0].data.shortCode).toBe("FREE01");
  });

  test("tells the customer about their new reward", async () => {
    await assignRewardToCustomer("acct-1", "rwd-1");

    expect(dispatchLoyaltyNotification).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.REWARD_ISSUED,
      expect.objectContaining({ rewardName: "Free coffee", redemptionCode: "SHORT1" }),
    );
  });

  test("looks the reward up inside the account's own program", async () => {
    await assignRewardToCustomer("acct-1", "rwd-other-program");

    expect(db.loyaltyReward.findFirst.mock.calls[0][0]).toEqual({
      where: { id: "rwd-other-program", programId: PROGRAM },
    });
  });

  test("a reward in another program is simply not found", async () => {
    db.loyaltyReward.findFirst.mockResolvedValue(null);

    await expect(assignRewardToCustomer("acct-1", "rwd-other-program")).rejects.toThrow(
      "Reward not found",
    );
    expect(db.customerReward.create).not.toHaveBeenCalled();
  });
});

describe("getRewardByShortCode", () => {
  const issued = {
    id: "cr-1",
    status: "ISSUED",
    account: { program: { orgId: ORG }, contact: { name: "Ann" } },
    reward: { id: "rwd-1" },
  };

  test("refuses a short code that matches nothing", async () => {
    db.customerReward.findUnique.mockResolvedValue(null);

    await expect(getRewardByShortCode("NOPE", ORG)).rejects.toThrow("Reward not found");
  });

  test("refuses a short code belonging to another org", async () => {
    db.customerReward.findUnique.mockResolvedValue({
      ...issued,
      account: { program: { orgId: "org-other" } },
    });

    await expect(getRewardByShortCode("SHORT1", ORG)).rejects.toThrow("Reward not found");
  });

  test("returns the reward when the org matches", async () => {
    db.customerReward.findUnique.mockResolvedValue(issued);

    expect(await getRewardByShortCode("SHORT1", ORG)).toEqual(issued);
  });

  test("the check cannot be skipped, because the org is not optional", async () => {
    db.customerReward.findUnique.mockResolvedValue({
      ...issued,
      account: { program: { orgId: "org-other" } },
    });

    await expect(getRewardByShortCode("SHORT1", ORG)).rejects.toThrow("Reward not found");
  });
});

describe("markRewardAsRedeemed", () => {
  const issued = {
    id: "cr-1",
    status: "ISSUED",
    account: { program: { orgId: ORG } },
    reward: { id: "rwd-1" },
  };

  test("marks an issued reward as redeemed", async () => {
    db.customerReward.findUnique.mockResolvedValue(issued);
    db.customerReward.update.mockResolvedValue({ id: "cr-1", status: "REDEEMED" });

    await markRewardAsRedeemed("SHORT1", ORG);

    expect(db.customerReward.update).toHaveBeenCalledWith({
      where: { id: "cr-1", status: { not: "REDEEMED" } },
      data: { status: "REDEEMED" },
    });
  });

  test("refuses to redeem the same reward twice", async () => {
    db.customerReward.findUnique.mockResolvedValue({ ...issued, status: "REDEEMED" });

    await expect(markRewardAsRedeemed("SHORT1", ORG)).rejects.toThrow("Reward is already redeemed");
  });

  test("guards against double redemption in the write itself", async () => {
    db.customerReward.findUnique.mockResolvedValue(issued);
    db.customerReward.update.mockResolvedValue({ id: "cr-1" });

    await markRewardAsRedeemed("SHORT1", ORG);

    expect(db.customerReward.update.mock.calls[0][0].where).toEqual({
      id: "cr-1",
      status: { not: "REDEEMED" },
    });
  });

  test("reports an already-redeemed reward when the guarded write loses the race", async () => {
    db.customerReward.findUnique.mockResolvedValue(issued);
    db.customerReward.update.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found"), { code: "P2025" }),
    );

    await expect(markRewardAsRedeemed("SHORT1", ORG)).rejects.toThrow("Reward is already redeemed");
  });

  test("inherits the required org from the lookup", async () => {
    db.customerReward.findUnique.mockResolvedValue({
      ...issued,
      account: { program: { orgId: "org-other" } },
    });
    db.customerReward.update.mockResolvedValue({ id: "cr-1" });

    await expect(markRewardAsRedeemed("SHORT1", ORG)).rejects.toThrow("Reward not found");
  });
});

describe("lookupContactByPhone", () => {
  test("strips a leading + before matching, since contacts are stored without one", async () => {
    db.contact.findFirst.mockResolvedValue(null);

    await lookupContactByPhone("+919876543210", ORG);

    expect(db.contact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { phone: "919876543210", orgId: ORG } }),
    );
  });

  test("returns nothing for a number the org has never seen", async () => {
    db.contact.findFirst.mockResolvedValue(null);

    const result = await lookupContactByPhone("919876543210", ORG);

    expect(result).toEqual({ contact: null, alreadyMember: false });
    // No point asking about a loyalty account for a contact that does not exist.
    expect(db.customerLoyaltyAccount.findFirst).not.toHaveBeenCalled();
  });

  test("returns a known contact that has never joined the programme", async () => {
    db.contact.findFirst.mockResolvedValue({
      id: "contact-1",
      name: "Asha",
      email: null,
      dob: null,
    });
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(null);

    const result = await lookupContactByPhone("919876543210", ORG);

    expect(result.contact?.name).toBe("Asha");
    expect(result.alreadyMember).toBe(false);
  });

  test("flags an active member so the form can stop a duplicate", async () => {
    db.contact.findFirst.mockResolvedValue({
      id: "contact-1",
      name: "Asha",
      email: null,
      dob: null,
    });
    db.customerLoyaltyAccount.findFirst.mockResolvedValue({ id: "acc-1", status: "active" });

    expect((await lookupContactByPhone("919876543210", ORG)).alreadyMember).toBe(true);
  });

  test("an inactive account is not 'already a member' — submitting reactivates it", async () => {
    db.contact.findFirst.mockResolvedValue({
      id: "contact-1",
      name: "Asha",
      email: null,
      dob: null,
    });
    db.customerLoyaltyAccount.findFirst.mockResolvedValue({ id: "acc-1", status: "inactive" });

    const result = await lookupContactByPhone("919876543210", ORG);

    expect(result.contact?.name).toBe("Asha");
    expect(result.alreadyMember).toBe(false);
  });

  test("scopes the loyalty account lookup to the caller's org", async () => {
    db.contact.findFirst.mockResolvedValue({
      id: "contact-1",
      name: "Asha",
      email: null,
      dob: null,
    });
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(null);

    await lookupContactByPhone("919876543210", ORG);

    expect(db.customerLoyaltyAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contactId: "contact-1", program: { orgId: ORG } },
      }),
    );
  });
});
