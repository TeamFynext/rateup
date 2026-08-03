import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    customerLoyaltyAccount: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    contact: { findUnique: vi.fn() },
    loyaltyProgram: { findUnique: vi.fn() },
    loyaltyReferral: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    loyaltyTransaction: { create: vi.fn() },
  },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../accounts/account.service.js", () => ({ assignRewardToCustomer: vi.fn() }));
vi.mock("../program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { assignRewardToCustomer } from "../accounts/account.service.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";
import {
  completeReferral,
  getReferralsByProgram,
  getReferralsByReferrer,
  trackReferral,
} from "./referral.service.js";
import {
  completeReferralHandler,
  getReferralsByProgramHandler,
  getReferralsByReferrerHandler,
  trackReferralHandler,
} from "./referral.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  customerLoyaltyAccount: Record<string, Mock>;
  contact: Record<string, Mock>;
  loyaltyProgram: Record<string, Mock>;
  loyaltyReferral: Record<string, Mock>;
  loyaltyTransaction: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const PROGRAM = "prog-1";

interface ProgramFixture {
  id: string;
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
    referralBonus: 0,
    referralBonusType: "points",
    referralRewardId: null,
    refereeBonus: 0,
    refereeBonusType: "points",
    refereeRewardId: null,
  };
  return { ...base, ...over };
}

const referrer = { id: "acct-referrer", currentPoints: 200, referralCode: "ANN-AB12" };

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function request(over: Record<string, unknown> = {}): any {
  return { user: { orgId: ORG }, params: {}, query: {}, body: {}, ...over };
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.customerLoyaltyAccount.findFirst.mockResolvedValue(referrer);
  db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);
  db.customerLoyaltyAccount.create.mockResolvedValue({ id: "acct-referee" });
  db.customerLoyaltyAccount.update.mockResolvedValue({});
  db.contact.findUnique.mockResolvedValue({
    id: "contact-1",
    name: "Bobby",
    phone: "919000000002",
  });
  db.loyaltyProgram.findUnique.mockResolvedValue(program());
  db.loyaltyReferral.create.mockResolvedValue({ id: "ref-1" });
  db.loyaltyReferral.findUnique.mockResolvedValue(null);
  db.loyaltyReferral.findMany.mockResolvedValue([]);
  db.loyaltyReferral.update.mockResolvedValue({});
  db.loyaltyTransaction.create.mockResolvedValue({ id: "txn-1" });
  (assignRewardToCustomer as Mock).mockResolvedValue({ id: "cr-1" });
  (getLoyaltyProgramByOrg as Mock).mockResolvedValue({ id: PROGRAM });
});

// ===========================================================================
// trackReferral
// ===========================================================================

describe("trackReferral — preconditions", () => {
  test("refuses a referral code that matches nothing in the program", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(null);

    await expect(trackReferral(PROGRAM, "NOPE", "contact-1")).rejects.toThrow(
      "Invalid referral code",
    );
  });

  test("looks the code up inside the program", async () => {
    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(db.customerLoyaltyAccount.findFirst.mock.calls[0][0].where).toEqual({
      programId: PROGRAM,
      referralCode: "ANN-AB12",
    });
  });

  test("refuses a referee who already has an account", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ id: "acct-existing" });

    await expect(trackReferral(PROGRAM, "ANN-AB12", "contact-1")).rejects.toThrow(
      "Customer already has an account",
    );
  });

  test("refuses a contact that does not exist", async () => {
    db.contact.findUnique.mockResolvedValue(null);

    await expect(trackReferral(PROGRAM, "ANN-AB12", "contact-1")).rejects.toThrow(
      "Contact not found",
    );
  });
});

describe("trackReferral — the accounts it creates", () => {
  test("opens the referee's account inside the program", async () => {
    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data).toMatchObject({
      programId: PROGRAM,
      contactId: "contact-1",
    });
  });

  test("credits a points-type referee bonus into the opening balance", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ refereeBonus: 25 }));

    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data).toMatchObject({
      currentPoints: 25,
      lifetimePoints: 25,
    });
  });

  // NOTE: pins current behaviour. createCustomerAccount sets `referredById` on
  // the new account; this path does not, so the referee's own row never records
  // who referred them — only the separate LoyaltyReferral table does. Anything
  // reading the account (the customer screen, the export) sees no referrer.
  // See issues.txt 20.40.
  test("never records the referrer on the referee's own account", async () => {
    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data).not.toHaveProperty(
      "referredById",
    );
  });

  // NOTE: nor does it set currentTierId, so a referred customer starts with no
  // tier — which then bypasses every tier restriction (issues.txt 20.6).
  // See issues.txt 20.40.
  test("never places the referee in a tier", async () => {
    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data).not.toHaveProperty(
      "currentTierId",
    );
  });

  // NOTE: this is a FOURTH code generator — four characters of the name plus five
  // of Math.random, unchecked for uniqueness. Unlike generateReferralCode in
  // earningRulesEngine it does NOT upper-case the name, so codes minted here read
  // "Bobb-4RI82" while codes minted at signup read "BOBBY-AB12". Referral codes
  // are matched with an exact, case-sensitive `findFirst`, so a customer who
  // types their own code in caps will not be found. See issues.txt 20.9.
  test("mints a differently-cased referral code from the signup path", async () => {
    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    const code = db.customerLoyaltyAccount.create.mock.calls[0][0].data.referralCode;
    expect(code).toMatch(/^Bobb-[0-9A-Z]*$/);
    expect(code).not.toBe(code.toUpperCase());
  });

  test("matches a referral code exactly, with no case folding", async () => {
    await trackReferral(PROGRAM, "ann-ab12", "contact-1");

    expect(db.customerLoyaltyAccount.findFirst.mock.calls[0][0].where.referralCode).toBe(
      "ann-ab12",
    );
  });

  test("falls back to the phone, then to REF, when there is no name", async () => {
    db.contact.findUnique.mockResolvedValue({ id: "contact-1", phone: "919000000002" });
    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");
    expect(db.customerLoyaltyAccount.create.mock.calls[0][0].data.referralCode).toMatch(/^9190-/);

    db.contact.findUnique.mockResolvedValue({ id: "contact-1" });
    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");
    expect(db.customerLoyaltyAccount.create.mock.calls[1][0].data.referralCode).toMatch(/^REF-/);
  });

  test("records the referral as pending", async () => {
    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(db.loyaltyReferral.create.mock.calls[0][0].data).toEqual({
      programId: PROGRAM,
      referrerAccountId: "acct-referrer",
      refereeContactId: "contact-1",
      refereeAccountId: "acct-referee",
      status: "pending",
    });
  });
});

describe("trackReferral — the bonuses", () => {
  test("credits a points-type referral bonus to the referrer", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));

    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: "acct-referrer" },
      data: { currentPoints: { increment: 50 }, lifetimePoints: { increment: 50 } },
    });
  });

  test("records the referrer's bonus against the referral", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));

    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      accountId: "acct-referrer",
      source: "referral",
      points: 50,
      balanceAfter: 250,
      metadata: { referralId: "ref-1", refereeContactId: "contact-1" },
    });
  });

  test("assigns a gift-type referral reward", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(
      program({ referralBonusType: "gift", referralRewardId: "rwd-1" }),
    );

    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(assignRewardToCustomer).toHaveBeenCalledWith("acct-referrer", "rwd-1");
  });

  test("tolerates a gift the referrer already holds", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(
      program({ referralBonusType: "gift", referralRewardId: "rwd-1" }),
    );
    (assignRewardToCustomer as Mock).mockRejectedValue(
      new Error("Reward is already assigned to this customer"),
    );

    await expect(trackReferral(PROGRAM, "ANN-AB12", "contact-1")).resolves.toBeDefined();
  });

  // NOTE: pins current behaviour, and the two referral paths disagree. In
  // createCustomerAccount the points credit is guarded by
  // `referralBonusType === "points" && referralBonus > 0`. Here the gift branch
  // and the points branch are INDEPENDENT `if`s, so a program configured for a
  // gift bonus that also carries a non-zero referralBonus number pays the
  // referrer BOTH the gift and the points. See issues.txt 20.40.
  test("pays a gift-type referrer the points as well when the number is non-zero", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(
      program({ referralBonusType: "gift", referralRewardId: "rwd-1", referralBonus: 50 }),
    );

    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(assignRewardToCustomer).toHaveBeenCalled();
    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: "acct-referrer" },
      data: { currentPoints: { increment: 50 }, lifetimePoints: { increment: 50 } },
    });
  });

  // NOTE: same stale-read as issues.txt 20.15 — balanceAfter comes from the row
  // fetched before the increment, not from the update's result.
  test("derives the referrer's ledger balance from a pre-increment read", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));
    db.customerLoyaltyAccount.update.mockResolvedValue({ currentPoints: 999 });

    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data.balanceAfter).toBe(250);
  });

  test("records the referee's bonus separately", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ refereeBonus: 25 }));

    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      accountId: "acct-referee",
      points: 25,
      balanceAfter: 25,
    });
  });

  test("assigns a gift-type referee reward instead of points", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(
      program({ refereeBonusType: "gift", refereeRewardId: "rwd-2", refereeBonus: 25 }),
    );

    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(assignRewardToCustomer).toHaveBeenCalledWith("acct-referee", "rwd-2");
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  test("returns the referral, both accounts and the bonus paid", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ referralBonus: 50 }));

    const res = await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(res).toEqual({
      referral: { id: "ref-1" },
      referrer,
      referee: { id: "acct-referee" },
      bonusAwarded: 50,
    });
  });

  // NOTE: account creation, the referral row, the referrer's credit and both
  // ledger rows are five separate writes with no transaction — the same gap as
  // issues.txt 20.17.
  test("writes the account before the referral row, untransacted", async () => {
    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(db.customerLoyaltyAccount.create.mock.invocationCallOrder[0]).toBeLessThan(
      db.loyaltyReferral.create.mock.invocationCallOrder[0],
    );
  });
});

// ===========================================================================
// completeReferral / reads
// ===========================================================================

describe("completeReferral", () => {
  test("refuses a referral that does not exist", async () => {
    await expect(completeReferral("nope", 500)).rejects.toThrow("Referral not found");
  });

  test("refuses a referral that is not pending", async () => {
    db.loyaltyReferral.findUnique.mockResolvedValue({ id: "ref-1", status: "completed" });

    await expect(completeReferral("ref-1", 500)).rejects.toThrow("Referral is not pending");
  });

  test("marks the referral completed and stamps the time", async () => {
    db.loyaltyReferral.findUnique.mockResolvedValue({ id: "ref-1", status: "pending" });

    await completeReferral("ref-1", 500);

    expect(db.loyaltyReferral.update.mock.calls[0][0].data.status).toBe("completed");
    expect(db.loyaltyReferral.update.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
  });

  // NOTE: pins current behaviour. The purchase amount is accepted and named
  // `_purchaseAmount` — it is never read. Completing a referral awards nothing
  // to anyone; the whole bonus is paid up front at trackReferral time, so the
  // "pending -> completed" lifecycle has no financial meaning.
  // See issues.txt 20.41.
  test("ignores the purchase amount and awards nothing on completion", async () => {
    db.loyaltyReferral.findUnique.mockResolvedValue({ id: "ref-1", status: "pending" });

    await completeReferral("ref-1", 50000);

    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  // NOTE: keyed on the referral id alone, with no program or org check.
  // See issues.txt 20.18.
  test("completes whichever referral id it is given", async () => {
    db.loyaltyReferral.findUnique.mockResolvedValue({ id: "ref-other", status: "pending" });

    await completeReferral("ref-other", 0);

    expect(db.loyaltyReferral.update.mock.calls[0][0].where).toEqual({ id: "ref-other" });
  });
});

describe("the referral reads", () => {
  test("a referrer's referrals are listed newest first, unscoped", async () => {
    await getReferralsByReferrer("acct-other-org");

    expect(db.loyaltyReferral.findMany.mock.calls[0][0]).toMatchObject({
      where: { referrerAccountId: "acct-other-org" },
      orderBy: { createdAt: "desc" },
    });
  });

  test("a program's referrals come back with both accounts", async () => {
    await getReferralsByProgram(PROGRAM);

    expect(db.loyaltyReferral.findMany.mock.calls[0][0].where).toEqual({ programId: PROGRAM });
    expect(db.loyaltyReferral.findMany.mock.calls[0][0].include).toHaveProperty("referrerAccount");
  });
});

// ===========================================================================
// the controller
// ===========================================================================

describe("the referral controller", () => {
  test("tracks a referral against the caller's own program", async () => {
    const rep = reply();

    await trackReferralHandler(
      request({ body: { referralCode: "ANN-AB12", refereeContactId: "contact-1" } }),
      rep,
    );

    expect(getLoyaltyProgramByOrg).toHaveBeenCalledWith(ORG);
    expect(answer(rep).code).toBe(201);
  });

  test("refuses when the org has no program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await trackReferralHandler(request({ body: {} }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Loyalty program not found" } });
  });

  test("passes a service refusal through as a 500 with its message", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(null);
    const rep = reply();

    await trackReferralHandler(
      request({ body: { referralCode: "NOPE", refereeContactId: "contact-1" } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Invalid referral code" } });
  });

  test("completing a referral resolves no program at all", async () => {
    db.loyaltyReferral.findUnique.mockResolvedValue({ id: "ref-1", status: "pending" });
    const rep = reply();

    await completeReferralHandler(
      request({ body: { referralId: "ref-1", purchaseAmount: 100 } }),
      rep,
    );

    expect(getLoyaltyProgramByOrg).not.toHaveBeenCalled();
    expect(answer(rep).code).toBe(200);
  });

  test("listing a referrer's referrals resolves no program either", async () => {
    const rep = reply();

    await getReferralsByReferrerHandler(request({ params: { referrerId: "acct-1" } }), rep);

    expect(getLoyaltyProgramByOrg).not.toHaveBeenCalled();
    expect(getReferralsByReferrer).toBeDefined();
    expect(answer(rep).code).toBe(200);
  });

  test("listing a program's referrals is scoped to the caller", async () => {
    const rep = reply();

    await getReferralsByProgramHandler(request(), rep);

    expect(getLoyaltyProgramByOrg).toHaveBeenCalledWith(ORG);
    expect(answer(rep).code).toBe(200);
  });
});
