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
    loyaltyTier: { findFirst: vi.fn() },
    loyaltyReward: { findUnique: vi.fn() },
    loyaltyTransaction: { create: vi.fn() },
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
vi.mock("../loyaltyWaDispatcher.js", () => ({ dispatchLoyaltyNotification: vi.fn() }));

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
};

const ORG = "11111111-1111-4111-8111-111111111111";
const PROGRAM = "prog-1";

const signupInput = { name: "Ann", phone: "+919000000001", orgId: ORG } as any;

function program(over: Record<string, unknown> = {}) {
  return {
    id: PROGRAM,
    signupBonus: 0,
    referralBonus: 0,
    referralBonusType: "points",
    referralRewardId: null,
    refereeBonus: 0,
    refereeBonusType: "points",
    refereeRewardId: null,
    ...over,
  };
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
  db.loyaltyTransaction.create.mockResolvedValue({ id: "txn-1" });
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
  // NOTE: pins current behaviour, and this is the headline defect of the module.
  // The account row is created with `currentPoints: refereeBonusPoints` and the
  // signup bonus is NEVER added to it — only a ledger row is written. The
  // customer is told they have the points and the transaction history says so,
  // but the balance they can spend is zero. See issues.txt 20.14.
  test("writes a ledger row for the signup bonus but never credits the balance", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ signupBonus: 500 }));

    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data).toMatchObject({
      currentPoints: 0,
      lifetimePoints: 0,
    });
    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      source: "signup_bonus",
      points: 500,
      balanceAfter: 500,
    });
    // No follow-up update credits it.
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

describe("createCustomerAccount — referrals", () => {
  const referrer = { id: "acct-referrer", currentPoints: 200 };

  test("ignores a referral code that matches nothing", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);

    await createCustomerAccount({ ...signupInput, referCode: "NOPE-1234" }, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data.referredById).toBeNull();
  });

  test("looks the referral code up inside the same program", async () => {
    await createCustomerAccount({ ...signupInput, referCode: "ANN-AB12" }, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.findUnique.mock.calls[1][0].where).toEqual({
      referralCode: "ANN-AB12",
      programId: PROGRAM,
    });
  });

  test("credits the referrer's balance and lifetime points", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));
    db.customerLoyaltyAccount.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(referrer);

    await createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: "acct-referrer" },
      data: { currentPoints: { increment: 50 }, lifetimePoints: { increment: 50 } },
    });
  });

  test("records the referrer's bonus in the ledger", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));
    db.customerLoyaltyAccount.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(referrer);

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
    db.customerLoyaltyAccount.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(referrer);

    await createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data).toMatchObject({
      currentPoints: 25,
      lifetimePoints: 25,
      referredById: "acct-referrer",
    });
  });

  // NOTE: pins current behaviour. The referee's ledger row records
  // `balanceAfter: signupBonus + refereeBonusPoints`, but the signup bonus was
  // never credited (20.14), so the recorded balance overstates the real one by
  // exactly the signup bonus. See issues.txt 20.15.
  test("the referee's ledger row overstates the balance by the uncredited signup bonus", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ refereeBonus: 25, signupBonus: 500 }));
    db.customerLoyaltyAccount.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(referrer);

    await createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data.currentPoints).toBe(25);
    const refereeRow = db.loyaltyTransaction.create.mock.calls.find(
      (c) => c[0].data.accountId === "acct-1",
    );
    expect(refereeRow![0].data.balanceAfter).toBe(525);
  });

  // NOTE: the referrer's balanceAfter is computed from the row read BEFORE the
  // increment, not from the update's result. Two referrals landing together both
  // record the same pre-increment balance. See issues.txt 20.15.
  test("the referrer's ledger balance is derived from a pre-increment read", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));
    db.customerLoyaltyAccount.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(referrer);
    db.customerLoyaltyAccount.update.mockResolvedValue({ id: "acct-referrer", currentPoints: 999 });

    await createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG);

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data.balanceAfter).toBe(250);
  });

  test("a gift referral assigns the reward instead of adding points", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(
      program({ referralBonusType: "gift", referralRewardId: "rwd-1", referralBonus: 50 }),
    );
    db.customerLoyaltyAccount.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(referrer)
      .mockResolvedValueOnce({ id: "acct-referrer", contact: { phone: "9", orgId: ORG } });

    await createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG);

    expect(db.customerReward.create).toHaveBeenCalled();
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  test("tolerates a gift the referrer already holds", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(
      program({ referralBonusType: "gift", referralRewardId: "rwd-1" }),
    );
    db.customerLoyaltyAccount.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(referrer)
      .mockResolvedValueOnce({ id: "acct-referrer", contact: null });
    db.customerReward.findUnique.mockResolvedValue({ id: "already" });

    await expect(
      createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG),
    ).resolves.toBeDefined();
  });
});

describe("createCustomerAccount — the opening tier", () => {
  // NOTE: pins current behaviour. New accounts are placed in the tier whose
  // `priority` is exactly 1 — but createLoyaltyTier assigns priorities starting
  // at 0 and incrementing, so a program's FIRST tier has priority 0 and is never
  // found here. A program with one tier enrols everyone with no tier at all;
  // a program with two enrols them into the second. See issues.txt 20.11.
  test("looks for the entry tier at priority 1, not 0", async () => {
    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(db.loyaltyTier.findFirst.mock.calls[0][0].where).toEqual({
      programId: PROGRAM,
      priority: 1,
    });
  });

  test("leaves the account untiered when no tier has priority 1", async () => {
    db.loyaltyTier.findFirst.mockResolvedValue(null);

    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data.currentTierId).toBeNull();
  });

  test("uses the priority-1 tier when one exists", async () => {
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

  // NOTE: pins current behaviour. The engine returns the matched rule under the
  // key `rule`, but awardPoints destructures `{ points, appliedRule }` — a key
  // the engine never returns. Every purchase transaction therefore records
  // `appliedRuleId: undefined`, so the ledger cannot say which earning rule
  // priced it. See issues.txt 20.16.
  test("records an empty rule reference for every purchase", async () => {
    (calculatePointsForPurchase as Mock).mockResolvedValue({
      points: 100,
      rule: { id: "rule-1", name: "Double points Tuesday" },
    });

    await awardPoints(PROGRAM, "contact-1", 500, {});

    const metadata = db.loyaltyTransaction.create.mock.calls[0][0].data.metadata;
    expect(metadata.appliedRuleId).toBeUndefined();
    expect(metadata.appliedRuleName).toBeUndefined();
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

  // NOTE: the balance write, the ledger row and the tier move are three separate
  // statements with no transaction around them. A failure after the first leaves
  // points credited with no ledger entry explaining them.
  // See issues.txt 20.17.
  test("credits the balance before the ledger row is written, untransacted", async () => {
    await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(db.customerLoyaltyAccount.update.mock.invocationCallOrder[0]).toBeLessThan(
      db.loyaltyTransaction.create.mock.invocationCallOrder[0],
    );
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
  // NOTE: the update is keyed on the account id alone; nothing ties it to the
  // caller's program or org. The schema does confine the body to `status`, so
  // the blast radius is suspending or closing another org's account rather than
  // editing its points. See issues.txt 20.18.
  test("writes the body straight through with no program or org check", async () => {
    await updateCustomerAccount("acct-other-org", { status: "closed" } as any);

    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: "acct-other-org" },
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
    db.loyaltyReward.findUnique.mockResolvedValue(null);

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

  // NOTE: the account and the reward are fetched independently and never
  // compared. Nothing stops a reward from one program being assigned to an
  // account in another. See issues.txt 20.18.
  test("never checks that the reward and the account share a program", async () => {
    await assignRewardToCustomer("acct-1", "rwd-other-program");

    expect(db.loyaltyReward.findUnique.mock.calls[0][0]).toEqual({
      where: { id: "rwd-other-program" },
    });
    expect(db.customerReward.create).toHaveBeenCalled();
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

    await expect(getRewardByShortCode("NOPE")).rejects.toThrow("Reward not found");
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

  // NOTE: pins current behaviour. `orgId` is an OPTIONAL parameter and the
  // ownership check is `if (orgId && ...)`, so any caller that omits it reads
  // another org's reward. See issues.txt 20.18.
  test("skips the ownership check entirely when no org is supplied", async () => {
    db.customerReward.findUnique.mockResolvedValue({
      ...issued,
      account: { program: { orgId: "org-other" } },
    });

    await expect(getRewardByShortCode("SHORT1")).resolves.toBeDefined();
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
      where: { id: "cr-1" },
      data: { status: "REDEEMED" },
    });
  });

  test("refuses to redeem the same reward twice", async () => {
    db.customerReward.findUnique.mockResolvedValue({ ...issued, status: "REDEEMED" });

    await expect(markRewardAsRedeemed("SHORT1", ORG)).rejects.toThrow("Reward is already redeemed");
  });

  // NOTE: the guard is a read followed by a write with nothing in between, so two
  // cashiers scanning the same code at once both pass it. See issues.txt 20.17.
  test("guards against double redemption with a read, not a conditional write", async () => {
    db.customerReward.findUnique.mockResolvedValue(issued);
    db.customerReward.update.mockResolvedValue({ id: "cr-1" });

    await markRewardAsRedeemed("SHORT1", ORG);

    expect(db.customerReward.update.mock.calls[0][0].where).toEqual({ id: "cr-1" });
  });

  test("inherits the optional-org gap from the lookup", async () => {
    db.customerReward.findUnique.mockResolvedValue({
      ...issued,
      account: { program: { orgId: "org-other" } },
    });
    db.customerReward.update.mockResolvedValue({ id: "cr-1" });

    await expect(markRewardAsRedeemed("SHORT1")).resolves.toBeDefined();
  });
});
