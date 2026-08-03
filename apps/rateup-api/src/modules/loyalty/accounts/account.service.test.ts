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
    loyaltyReward: { findUnique: vi.fn(), findFirst: vi.fn() },
    loyaltyTransaction: { create: vi.fn() },
    // awardPoints does its pricing, its balance write, its ledger row and the
    // rule's usage count in one transaction now.
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
  // The headline defect of the module. The account row was created with
  // `currentPoints: refereeBonusPoints` and the signup bonus was NEVER added to
  // it — only a ledger row was written. So the customer was told they had the
  // points, the transaction history said so, and the balance they could spend was
  // zero. The ledger and the balance disagreed from the very first row. The
  // referee bonus WAS credited, which is what made this an omission rather than a
  // design. It goes into the opening balance now, in the same create.
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

describe("createCustomerAccount — referrals", () => {
  const referrer = { id: "acct-referrer", currentPoints: 200 };

  test("ignores a referral code that matches nothing", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(null);

    await createCustomerAccount({ ...signupInput, referCode: "NOPE-1234" }, PROGRAM, ORG);

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data.referredById).toBeNull();
  });

  // The lookup folds case. It used to be an exact, case-sensitive `findUnique` on
  // a code the customer types in by hand — and trackReferral minted codes that
  // were not upper-cased while signup minted codes that were, so a customer
  // entering their own code in caps was simply not found and the referrer earned
  // nothing.
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

  // The referee's ledger row recorded `balanceAfter: signupBonus +
  // refereeBonusPoints` while the signup bonus was never credited (20.14), so the
  // recorded balance overstated the real one by exactly the signup bonus. Now
  // that both bonuses are in the opening balance, the row is simply true.
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

  // The referrer's balanceAfter used to be computed as
  // `referredBy.currentPoints + referralBonus` from the row read moments earlier,
  // rather than from the update's result — so any other write landing on that
  // account in between left the ledger recording a balance it never held, and two
  // referrals arriving together both recorded the same pre-increment figure.
  // It comes from the write's own returned row now.
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
  // New accounts used to be placed in the tier whose `priority` was exactly 1 —
  // but createLoyaltyTier numbers a program's FIRST tier 0 and increments from
  // there, so a single-tier program never matched and every new account was
  // created untiered, which then opened. A
  // program with two or more tiers enrolled new customers into the SECOND tier
  // created rather than the first.
  //
  // The entry tier is the one with the lowest threshold — the tier a customer
  // holding nothing is already in — which is how resetProgramPoints has always
  // picked it.
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

  // Fixed: the engine returns the matched rule under the key `rule`, and
  // awardPoints now destructures `{ points, rule: appliedRule }` to match —
  // previously it destructured a nonexistent `appliedRule` key, so every
  // purchase transaction recorded `appliedRuleId: undefined` regardless of
  // which rule actually priced it.
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

  // NOTE: the balance write, the ledger row and the tier move are three separate
  // statements with no transaction around them. A failure after the first leaves
  // points credited with no ledger entry explaining them.
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
  // The update used to be keyed on the account id alone, with nothing tying it to
  // the caller's program or org — an account id was enough to suspend or close
  // another org's customer. The program is part of the where clause now, so prisma
  // raises P2025 rather than updating a row the caller cannot see.
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

  // The account and the reward used to be fetched independently and their
  // programs never compared, so a reward id and an account id from different
  // programs were enough to assign a reward across the tenant boundary. The
  // reward is looked up WITHIN the account's program now.
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

  // `orgId` used to be an OPTIONAL parameter with the ownership check written as
  // `if (orgId && …)`, so any caller that simply omitted it read another org's
  // reward. The two short-code handlers did pass the session org, so it was never
  // exploited through HTTP — it was a loaded footgun for the next caller, and the
  // next caller is the one who would not know to look. It is required now, and
  // TypeScript refuses the one-argument call this test used to make.
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

  // The guard used to be a read followed by an unconditional write with nothing in
  // between, so two cashiers scanning the same code at the same moment both passed
  // it and the reward was handed over twice. The status is part of the write's own
  // condition now.
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
