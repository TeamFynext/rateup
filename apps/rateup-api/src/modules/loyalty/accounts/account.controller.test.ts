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
  getCustomerAccounts: vi.fn(),
  getCustomerAccountsForExport: vi.fn(),
  updateCustomerAccount: vi.fn(),
  assignRewardToCustomer: vi.fn(),
  getRewardByShortCode: vi.fn(),
  markRewardAsRedeemed: vi.fn(),
}));

vi.mock("../program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));
vi.mock("../rewards/reward.service.js", () => ({ getActiveLoyaltyRewards: vi.fn() }));

import {
  assignRewardToCustomer,
  awardPoints,
  createCustomerAccount,
  getCustomerAccountById,
  getCustomerAccountByPhone,
  getCustomerAccounts,
  getCustomerAccountsForExport,
  getRewardByShortCode,
  markRewardAsRedeemed,
  updateCustomerAccount,
} from "./account.service.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";
import { getActiveLoyaltyRewards } from "../rewards/reward.service.js";
import {
  assignRewardToCustomerHandler,
  awardPointsHandler,
  createCustomerAccountHandler,
  exportCustomerAccountsHandler,
  getCustomerAccountByIdHandler,
  getCustomerAccountByPhoneHandler,
  getCustomerAccountsHandler,
  getRewardByShortCodeHandler,
  redeemRewardByShortCodeHandler,
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
  (getLoyaltyProgramByOrg as Mock).mockResolvedValue({ id: PROGRAM, status: "active" });
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

    expect(createCustomerAccount).toHaveBeenCalledWith(body, PROGRAM, ORG);
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

  // NOTE: pins current behaviour, and this is the module's widest exposure.
  // The org is taken from the REQUEST BODY first — `request.body.orgId ||
  // request.user.orgId` — and orgId is a required field on the schema. On the
  // authenticated route that lets any org enrol customers into another org's
  // program. The same handler is also registered unauthenticated at
  // POST /api/public/loyalty/accounts (account.public.route.ts, registered in
  // registerRoutes.ts with no checkSession), so the body org is the ONLY org
  // there. See issues.txt 20.13.
  test("prefers the org in the request body over the session's org", async () => {
    (createCustomerAccount as Mock).mockResolvedValue({ id: "acct-1" });

    await createCustomerAccountHandler(
      request({ body: { ...body, orgId: "org-somebody-else" } }),
      reply(),
    );

    expect(getLoyaltyProgramByOrg).toHaveBeenCalledWith("org-somebody-else");
    expect((createCustomerAccount as Mock).mock.calls[0][2]).toBe("org-somebody-else");
  });

  test("works with no session at all, as the public route invokes it", async () => {
    (createCustomerAccount as Mock).mockResolvedValue({ id: "acct-1" });
    const rep = reply();

    await createCustomerAccountHandler(
      { body: { ...body, orgId: "org-target" }, params: {}, query: {} } as any,
      rep,
    );

    expect(answer(rep).code).toBe(201);
    expect((createCustomerAccount as Mock).mock.calls[0][2]).toBe("org-target");
  });

  // NOTE: the handler passes only three arguments, so `sourceIdentifier` is
  // undefined and the welcome/join-link messages in createCustomerAccount are
  // never sent from either route. See issues.txt 20.13.
  test("never supplies a sending number, so no welcome message is sent", async () => {
    (createCustomerAccount as Mock).mockResolvedValue({ id: "acct-1" });

    await createCustomerAccountHandler(request({ body }), reply());

    expect((createCustomerAccount as Mock).mock.calls[0]).toHaveLength(3);
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

describe("getCustomerAccountByIdHandler", () => {
  // NOTE: the only handler in this file that never resolves the caller's
  // program — the path id goes straight to the service. The reply includes the
  // account's points, tier, transaction history and redemptions.
  // See issues.txt 20.18.
  test("fetches by the path id alone, without resolving the caller's program", async () => {
    (getCustomerAccountById as Mock).mockResolvedValue({ id: "acct-other-org" });
    const rep = reply();

    await getCustomerAccountByIdHandler(request({ params: { customerId: "acct-other-org" } }), rep);

    expect(getLoyaltyProgramByOrg).not.toHaveBeenCalled();
    expect(getCustomerAccountById).toHaveBeenCalledWith("acct-other-org");
    expect(answer(rep).code).toBe(200);
  });

  test("answers 404 when the account does not exist", async () => {
    (getCustomerAccountById as Mock).mockResolvedValue(null);
    const rep = reply();

    await getCustomerAccountByIdHandler(request({ params: { customerId: "nope" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Customer account not found" } });
  });
});

describe("getCustomerAccountByPhoneHandler", () => {
  const account = (over: Record<string, unknown> = {}) => ({
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
    ...over,
  });

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

  // NOTE: here the tier gate compares against the tier's NAME, while the
  // redemption validator's tier gate compares against its ID (issues.txt 20.6).
  // The same reward is filtered by two different keys depending on which path
  // the customer takes. See issues.txt 20.23.
  test("matches the tier restriction on the tier's name, not its id", async () => {
    (getActiveLoyaltyRewards as Mock).mockResolvedValue([
      { id: "coupon-1", rewardType: "coupon", availableForTiers: ["Gold"] },
      { id: "coupon-2", rewardType: "coupon", availableForTiers: ["tier-1"] },
    ]);
    (getCustomerAccountByPhone as Mock).mockResolvedValue(account());
    const rep = reply();

    await getCustomerAccountByPhoneHandler(
      request({ params: { phoneNumber: "919000000001" } }),
      rep,
    );

    expect(answer(rep).body.availableRewards.map((r: any) => r.id)).toEqual(["coupon-1"]);
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
});

// ===========================================================================
// writes
// ===========================================================================

describe("updateCustomerAccountHandler", () => {
  test("passes the path id and the body straight through", async () => {
    (updateCustomerAccount as Mock).mockResolvedValue({ id: "acct-1" });
    const rep = reply();

    await updateCustomerAccountHandler(
      request({ params: { customerId: "acct-1" }, body: { status: "suspended" } }),
      rep,
    );

    expect(updateCustomerAccount).toHaveBeenCalledWith("acct-1", { status: "suspended" });
    expect(answer(rep).code).toBe(200);
  });

  test("resolves no program, so nothing ties the account to the caller", async () => {
    (updateCustomerAccount as Mock).mockResolvedValue({});

    await updateCustomerAccountHandler(
      request({ params: { customerId: "acct-other-org" }, body: { status: "closed" } }),
      reply(),
    );

    expect(getLoyaltyProgramByOrg).not.toHaveBeenCalled();
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

  // NOTE: pins current behaviour. The CSV is built with a bare
  // `row.join(",")` — no quoting and no escaping. A customer whose name contains
  // a comma shifts every later column on that row, so tier, points and referral
  // code all land in the wrong place. Names come from the signup form, which is
  // reachable unauthenticated (issues.txt 20.13). See issues.txt 20.24.
  test("a comma in a customer's name breaks the column alignment", async () => {
    (getCustomerAccountsForExport as Mock).mockResolvedValue([
      customer({ contact: { name: "Smith, Ann", phone: "919000000001", email: "a@b.c" } }),
    ]);
    const rep = reply();

    await exportCustomerAccountsHandler(request({ query: {} }), rep);

    const row = (rep.send.mock.calls[0][0] as string).split("\n")[1];
    expect(row).toBe("Smith, Ann,919000000001,a@b.c,Gold,500,900,ANN-AB12");
    expect(row.split(",")).toHaveLength(8); // one more field than the header
  });

  // NOTE: an unescaped leading `=` makes the cell a formula when the file is
  // opened in Excel or Sheets. See issues.txt 20.24.
  test("a name beginning with = is written into the CSV verbatim", async () => {
    (getCustomerAccountsForExport as Mock).mockResolvedValue([
      customer({
        contact: { name: '=HYPERLINK("http://x","click")', phone: "9", email: "" },
      }),
    ]);
    const rep = reply();

    await exportCustomerAccountsHandler(request({ query: {} }), rep);

    expect(rep.send.mock.calls[0][0]).toContain('=HYPERLINK("http://x","click")');
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
