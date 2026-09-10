import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    contact: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    customerLoyaltyAccount: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
// The scheduler opens a BullMQ queue at import time; awardPoints only needs its result.
vi.mock("../feedback/feedback.scheduler.js", () => ({
  scheduleFeedbackRequest: vi.fn(async () => ({ scheduled: false, reason: "no_setting" })),
}));

import prisma from "../../../utils/prisma.js";
import { calculatePointsForPurchase, checkAndUpgradeTier } from "../earningRulesEngine.js";
import { sendTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import { dispatchLoyaltyNotification } from "../loyaltyWaDispatcher.js";
import { scheduleFeedbackRequest } from "../feedback/feedback.scheduler.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import {
  assignRewardToCustomer,
  awardPoints,
  createCustomerAccount,
  releasePendingSignupBonus,
  releasePendingSignupBonusByPhone,
  getCustomerAccountByPhone,
  getCustomerAccounts,
  getLCustomerByPhone,
  lookupContactByPhone,
  searchContactsForEnrolment,
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
  // Nothing is waiting to be released unless a test says so.
  db.customerLoyaltyAccount.updateMany.mockResolvedValue({ count: 0 });
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

  test("stores a supplied gender on the new contact, and null when absent", async () => {
    await createCustomerAccount({ ...signupInput, gender: "FEMALE" }, PROGRAM, ORG);
    expect(db.contact.create.mock.calls[0][0].data.gender).toBe("FEMALE");

    vi.clearAllMocks();
    db.contact.findFirst.mockResolvedValue(null);
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);
    db.loyaltyProgram.findUnique.mockResolvedValue(program());
    await createCustomerAccount(signupInput, PROGRAM, ORG);
    expect(db.contact.create.mock.calls[0][0].data.gender).toBeNull();
  });

  test("fills a birthday and gender the existing contact lacks", async () => {
    db.contact.findFirst.mockResolvedValue({
      id: "contact-existing",
      orgId: ORG,
      name: "Ann",
      dob: null,
      gender: null,
    });
    db.contact.update.mockResolvedValue({ id: "contact-existing", orgId: ORG });

    await createCustomerAccount(
      { ...signupInput, dob: "1990-05-05", gender: "MALE" },
      PROGRAM,
      ORG,
    );

    expect(db.contact.update).toHaveBeenCalledWith({
      where: { id: "contact-existing" },
      data: { dob: new Date("1990-05-05"), gender: "MALE" },
    });
    expect(db.contact.create).not.toHaveBeenCalled();
  });

  test("never overwrites what the existing contact already says about itself", async () => {
    db.contact.findFirst.mockResolvedValue({
      id: "contact-existing",
      orgId: ORG,
      name: "Jin",
      dob: new Date("1980-01-01"),
      gender: "OTHER",
    });

    await createCustomerAccount(
      { ...signupInput, dob: "1990-05-05", gender: "MALE" },
      PROGRAM,
      ORG,
    );

    expect(db.contact.update).not.toHaveBeenCalled();
  });

  test("names a contact that only ever had a phone, even from the public form", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "contact-existing", orgId: ORG, name: null });
    db.contact.update.mockResolvedValue({ id: "contact-existing", orgId: ORG, name: "Ann" });

    await createCustomerAccount(signupInput, PROGRAM, ORG);

    expect(db.contact.update).toHaveBeenCalledWith({
      where: { id: "contact-existing" },
      data: { name: "Ann" },
    });
  });

  test("staff at the counter can correct a contact's name, birthday and gender", async () => {
    db.contact.findFirst.mockResolvedValue({
      id: "contact-existing",
      orgId: ORG,
      name: "Jin",
      dob: new Date("1980-01-01"),
      gender: "OTHER",
    });
    db.contact.update.mockResolvedValue({ id: "contact-existing", orgId: ORG, name: "JJ" });

    await createCustomerAccount(
      { ...signupInput, name: "JJ", dob: "1990-05-05", gender: "MALE" },
      PROGRAM,
      ORG,
      undefined,
      { trustedDetails: true },
    );

    expect(db.contact.update).toHaveBeenCalledWith({
      where: { id: "contact-existing" },
      data: { name: "JJ", dob: new Date("1990-05-05"), gender: "MALE" },
    });
  });

  test("a trusted payload with the same name touches nothing", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "contact-existing", orgId: ORG, name: "Ann" });

    await createCustomerAccount(signupInput, PROGRAM, ORG, undefined, { trustedDetails: true });

    expect(db.contact.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// searchContactsForEnrolment
// ===========================================================================

describe("searchContactsForEnrolment", () => {
  test("lists the org's phone-bearing contacts with their membership", async () => {
    db.contact.findMany.mockResolvedValue([
      { id: "c1", name: "Ann", phone: "919000000001", loyaltyAccounts: [{ status: "active" }] },
      { id: "c2", name: "Bob", phone: "919000000002", loyaltyAccounts: [] },
    ]);

    const rows = await searchContactsForEnrolment(ORG, { limit: 20 });

    const where = db.contact.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ orgId: ORG, phone: { not: null }, isSpam: false });
    expect(where.OR).toBeUndefined();
    expect(db.contact.findMany.mock.calls[0][0].take).toBe(20);
    expect(rows).toEqual([
      { id: "c1", name: "Ann", phone: "919000000001", memberStatus: "active" },
      { id: "c2", name: "Bob", phone: "919000000002", memberStatus: null },
    ]);
  });

  test("matches a search on name, email, and the digits of a phone", async () => {
    db.contact.findMany.mockResolvedValue([]);

    await searchContactsForEnrolment(ORG, { search: "+91 90", limit: 5 });

    expect(db.contact.findMany.mock.calls[0][0].where.OR).toEqual([
      { name: { contains: "+91 90", mode: "insensitive" } },
      { email: { contains: "+91 90", mode: "insensitive" } },
      { phone: { contains: "9190" } },
    ]);
  });

  test("does not match on phone when the search has no digits", async () => {
    db.contact.findMany.mockResolvedValue([]);

    await searchContactsForEnrolment(ORG, { search: "ann", limit: 5 });

    expect(db.contact.findMany.mock.calls[0][0].where.OR).toHaveLength(2);
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

function heldSnapshot(over: Record<string, unknown> = {}) {
  return {
    signupBonus: 0,
    refereeBonus: 0,
    refereeBonusType: "points",
    refereeRewardId: null,
    referralBonus: 0,
    referralBonusType: "points",
    referralRewardId: null,
    referredById: null,
    ...over,
  };
}

describe("createCustomerAccount — holding the bonuses for a web signup", () => {
  test("creates the account at zero with the promised bonuses frozen, and writes no ledger row", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ signupBonus: 500 }));

    await createCustomerAccount(signupInput, PROGRAM, ORG, undefined, { holdBonuses: true });

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data).toMatchObject({
      currentPoints: 0,
      lifetimePoints: 0,
      verifiedAt: null,
      pendingBonuses: expect.objectContaining({ signupBonus: 500 }),
    });
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
    expect(dispatchLoyaltyNotification).not.toHaveBeenCalled();
  });

  test("does not pay the referrer until the new member is verified", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 200 }));
    db.customerLoyaltyAccount.findFirst.mockResolvedValue({
      id: "acct-referrer",
      currentPoints: 10,
    });

    await createCustomerAccount({ ...signupInput, referCode: "REF-1" }, PROGRAM, ORG, undefined, {
      holdBonuses: true,
    });

    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data).toMatchObject({
      referredById: "acct-referrer",
      pendingBonuses: expect.objectContaining({
        referralBonus: 200,
        referredById: "acct-referrer",
      }),
    });
  });

  test("the staff and WhatsApp paths still credit immediately", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ signupBonus: 500 }));

    await createCustomerAccount(signupInput, PROGRAM, ORG);

    const data = db.customerLoyaltyAccount.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ currentPoints: 500 });
    expect(data).not.toHaveProperty("verifiedAt");
    expect(data).not.toHaveProperty("pendingBonuses");
  });
});

describe("releasePendingSignupBonus", () => {
  const held = {
    id: "acct-1",
    programId: PROGRAM,
    contactId: "contact-1",
    referralCode: "ANN-AB12",
    contact: { phone: "919000000001", name: "Ann", orgId: ORG },
  };

  test("credits exactly once — a second call finds nothing to claim and is a no-op", async () => {
    db.customerLoyaltyAccount.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({
      ...held,
      pendingBonuses: heldSnapshot({ signupBonus: 500 }),
    });
    db.customerLoyaltyAccount.update.mockResolvedValue({ id: "acct-1", currentPoints: 500 });

    expect(await releasePendingSignupBonus("acct-1")).toBe(true);
    expect(await releasePendingSignupBonus("acct-1")).toBe(false);

    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledTimes(1);
    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toMatchObject({
      currentPoints: { increment: 500 },
      lifetimePoints: { increment: 500 },
    });
    expect(db.loyaltyTransaction.create).toHaveBeenCalledTimes(1);
    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      source: "signup_bonus",
      points: 500,
      balanceAfter: 500,
    });
    expect(dispatchLoyaltyNotification).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.POINTS_ISSUED,
      expect.objectContaining({ points: 500, balanceAfter: 500, reason: "Signup Bonus" }),
    );
  });

  test("pays the referrer from the snapshot, not from what the programme says now", async () => {
    db.customerLoyaltyAccount.updateMany.mockResolvedValueOnce({ count: 1 });
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({
      ...held,
      pendingBonuses: heldSnapshot({
        referralBonus: 200,
        refereeBonus: 50,
        referredById: "acct-referrer",
      }),
    });
    // The programme has since doubled its referral bonus; the promise was 200.
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 400 }));
    db.customerLoyaltyAccount.update
      .mockResolvedValueOnce({ id: "acct-referrer", currentPoints: 210 })
      .mockResolvedValueOnce({ id: "acct-1", currentPoints: 50 });

    await releasePendingSignupBonus("acct-1");

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0]).toMatchObject({
      where: { id: "acct-referrer" },
      data: { currentPoints: { increment: 200 } },
    });
    expect(db.loyaltyTransaction.create.mock.calls.map((c) => c[0].data)).toEqual([
      expect.objectContaining({
        accountId: "acct-referrer",
        source: "referral",
        points: 200,
        balanceAfter: 210,
      }),
      expect.objectContaining({
        accountId: "acct-1",
        source: "referral",
        points: 50,
        balanceAfter: 50,
      }),
    ]);
  });

  test("a verified account with nothing owed is left alone", async () => {
    db.customerLoyaltyAccount.updateMany.mockResolvedValueOnce({ count: 1 });
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ ...held, pendingBonuses: null });

    expect(await releasePendingSignupBonus("acct-1")).toBe(false);
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("by phone: finds the one pending account behind the number and releases it", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue({ id: "acct-1" });
    db.customerLoyaltyAccount.updateMany.mockResolvedValueOnce({ count: 1 });
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({
      ...held,
      pendingBonuses: heldSnapshot(),
    });
    db.customerLoyaltyAccount.update.mockResolvedValue({ id: "acct-1", currentPoints: 0 });

    expect(await releasePendingSignupBonusByPhone("+919000000001", ORG)).toBe(true);

    expect(db.customerLoyaltyAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { verifiedAt: null, contact: { phone: "919000000001", orgId: ORG } },
      }),
    );
  });

  test("by phone: a number with no pending account is a no-op", async () => {
    expect(await releasePendingSignupBonusByPhone("919000000001", ORG)).toBe(false);
    expect(db.customerLoyaltyAccount.updateMany).not.toHaveBeenCalled();
  });
});

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

  test("asks the feedback scheduler to follow up on the purchase", async () => {
    db.loyaltyTransaction.create.mockResolvedValueOnce({ id: "txn-9" });

    await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(scheduleFeedbackRequest).toHaveBeenCalledWith({
      programId: PROGRAM,
      accountId: "acct-1",
      transactionId: "txn-9",
    });
  });

  test("a scheduler failure never fails the award", async () => {
    (scheduleFeedbackRequest as Mock).mockRejectedValueOnce(new Error("redis down"));

    await expect(awardPoints(PROGRAM, "contact-1", 500, {})).resolves.toMatchObject({
      pointsAwarded: 100,
    });
  });

  test("records the purchase amount as a typed column as well as in the metadata", async () => {
    await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      purchaseAmount: 500,
      metadata: expect.objectContaining({ purchaseAmount: 500 }),
    });
  });

  test("releases a held signup bonus before booking the purchase", async () => {
    // The first update is the release's credit; the second is the purchase itself.
    db.customerLoyaltyAccount.updateMany.mockResolvedValueOnce({ count: 1 });
    db.customerLoyaltyAccount.findUnique.mockResolvedValueOnce(customer).mockResolvedValueOnce({
      ...customer,
      contactId: "contact-1",
      pendingBonuses: heldSnapshot({ signupBonus: 200 }),
    });
    db.customerLoyaltyAccount.update
      .mockResolvedValueOnce({ id: "acct-1", currentPoints: 200 })
      .mockResolvedValueOnce({
        id: "acct-1",
        currentPoints: 300,
        lifetimePoints: 300,
        totalSpend: 500,
      });

    await awardPoints(PROGRAM, "contact-1", 500, {});

    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "acct-1", verifiedAt: null } }),
    );
    const sources = db.loyaltyTransaction.create.mock.calls.map((c) => c[0].data.source);
    expect(sources).toEqual(["signup_bonus", "purchase"]);
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
