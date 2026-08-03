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
    loyaltyReferral: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    loyaltyTransaction: { create: vi.fn() },
  },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../accounts/account.service.js", () => ({
  assignRewardToCustomer: vi.fn(),
  createCustomerAccount: vi.fn(),
  findAccountByReferralCode: vi.fn(),
}));
vi.mock("../program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import {
  assignRewardToCustomer,
  createCustomerAccount,
  findAccountByReferralCode,
} from "../accounts/account.service.js";
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
    orgId: ORG,
    name: "Bobby",
    phone: "919000000002",
    email: null,
    dob: null,
  });
  db.loyaltyProgram.findUnique.mockResolvedValue(program());
  db.loyaltyReferral.create.mockResolvedValue({ id: "ref-1" });
  db.loyaltyReferral.findUnique.mockResolvedValue(null);
  db.loyaltyReferral.findFirst.mockResolvedValue(null);
  db.loyaltyReferral.findMany.mockResolvedValue([]);
  db.loyaltyReferral.update.mockResolvedValue({});
  db.loyaltyTransaction.create.mockResolvedValue({ id: "txn-1" });
  (assignRewardToCustomer as Mock).mockResolvedValue({ id: "cr-1" });
  (createCustomerAccount as Mock).mockResolvedValue({ id: "acct-referee" });
  (findAccountByReferralCode as Mock).mockResolvedValue(referrer);
  (getLoyaltyProgramByOrg as Mock).mockResolvedValue({ id: PROGRAM });
});

// ===========================================================================
// trackReferral
// ===========================================================================

describe("trackReferral — preconditions", () => {
  test("refuses a referral code that matches nothing in the program", async () => {
    (findAccountByReferralCode as Mock).mockResolvedValue(null);

    await expect(trackReferral(PROGRAM, "NOPE", "contact-1")).rejects.toThrow(
      "Invalid referral code",
    );
  });

  test("looks the code up inside the program, ignoring case", async () => {
    await trackReferral(PROGRAM, "ann-ab12", "contact-1");

    expect(findAccountByReferralCode).toHaveBeenCalledWith(PROGRAM, "ann-ab12");
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

  test("refuses a contact with no phone number to enrol", async () => {
    db.contact.findUnique.mockResolvedValue({ id: "contact-1", orgId: ORG, phone: null });

    await expect(trackReferral(PROGRAM, "ANN-AB12", "contact-1")).rejects.toThrow(
      "Contact has no phone number",
    );
  });
});

describe("trackReferral — the account it opens", () => {
  test("opens the referee's account through createCustomerAccount", async () => {
    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(createCustomerAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "919000000002",
        name: "Bobby",
        orgId: ORG,
      }),
      PROGRAM,
      ORG,
    );
    // Nothing is written here directly any more.
    expect(db.customerLoyaltyAccount.create).not.toHaveBeenCalled();
  });

  test("passes the referrer's canonical code, so the bonuses and tier are applied", async () => {
    await trackReferral(PROGRAM, "ann-ab12", "contact-1");

    expect((createCustomerAccount as Mock).mock.calls[0][0].referCode).toBe("ANN-AB12");
  });

  test("carries the contact's details across", async () => {
    db.contact.findUnique.mockResolvedValue({
      id: "contact-1",
      orgId: ORG,
      name: "Bobby",
      phone: "919000000002",
      email: "bob@example.com",
      dob: new Date("1990-05-04T00:00:00.000Z"),
    });

    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect((createCustomerAccount as Mock).mock.calls[0][0]).toMatchObject({
      email: "bob@example.com",
      dob: "1990-05-04T00:00:00.000Z",
    });
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

  test("returns the referral and both accounts", async () => {
    const res = await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(res).toEqual({
      referral: { id: "ref-1" },
      referrer,
      referee: { id: "acct-referee" },
    });
  });

  test("pays no bonus of its own, in any configuration", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(
      program({ referralBonusType: "gift", referralRewardId: "rwd-1", referralBonus: 50 }),
    );

    await trackReferral(PROGRAM, "ANN-AB12", "contact-1");

    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
    expect(assignRewardToCustomer).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// completeReferral / reads
// ===========================================================================

describe("completeReferral", () => {
  test("refuses a referral that does not exist", async () => {
    await expect(completeReferral("nope", PROGRAM)).rejects.toThrow("Referral not found");
  });

  test("refuses a referral that is not pending", async () => {
    db.loyaltyReferral.findFirst.mockResolvedValue({ id: "ref-1", status: "completed" });

    await expect(completeReferral("ref-1", PROGRAM)).rejects.toThrow("Referral is not pending");
  });

  test("marks the referral completed and stamps the time", async () => {
    db.loyaltyReferral.findFirst.mockResolvedValue({ id: "ref-1", status: "pending" });

    await completeReferral("ref-1", PROGRAM);

    expect(db.loyaltyReferral.update.mock.calls[0][0].data.status).toBe("completed");
    expect(db.loyaltyReferral.update.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
  });

  test("awards nothing on completion", async () => {
    db.loyaltyReferral.findFirst.mockResolvedValue({ id: "ref-1", status: "pending" });

    await completeReferral("ref-1", PROGRAM);

    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("resolves the referral within the caller's program", async () => {
    db.loyaltyReferral.findFirst.mockResolvedValue({ id: "ref-other", status: "pending" });

    await completeReferral("ref-other", PROGRAM);

    expect(db.loyaltyReferral.findFirst.mock.calls[0][0].where).toEqual({
      id: "ref-other",
      programId: PROGRAM,
    });
  });

  test("another program's referral is not found at all", async () => {
    db.loyaltyReferral.findFirst.mockResolvedValue(null);

    await expect(completeReferral("ref-other", PROGRAM)).rejects.toThrow("Referral not found");
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
    (findAccountByReferralCode as Mock).mockResolvedValue(null);
    const rep = reply();

    await trackReferralHandler(
      request({ body: { referralCode: "NOPE", refereeContactId: "contact-1" } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Invalid referral code" } });
  });

  test("completing a referral resolves the caller's program", async () => {
    db.loyaltyReferral.findFirst.mockResolvedValue({ id: "ref-1", status: "pending" });
    const rep = reply();

    await completeReferralHandler(request({ body: { referralId: "ref-1" } }), rep);

    expect(getLoyaltyProgramByOrg).toHaveBeenCalledWith(ORG);
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
