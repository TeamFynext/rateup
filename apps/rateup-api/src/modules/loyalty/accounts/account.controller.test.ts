import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./account.service.js", () => ({
  awardPoints: vi.fn(),
  createCustomerAccount: vi.fn(),
  getCustomerAccountById: vi.fn(),
  getCustomerAccountByContact: vi.fn(),
  getCustomerAccountByPhone: vi.fn(),
  getCustomerAccountByCardCode: vi.fn(),
  getCustomerAccounts: vi.fn(),
  getCustomerAccountsForExport: vi.fn(),
  updateCustomerAccount: vi.fn(),
  assignRewardToCustomer: vi.fn(),
  getRewardByShortCode: vi.fn(),
  markRewardAsRedeemed: vi.fn(),
  searchContactsForEnrolment: vi.fn(),
}));

vi.mock("../program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));
vi.mock("../rewards/reward.service.js", () => ({ getActiveLoyaltyRewards: vi.fn() }));
vi.mock("./memberCard.service.js", () => ({ sendMemberCard: vi.fn() }));

import {
  assignRewardToCustomer,
  awardPoints,
  createCustomerAccount,
  getCustomerAccountById,
  getCustomerAccountByPhone,
  getCustomerAccountByCardCode,
  getCustomerAccounts,
  getCustomerAccountsForExport,
  getRewardByShortCode,
  markRewardAsRedeemed,
  searchContactsForEnrolment,
  updateCustomerAccount,
} from "./account.service.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";
import { getActiveLoyaltyRewards } from "../rewards/reward.service.js";
import { sendMemberCard } from "./memberCard.service.js";
import {
  assignRewardToCustomerHandler,
  awardPointsHandler,
  createCustomerAccountHandler,
  createPublicCustomerAccountHandler,
  exportCustomerAccountsHandler,
  getCustomerAccountByIdHandler,
  getCustomerAccountByPhoneHandler,
  getCustomerAccountByCardCodeHandler,
  sendMemberCardHandler,
  getCustomerAccountsHandler,
  getRewardByShortCodeHandler,
  redeemRewardByShortCodeHandler,
  searchContactsForEnrolmentHandler,
  updateCustomerAccountHandler,
} from "./account.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-4111-8111-111111111111";
const PROGRAM = "prog-1";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep), header: vi.fn(() => rep) };
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
  (getLoyaltyProgramByOrg as Mock).mockResolvedValue({
    id: PROGRAM,
    status: "active",
    defaultCountryCode: "IN",
  });
  (getActiveLoyaltyRewards as Mock).mockResolvedValue([]);
  (getCustomerAccountsForExport as Mock).mockResolvedValue([]);
});

// ===========================================================================
// createCustomerAccountHandler — also mounted unauthenticated
// ===========================================================================

describe("createCustomerAccountHandler", () => {
  const body = { name: "Ann", phone: "+919000000001", orgId: ORG };

  test("enrols the customer in the org's program", async () => {
    (createCustomerAccount as Mock).mockResolvedValue({ id: "acct-1" });
    const rep = reply();

    await createCustomerAccountHandler(request({ body }), rep);

    // Staff typed these details with the stored ones in front of them, so they overwrite.
    expect(createCustomerAccount).toHaveBeenCalledWith(body, PROGRAM, ORG, undefined, {
      trustedDetails: true,
    });
    expect(answer(rep)).toEqual({ code: 201, body: { id: "acct-1" } });
  });

  test("refuses when the org has no loyalty program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await createCustomerAccountHandler(request({ body }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Loyalty program not found" } });
  });

  test("refuses when the program is not active", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue({ id: PROGRAM, status: "draft" });
    const rep = reply();

    await createCustomerAccountHandler(request({ body }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { error: "Loyalty program is not active" } });
  });

  test("refuses when no org can be resolved at all", async () => {
    const rep = reply();

    await createCustomerAccountHandler(
      request({ user: {}, body: { name: "Ann", phone: "9" } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 400, body: { error: "orgId is required" } });
  });

  test("ignores the org in the request body and uses the session's", async () => {
    (createCustomerAccount as Mock).mockResolvedValue({ id: "acct-1" });

    await createCustomerAccountHandler(
      request({ body: { ...body, orgId: "org-somebody-else" } }),
      reply(),
    );

    expect(getLoyaltyProgramByOrg).toHaveBeenCalledWith(ORG);
    expect((createCustomerAccount as Mock).mock.calls[0][2]).toBe(ORG);
  });

  test("refuses when there is no session to take an org from", async () => {
    const rep = reply();

    await createCustomerAccountHandler(
      { body: { ...body, orgId: "org-target" }, params: {}, query: {} } as any,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 400, body: { error: "orgId is required" } });
    expect(createCustomerAccount).not.toHaveBeenCalled();
  });

  test("the public handler takes the org from the body, as it must", async () => {
    (createCustomerAccount as Mock).mockResolvedValue({ id: "acct-1" });
    const rep = reply();

    await createPublicCustomerAccountHandler(
      { body: { ...body, orgId: "org-target" }, params: {}, query: {} } as any,
      rep,
    );

    expect(answer(rep).code).toBe(201);
    expect((createCustomerAccount as Mock).mock.calls[0][2]).toBe("org-target");
  });

  test("the public handler holds the bonuses and hands over a normalised phone; the staff handler does neither", async () => {
    (createCustomerAccount as Mock).mockResolvedValue({ id: "acct-1" });

    await createPublicCustomerAccountHandler(
      { body: { ...body, phone: "90000 00001" }, params: {} } as any,
      reply(),
    );
    await createCustomerAccountHandler(request({ body }), reply());

    const [publicCall, staffCall] = (createCustomerAccount as Mock).mock.calls;
    expect(publicCall[0]).toMatchObject({ phone: "919000000001" });
    expect(publicCall[4]).toEqual({ holdBonuses: true });
    expect(staffCall[3]).toBeUndefined();
    expect(staffCall[4]).toEqual({ trustedDetails: true });
  });

  test("the public handler refuses a number that is not real for the programme's country", async () => {
    const rep = reply();

    await createPublicCustomerAccountHandler(
      { body: { ...body, phone: "12345" }, params: {} } as any,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 400, body: { error: "Enter a valid mobile number" } });
    expect(createCustomerAccount).not.toHaveBeenCalled();
  });

  test("a filled honeypot is answered as a success that created nothing, before any read", async () => {
    const rep = reply();

    await createPublicCustomerAccountHandler(
      { body: { ...body, website: "https://spam.example" }, params: {}, ip: "203.0.113.9" } as any,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 201, body: { success: true } });
    expect(getLoyaltyProgramByOrg).not.toHaveBeenCalled();
    expect(createCustomerAccount).not.toHaveBeenCalled();
  });

  test("an empty honeypot is clean", async () => {
    (createCustomerAccount as Mock).mockResolvedValue({ id: "acct-1" });
    const rep = reply();

    await createPublicCustomerAccountHandler(
      { body: { ...body, website: "" }, params: {} } as any,
      rep,
    );

    expect(answer(rep).code).toBe(201);
    expect(createCustomerAccount).toHaveBeenCalled();
  });

  test("the public handler refuses a body with no org", async () => {
    const rep = reply();

    await createPublicCustomerAccountHandler(
      { body: { ...body, orgId: undefined }, params: {}, query: {} } as any,
      rep,
    );

    expect(answer(rep)).toEqual({ code: 400, body: { error: "orgId is required" } });
  });

  test("never supplies a sending number, so no welcome message is sent", async () => {
    (createCustomerAccount as Mock).mockResolvedValue({ id: "acct-1" });

    await createCustomerAccountHandler(request({ body }), reply());

    // The fourth argument is the sending number; the staff handler leaves it out.
    expect((createCustomerAccount as Mock).mock.calls[0][3]).toBeUndefined();
  });

  test("leaks the service's raw error text in the 500", async () => {
    (createCustomerAccount as Mock).mockRejectedValue(new Error("Customer account already exists"));
    const rep = reply();

    await createCustomerAccountHandler(request({ body }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Customer account already exists" } });
  });
});

// ===========================================================================
// reads
// ===========================================================================

describe("getCustomerAccountsHandler", () => {
  test("lists the caller's own program", async () => {
    (getCustomerAccounts as Mock).mockResolvedValue([{ id: "acct-1" }]);
    const rep = reply();

    await getCustomerAccountsHandler(request({ query: { search: "ann" } }), rep);

    expect(getCustomerAccounts).toHaveBeenCalledWith(PROGRAM, "ann", undefined);
    expect(answer(rep)).toEqual({ code: 200, body: [{ id: "acct-1" }] });
  });

  test("answers an empty list when the org has no program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await getCustomerAccountsHandler(request(), rep);

    expect(answer(rep)).toEqual({ code: 200, body: [] });
  });
});

describe("searchContactsForEnrolmentHandler", () => {
  test("searches the session's org with the parsed query", async () => {
    (searchContactsForEnrolment as Mock).mockResolvedValue([{ id: "c1" }]);
    const rep = reply();

    await searchContactsForEnrolmentHandler(request({ query: { search: "ann", limit: 5 } }), rep);

    expect(searchContactsForEnrolment).toHaveBeenCalledWith(ORG, { search: "ann", limit: 5 });
    expect(answer(rep)).toEqual({ code: 200, body: [{ id: "c1" }] });
  });

  test("answers 500 with the message when the search fails", async () => {
    (searchContactsForEnrolment as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await searchContactsForEnrolmentHandler(request({ query: { limit: 20 } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "boom" } });
  });
});

describe("getCustomerAccountByIdHandler", () => {
  test("resolves the caller's program and fetches within it", async () => {
    (getCustomerAccountById as Mock).mockResolvedValue({ id: "acct-1" });
    const rep = reply();

    await getCustomerAccountByIdHandler(request({ params: { customerId: "acct-1" } }), rep);

    expect(getLoyaltyProgramByOrg).toHaveBeenCalledWith(ORG);
    expect(getCustomerAccountById).toHaveBeenCalledWith("acct-1", PROGRAM);
    expect(answer(rep).code).toBe(200);
  });

  // Another org's customer answers 404, indistinguishable from one that does not
  // exist — the service scopes the query, so it simply finds nothing.
  test("another org's account is a 404, not a 403", async () => {
    (getCustomerAccountById as Mock).mockResolvedValue(null);
    const rep = reply();

    await getCustomerAccountByIdHandler(request({ params: { customerId: "acct-other-org" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Customer account not found" } });
  });

  test("answers 404 when the account does not exist", async () => {
    (getCustomerAccountById as Mock).mockResolvedValue(null);
    const rep = reply();

    await getCustomerAccountByIdHandler(request({ params: { customerId: "nope" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Customer account not found" } });
  });
});

describe("getCustomerAccountByPhoneHandler", () => {
  interface AccountFixture {
    id: string;
    contactId: string;
    currentPoints: number;
    lifetimePoints: number;
    referralCode: string;
    currentTier: { id: string; name: string } | null;
    contact: { name: string; phone: string; email: string };
    status: string;
    assignedRewards: Array<Record<string, unknown>>;
    redemptions: Array<Record<string, unknown>>;
  }

  const account = (over: Record<string, unknown> = {}) => {
    const base: AccountFixture = {
      id: "acct-1",
      contactId: "contact-1",
      currentPoints: 500,
      lifetimePoints: 900,
      referralCode: "ANN-AB12",
      currentTier: { id: "tier-1", name: "Gold" },
      contact: { name: "Ann", phone: "919000000001", email: "a@b.c" },
      status: "active",
      assignedRewards: [],
      redemptions: [],
    };
    return { ...base, ...over };
  };

  test("answers 404 when the phone has no account", async () => {
    (getCustomerAccountByPhone as Mock).mockResolvedValue(null);
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Customer account not found" } });
  });

  test("returns the customer's balance and codes", async () => {
    (getCustomerAccountByPhone as Mock).mockResolvedValue(account());
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    expect(answer(rep).body.customer).toMatchObject({
      id: "acct-1",
      currentPoints: 500,
      points: 500,
      referralCode: "ANN-AB12",
      name: "Ann",
    });
  });

  test("offers coupons to everyone but assigned rewards only to their holder", async () => {
    (getActiveLoyaltyRewards as Mock).mockResolvedValue([
      { id: "coupon-1", rewardType: "coupon" },
      { id: "assigned-1", rewardType: "assigned" },
      { id: "assigned-2", rewardType: "assigned" },
    ]);
    (getCustomerAccountByPhone as Mock).mockResolvedValue(
      account({ assignedRewards: [{ rewardId: "assigned-1", status: "ISSUED" }] }),
    );
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    expect(answer(rep).body.availableRewards.map((r: any) => r.id)).toEqual([
      "coupon-1",
      "assigned-1",
    ]);
  });

  test("drops an assigned reward the customer already redeemed", async () => {
    (getActiveLoyaltyRewards as Mock).mockResolvedValue([
      { id: "assigned-1", rewardType: "assigned" },
    ]);
    (getCustomerAccountByPhone as Mock).mockResolvedValue(
      account({ assignedRewards: [{ rewardId: "assigned-1", status: "REDEEMED" }] }),
    );
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    expect(answer(rep).body.availableRewards).toEqual([]);
  });

  test("hides a reward restricted to a tier the customer is not in", async () => {
    (getActiveLoyaltyRewards as Mock).mockResolvedValue([
      { id: "coupon-1", rewardType: "coupon", availableForTiers: ["Platinum"] },
    ]);
    (getCustomerAccountByPhone as Mock).mockResolvedValue(account());
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    expect(answer(rep).body.availableRewards).toEqual([]);
  });

  test("matches the tier restriction on the tier's id, and still on its name", async () => {
    (getActiveLoyaltyRewards as Mock).mockResolvedValue([
      { id: "coupon-1", rewardType: "coupon", availableForTiers: ["Gold"] },
      { id: "coupon-2", rewardType: "coupon", availableForTiers: ["tier-1"] },
      { id: "coupon-3", rewardType: "coupon", availableForTiers: ["tier-platinum"] },
    ]);
    (getCustomerAccountByPhone as Mock).mockResolvedValue(account());
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    expect(answer(rep).body.availableRewards.map((r: any) => r.id)).toEqual([
      "coupon-1",
      "coupon-2",
    ]);
  });

  test("lists only unused approved coupons as active", async () => {
    (getCustomerAccountByPhone as Mock).mockResolvedValue(
      account({
        redemptions: [
          { id: "r1", reward: { rewardType: "coupon" }, status: "APPROVED", usedAt: null },
          { id: "r2", reward: { rewardType: "coupon" }, status: "APPROVED", usedAt: new Date() },
          { id: "r3", reward: { rewardType: "coupon" }, status: "PENDING", usedAt: null },
        ],
      }),
    );
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    expect(answer(rep).body.activeCoupons.map((c: any) => c.id)).toEqual(["r1"]);
  });

  test("lists everything still waiting to be handed over, of either kind", async () => {
    const reward = { id: "rwd-1", name: "Free coffee", pointsCost: 500, rewardType: "point" };
    (getCustomerAccountByPhone as Mock).mockResolvedValue(
      account({
        redemptions: [
          {
            id: "r1",
            redemptionCode: "KC-4471",
            reward,
            status: "APPROVED",
            usedAt: null,
            createdAt: new Date("2026-09-01"),
            expiresAt: null,
          },
          {
            id: "r2",
            redemptionCode: "KC-1",
            reward,
            status: "USED",
            usedAt: new Date(),
            createdAt: new Date(),
          },
          {
            id: "r3",
            redemptionCode: "KC-2",
            reward,
            status: "PENDING",
            usedAt: null,
            createdAt: new Date(),
          },
        ],
        assignedRewards: [
          {
            id: "a1",
            rewardId: "rwd-2",
            shortCode: "GIFT1",
            status: "ISSUED",
            assignedAt: new Date("2026-09-02"),
            reward: { ...reward, id: "rwd-2", name: "Birthday brownie", rewardType: "assigned" },
          },
          {
            id: "a2",
            rewardId: "rwd-3",
            shortCode: "GIFT2",
            status: "REDEEMED",
            assignedAt: new Date(),
            reward,
          },
        ],
      }),
    );
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    const body = answer(rep).body;
    expect(body.pendingRedemptions).toEqual([
      expect.objectContaining({
        kind: "redemption",
        id: "r1",
        code: "KC-4471",
        reward: expect.objectContaining({ name: "Free coffee" }),
      }),
      expect.objectContaining({
        kind: "assigned",
        id: "a1",
        code: "GIFT1",
        reward: expect.objectContaining({ name: "Birthday brownie" }),
      }),
    ]);
    expect(body.awaitingApproval.map((r: any) => r.id)).toEqual(["r3"]);
  });

  test("shows the last five visits with what was spent", async () => {
    (getCustomerAccountByPhone as Mock).mockResolvedValue(
      account({
        transactions: Array.from({ length: 7 }, (_, i) => ({
          id: `t${i}`,
          transactionType: "earn",
          source: "purchase",
          points: 10 + i,
          balanceAfter: 100,
          description: null,
          createdAt: new Date(2026, 8, 7 - i),
          metadata: i === 0 ? { purchaseAmount: 340 } : { purchaseAmount: "oops" },
        })),
      }),
    );
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    const visits = answer(rep).body.recentTransactions;
    expect(visits).toHaveLength(5);
    expect(visits[0]).toMatchObject({ id: "t0", points: 10, purchaseAmount: 340 });
    expect(visits[1].purchaseAmount).toBeNull();
  });

  test("works out the next tier from the programme's ladder and the customer's spend", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue({
      id: PROGRAM,
      status: "active",
      tiersEnabled: true,
      currencySymbol: "₹",
      currencyName: "Beans",
      signupBonus: 50,
      tiers: [
        { id: "tier-2", name: "Gold", threshold: "15000", pointsMultiplier: "1.5", color: "#fc0" },
        {
          id: "tier-1",
          name: "Silver",
          threshold: "5000",
          pointsMultiplier: "1.25",
          color: "#ccc",
        },
        { id: "tier-0", name: "Bronze", threshold: "0", pointsMultiplier: "1", color: "#a00" },
      ],
    });
    (getCustomerAccountByPhone as Mock).mockResolvedValue(
      account({
        totalSpend: "13820.00",
        currentTier: {
          id: "tier-1",
          name: "Silver",
          threshold: "5000",
          pointsMultiplier: "1.25",
          color: "#ccc",
        },
      }),
    );
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    const body = answer(rep).body;
    expect(body.tier).toEqual({
      current: {
        id: "tier-1",
        name: "Silver",
        threshold: 5000,
        pointsMultiplier: 1.25,
        color: "#ccc",
      },
      next: { id: "tier-2", name: "Gold", threshold: 15000 },
      amountToNext: 1180,
      // A lifetime ladder: the spend that counts is the lifetime figure.
      qualifyingSpend: 13820,
      qualificationWindowMonths: null,
    });
    expect(body.customer.totalSpend).toBe(13820);
    expect(body.program).toEqual({ currencySymbol: "₹", pointsName: "Beans", signupBonus: 50 });
  });

  test("has no next tier when tiers are switched off", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue({
      id: PROGRAM,
      status: "active",
      tiersEnabled: false,
      tiers: [{ id: "tier-2", name: "Gold", threshold: "15000", pointsMultiplier: "1.5" }],
    });
    (getCustomerAccountByPhone as Mock).mockResolvedValue(account({ totalSpend: "10" }));
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    expect(answer(rep).body.tier.next).toBeNull();
  });
});

// ===========================================================================
// writes
// ===========================================================================

describe("updateCustomerAccountHandler", () => {
  test("passes the path id, the body and the caller's program", async () => {
    (updateCustomerAccount as Mock).mockResolvedValue({ id: "acct-1" });
    const rep = reply();

    await updateCustomerAccountHandler(
      request({ params: { customerId: "acct-1" }, body: { status: "suspended" } }),
      rep,
    );

    expect(updateCustomerAccount).toHaveBeenCalledWith("acct-1", { status: "suspended" }, PROGRAM);
    expect(answer(rep).code).toBe(200);
  });

  test("resolves the caller's program before writing", async () => {
    (updateCustomerAccount as Mock).mockResolvedValue({});

    await updateCustomerAccountHandler(
      request({ params: { customerId: "acct-other-org" }, body: { status: "closed" } }),
      reply(),
    );

    expect(getLoyaltyProgramByOrg).toHaveBeenCalledWith(ORG);
  });

  // The service puts the program in the where clause, so prisma raises P2025 for
  // an account the caller cannot see — answered as 404, not 500.
  test("another org's account answers 404 rather than a server error", async () => {
    (updateCustomerAccount as Mock).mockRejectedValue(
      Object.assign(new Error("Record to update not found"), { code: "P2025" }),
    );
    const rep = reply();

    await updateCustomerAccountHandler(
      request({ params: { customerId: "acct-other-org" }, body: { status: "closed" } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Customer account not found" } });
  });
});

describe("awardPointsHandler", () => {
  test("prices the purchase against the caller's own program", async () => {
    (awardPoints as Mock).mockResolvedValue({ pointsAwarded: 100 });
    const rep = reply();

    await awardPointsHandler(
      request({ body: { contactId: "contact-1", purchaseAmount: 500, channel: "pos" } }),
      rep,
    );

    expect(awardPoints).toHaveBeenCalledWith(
      PROGRAM,
      "contact-1",
      500,
      expect.objectContaining({ channel: "pos" }),
    );
    expect(answer(rep).code).toBe(200);
  });

  test("refuses when the org has no program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await awardPointsHandler(request({ body: { contactId: "c", purchaseAmount: 1 } }), rep);

    expect(answer(rep).code).toBe(404);
  });

  test("reports a failure with the raw message", async () => {
    (awardPoints as Mock).mockRejectedValue(new Error("Customer account not found."));
    const rep = reply();

    await awardPointsHandler(request({ body: { contactId: "c", purchaseAmount: 1 } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Customer account not found." } });
  });
});

describe("assignRewardToCustomerHandler", () => {
  test("assigns from the body, not from the path", async () => {
    (assignRewardToCustomer as Mock).mockResolvedValue({ id: "cr-1" });
    const rep = reply();

    await assignRewardToCustomerHandler(
      request({
        params: { customerId: "acct-in-path" },
        body: { customerId: "acct-in-body", rewardId: "rwd-1" },
      }),
      rep,
    );

    expect(assignRewardToCustomer).toHaveBeenCalledWith("acct-in-body", "rwd-1", undefined);
    expect(answer(rep).code).toBe(201);
  });

  test("reports an existing assignment as a 400", async () => {
    (assignRewardToCustomer as Mock).mockRejectedValue(
      new Error("Reward is already assigned to this customer"),
    );
    const rep = reply();

    await assignRewardToCustomerHandler(request({ body: {} }), rep);

    expect(answer(rep).code).toBe(400);
  });

  test("reports anything else as a 500", async () => {
    (assignRewardToCustomer as Mock).mockRejectedValue(new Error("Reward not found"));
    const rep = reply();

    await assignRewardToCustomerHandler(request({ body: {} }), rep);

    expect(answer(rep).code).toBe(500);
  });
});

describe("short-code handlers", () => {
  test("a lookup passes the caller's org through for the ownership check", async () => {
    (getRewardByShortCode as Mock).mockResolvedValue({ id: "cr-1" });
    const rep = reply();

    await getRewardByShortCodeHandler(request({ params: { shortCode: "SHORT1" } }), rep);

    expect(getRewardByShortCode).toHaveBeenCalledWith("SHORT1", ORG);
    expect(rep.send).toHaveBeenCalledWith({ id: "cr-1" });
  });

  test("a redemption passes the caller's org through as well", async () => {
    (markRewardAsRedeemed as Mock).mockResolvedValue({ id: "cr-1", status: "REDEEMED" });

    await redeemRewardByShortCodeHandler(request({ params: { shortCode: "SHORT1" } }), reply());

    expect(markRewardAsRedeemed).toHaveBeenCalledWith("SHORT1", ORG);
  });

  test("an unknown or foreign short code is a 400", async () => {
    (getRewardByShortCode as Mock).mockRejectedValue(new Error("Reward not found"));
    const rep = reply();

    await getRewardByShortCodeHandler(request({ params: { shortCode: "NOPE" } }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { error: "Reward not found" } });
  });

  test("an already-redeemed code is a 400", async () => {
    (markRewardAsRedeemed as Mock).mockRejectedValue(new Error("Reward is already redeemed"));
    const rep = reply();

    await redeemRewardByShortCodeHandler(request({ params: { shortCode: "SHORT1" } }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { error: "Reward is already redeemed" } });
  });
});

// ===========================================================================
// export
// ===========================================================================

describe("exportCustomerAccountsHandler", () => {
  const customer = (over: Record<string, unknown> = {}) => ({
    contact: { name: "Ann", phone: "919000000001", email: "a@b.c" },
    currentTier: { name: "Gold" },
    currentPoints: 500,
    lifetimePoints: 900,
    referralCode: "ANN-AB12",
    ...over,
  });

  test("refuses when the org has no program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await exportCustomerAccountsHandler(request(), rep);

    expect(answer(rep).code).toBe(404);
  });

  test("defaults to CSV with a header row", async () => {
    (getCustomerAccountsForExport as Mock).mockResolvedValue([customer()]);
    const rep = reply();

    await exportCustomerAccountsHandler(request({ query: {} }), rep);

    expect(rep.header).toHaveBeenCalledWith("Content-Type", "text/csv");
    const csv = rep.send.mock.calls[0][0] as string;
    expect(csv.split("\n")[0]).toBe("Name,Phone,Email,Tier,Points,Lifetime Points,Referral Code");
    expect(csv.split("\n")[1]).toBe("Ann,919000000001,a@b.c,Gold,500,900,ANN-AB12");
  });

  test("labels an untiered customer as N/A", async () => {
    (getCustomerAccountsForExport as Mock).mockResolvedValue([customer({ currentTier: null })]);
    const rep = reply();

    await exportCustomerAccountsHandler(request({ query: {} }), rep);

    expect(rep.send.mock.calls[0][0]).toContain("N/A");
  });

  test("a comma in a customer's name is quoted, keeping the columns aligned", async () => {
    (getCustomerAccountsForExport as Mock).mockResolvedValue([
      customer({ contact: { name: "Smith, Ann", phone: "919000000001", email: "a@b.c" } }),
    ]);
    const rep = reply();

    await exportCustomerAccountsHandler(request({ query: {} }), rep);

    const row = (rep.send.mock.calls[0][0] as string).split("\n")[1];
    expect(row).toBe('"Smith, Ann",919000000001,a@b.c,Gold,500,900,ANN-AB12');
  });

  test("a name beginning with = is neutralised before it reaches the file", async () => {
    (getCustomerAccountsForExport as Mock).mockResolvedValue([
      customer({
        contact: { name: '=HYPERLINK("http://x","click")', phone: "9", email: "" },
      }),
    ]);
    const rep = reply();

    await exportCustomerAccountsHandler(request({ query: {} }), rep);

    const csv = rep.send.mock.calls[0][0] as string;
    expect(csv).toContain('"\'=HYPERLINK(""http://x"",""click"")"');
    expect(csv).not.toContain("\n=HYPERLINK");
  });

  test("builds a workbook when excel is asked for", async () => {
    (getCustomerAccountsForExport as Mock).mockResolvedValue([customer()]);
    const rep = reply();

    await exportCustomerAccountsHandler(request({ query: { format: "excel" } }), rep);

    expect(rep.header).toHaveBeenCalledWith(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(rep.send.mock.calls[0][0]).toBeInstanceOf(Buffer);
  });
});

describe("getCustomerAccountByCardCodeHandler", () => {
  const account = {
    id: "acct-1",
    contactId: "contact-1",
    currentPoints: 500,
    lifetimePoints: 900,
    referralCode: "ANN-AB12",
    cardCode: "ABCDEFGHJKLM",
    cardSentAt: new Date("2026-09-12T10:00:00Z"),
    currentTier: null,
    contact: { name: "Ann", phone: "919000000001", email: "a@b.c" },
    status: "active",
    assignedRewards: [],
    redemptions: [],
  };

  test("normalises the scanned code and scopes the lookup to the caller's programme", async () => {
    (getCustomerAccountByCardCode as Mock).mockResolvedValue(account);
    const rep = reply();

    await getCustomerAccountByCardCodeHandler(
      request({ params: { cardCode: "abcd-efgh-jklm" } }),
      rep,
    );

    expect(getCustomerAccountByCardCode).toHaveBeenCalledWith(PROGRAM, "ABCDEFGHJKLM");
    expect(answer(rep).code).toBe(200);
    expect(answer(rep).body.customer).toMatchObject({
      id: "acct-1",
      phone: "919000000001",
      cardCode: "ABCDEFGHJKLM",
      points: 500,
    });
  });

  test("a code that does not parse is a 404 without touching the database", async () => {
    const rep = reply();

    await getCustomerAccountByCardCodeHandler(
      request({ params: { cardCode: "https://wa.me/919000000000?text=join" } }),
      rep,
    );

    expect(getCustomerAccountByCardCode).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({ code: 404, body: { error: "Card not found" } });
  });

  test("a card from another programme is the same 404", async () => {
    (getCustomerAccountByCardCode as Mock).mockResolvedValue(null);
    const rep = reply();

    await getCustomerAccountByCardCodeHandler(
      request({ params: { cardCode: "ABCDEFGHJKLM" } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Card not found" } });
  });

  test("the phone lookup carries the card fields too", async () => {
    (getCustomerAccountByPhone as Mock).mockResolvedValue(account);
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    expect(answer(rep).body.customer).toMatchObject({
      cardCode: "ABCDEFGHJKLM",
      cardSentAt: account.cardSentAt,
    });
  });
});

describe("sendMemberCardHandler", () => {
  test("sends within the caller's programme and returns the outcome verbatim", async () => {
    (getCustomerAccountById as Mock).mockResolvedValue({ id: "acct-1" });
    const outcome = {
      sent: false,
      skippedReason: "session_closed",
      cardCode: "ABCDEFGHJKLM",
      cardSentAt: null,
    };
    (sendMemberCard as Mock).mockResolvedValue(outcome);
    const rep = reply();

    await sendMemberCardHandler(request({ params: { customerId: "acct-1" } }), rep);

    expect(getCustomerAccountById).toHaveBeenCalledWith("acct-1", PROGRAM);
    expect(sendMemberCard).toHaveBeenCalledWith({ orgId: ORG, accountId: "acct-1" });
    expect(answer(rep)).toEqual({ code: 200, body: outcome });
  });

  test("another org's customer is a 404 and nothing is sent", async () => {
    (getCustomerAccountById as Mock).mockResolvedValue(null);
    const rep = reply();

    await sendMemberCardHandler(request({ params: { customerId: "acct-other" } }), rep);

    expect(sendMemberCard).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({ code: 404, body: { error: "Customer account not found" } });
  });
});
