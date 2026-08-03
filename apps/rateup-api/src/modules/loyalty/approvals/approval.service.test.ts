import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    approvalRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    customerLoyaltyAccount: { findUnique: vi.fn(), update: vi.fn() },
    loyaltyRedemption: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    loyaltyTransaction: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../loyaltyWaDispatcher.js", () => ({ dispatchLoyaltyNotification: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { dispatchLoyaltyNotification } from "../loyaltyWaDispatcher.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import {
  approveApprovalRequest,
  cancelApprovalRequest,
  createApprovalRequest,
  expirePendingRequests,
  getApprovalRequestById,
  getApprovalRequests,
  rejectApprovalRequest,
} from "./approval.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  approvalRequest: Record<string, Mock>;
  customerLoyaltyAccount: Record<string, Mock>;
  loyaltyRedemption: Record<string, Mock>;
  loyaltyTransaction: Record<string, Mock>;
  $transaction: Mock;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const PROGRAM = "prog-1";

interface ApprovalFixture {
  id: string;
  status: string;
  requestType: string;
  accountId: string;
  redemptionId: string | null;
  points: number | null;
  reason: string | null;
  requestData: Record<string, unknown>;
  expiresAt: Date | null;
  account: { contact: { name: string; phone: string; orgId: string } };
}

function approval(over: Record<string, unknown> = {}) {
  const base: ApprovalFixture = {
    id: "apr-1",
    status: "PENDING",
    requestType: "REWARD_REDEMPTION",
    accountId: "acct-1",
    redemptionId: "red-1",
    points: null,
    reason: "Customer asked",
    requestData: {},
    expiresAt: null,
    account: { contact: { name: "Ann", phone: "919000000001", orgId: ORG } },
  };
  return { ...base, ...over };
}

function tx() {
  return {
    approvalRequest: db.approvalRequest,
    customerLoyaltyAccount: db.customerLoyaltyAccount,
    loyaltyRedemption: db.loyaltyRedemption,
    loyaltyTransaction: db.loyaltyTransaction,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((fn: any) => (typeof fn === "function" ? fn(tx()) : fn));
  db.approvalRequest.create.mockResolvedValue({ id: "apr-1" });
  db.approvalRequest.findUnique.mockResolvedValue(approval());
  db.approvalRequest.findMany.mockResolvedValue([]);
  db.approvalRequest.update.mockResolvedValue({ id: "apr-1", status: "APPROVED" });
  db.approvalRequest.updateMany.mockResolvedValue({ count: 0 });
  db.approvalRequest.count.mockResolvedValue(0);
  db.customerLoyaltyAccount.findUnique.mockResolvedValue({
    id: "acct-1",
    programId: PROGRAM,
    currentPoints: 500,
    lifetimePoints: 900,
    currentTier: { id: "tier-1", name: "Bronze" },
  });
  db.customerLoyaltyAccount.update.mockResolvedValue({
    id: "acct-1",
    lifetimePoints: 900,
    currentTier: { id: "tier-2", name: "Silver" },
  });
  db.loyaltyRedemption.findUnique.mockResolvedValue({
    id: "red-1",
    redemptionCode: "RU-ABC123",
    reward: { id: "rwd-1", name: "Free coffee", pointsCost: 100, waTemplateId: null },
  });
  db.loyaltyRedemption.update.mockResolvedValue({});
  db.loyaltyRedemption.updateMany.mockResolvedValue({ count: 0 });
  db.loyaltyTransaction.create.mockResolvedValue({ id: "txn-1" });
});

// ===========================================================================
// create / read
// ===========================================================================

describe("createApprovalRequest", () => {
  test("defaults the requester type to CUSTOMER and the payload to an empty object", async () => {
    await createApprovalRequest({
      requestType: "POINTS_ADJUSTMENT",
      accountId: "acct-1",
      points: 100,
    } as any);

    expect(db.approvalRequest.create.mock.calls[0][0].data).toMatchObject({
      requestedByType: "CUSTOMER",
      requestData: {},
      expiresAt: null,
    });
  });

  test("parses a supplied expiry", async () => {
    await createApprovalRequest({
      requestType: "POINTS_ADJUSTMENT",
      accountId: "acct-1",
      expiresAt: "2026-12-31T00:00:00.000Z",
    } as any);

    expect(db.approvalRequest.create.mock.calls[0][0].data.expiresAt).toEqual(
      new Date("2026-12-31T00:00:00.000Z"),
    );
  });
});

describe("getApprovalRequests", () => {
  test("scopes the list through the account's program", async () => {
    await getApprovalRequests(PROGRAM, {} as any);

    expect(db.approvalRequest.findMany.mock.calls[0][0].where).toEqual({
      account: { programId: PROGRAM },
    });
  });

  test("filters by request type and account", async () => {
    await getApprovalRequests(PROGRAM, {
      requestType: "REWARD_REDEMPTION",
      accountId: "acct-1",
    } as any);

    expect(db.approvalRequest.findMany.mock.calls[0][0].where).toMatchObject({
      requestType: "REWARD_REDEMPTION",
      accountId: "acct-1",
    });
  });

  test("builds a date range from either bound", async () => {
    await getApprovalRequests(PROGRAM, { fromDate: "2026-01-01" } as any);

    expect(db.approvalRequest.findMany.mock.calls[0][0].where.createdAt).toEqual({
      gte: new Date("2026-01-01"),
    });
  });

  // NOTE: pins current behaviour. The `status` filter is commented out in the
  // source, so an approvals queue cannot be narrowed to PENDING — every reviewed,
  // rejected and expired request comes back with the live ones.
  // See issues.txt 20.25.
  test("cannot filter by status at all", async () => {
    await getApprovalRequests(PROGRAM, { status: "PENDING" } as any);

    expect(db.approvalRequest.findMany.mock.calls[0][0].where).not.toHaveProperty("status");
  });

  test("counts and lists with the same condition", async () => {
    await getApprovalRequests(PROGRAM, { requestType: "TIER_OVERRIDE" } as any);

    expect(db.approvalRequest.count.mock.calls[0][0].where).toEqual(
      db.approvalRequest.findMany.mock.calls[0][0].where,
    );
  });

  test("pages one-based, like the transactions list", async () => {
    await getApprovalRequests(PROGRAM, { page: 2, limit: 10 } as any);

    expect(db.approvalRequest.findMany.mock.calls[0][0]).toMatchObject({ skip: 10, take: 10 });
  });
});

describe("getApprovalRequestById", () => {
  test("returns the request with its account, redemption and transaction", async () => {
    const res = await getApprovalRequestById("apr-1");

    expect(res.id).toBe("apr-1");
    expect(db.approvalRequest.findUnique.mock.calls[0][0].include).toHaveProperty("redemption");
  });

  test("throws for an id that matches nothing", async () => {
    db.approvalRequest.findUnique.mockResolvedValue(null);

    await expect(getApprovalRequestById("nope")).rejects.toThrow("Approval request not found");
  });

  // NOTE: the lookup is by id alone, and every mutating entry point in this file
  // (approve, reject, cancel) goes through it. Nothing compares the request's
  // program or org against the reviewer's. See issues.txt 20.26.
  test("resolves an approval id with no program or org restriction", async () => {
    await getApprovalRequestById("apr-from-another-org");

    expect(db.approvalRequest.findUnique.mock.calls[0][0].where).toEqual({
      id: "apr-from-another-org",
    });
  });
});

// ===========================================================================
// approve — redemption
// ===========================================================================

describe("approveApprovalRequest — redemptions", () => {
  const input = { approvalId: "apr-1", reviewerId: "user-1", reviewerName: "Reviewer" } as any;

  test("refuses a request that is not pending", async () => {
    db.approvalRequest.findUnique.mockResolvedValue(approval({ status: "APPROVED" }));

    await expect(approveApprovalRequest(input)).rejects.toThrow(
      "Approval request is not pending (current status: APPROVED)",
    );
  });

  test("refuses a request that has expired", async () => {
    db.approvalRequest.findUnique.mockResolvedValue(
      approval({ expiresAt: new Date("2020-01-01T00:00:00.000Z") }),
    );

    await expect(approveApprovalRequest(input)).rejects.toThrow("Approval request has expired");
  });

  test("refuses an unknown request type", async () => {
    db.approvalRequest.findUnique.mockResolvedValue(approval({ requestType: "SOMETHING_ELSE" }));

    await expect(approveApprovalRequest(input)).rejects.toThrow(
      "Unknown approval request type: SOMETHING_ELSE",
    );
  });

  test("refuses when the customer can no longer afford the reward", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({
      id: "acct-1",
      programId: PROGRAM,
      currentPoints: 50,
    });

    await expect(approveApprovalRequest(input)).rejects.toThrow(
      "Customer does not have enough points",
    );
  });

  test("deducts the points, links the ledger row and approves the redemption", async () => {
    await approveApprovalRequest(input);

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      points: -100,
      balanceAfter: 400,
      source: "redemption",
      referenceId: "red-1",
    });
    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { decrement: 100 },
    });
    expect(db.loyaltyRedemption.update.mock.calls[0][0].data).toEqual({
      status: "APPROVED",
      transactionId: "txn-1",
    });
  });

  // Unlike the redemption service, the approvals path does wrap its writes.
  test("does the whole approval inside one transaction", async () => {
    await approveApprovalRequest(input);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  // NOTE: pins current behaviour. This path writes `transactionType: "REDEEM"`
  // while redeemReward writes `"redeem"` and awardPoints writes `"earn"`. The
  // transactions list filters on an exact string match, so filtering the ledger
  // by type silently returns only half the rows. See issues.txt 20.27.
  test("writes the transaction type in a different case from the redemption service", async () => {
    await approveApprovalRequest(input);

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data.transactionType).toBe("REDEEM");
  });

  test("tells the customer their redemption went through", async () => {
    await approveApprovalRequest(input);

    expect(dispatchLoyaltyNotification).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.REWARD_REDEEMED,
      expect.objectContaining({ redemptionCode: "RU-ABC123", points: -100, balanceAfter: 400 }),
    );
  });

  test("refuses when the redemption behind the request has gone", async () => {
    db.loyaltyRedemption.findUnique.mockResolvedValue(null);

    await expect(approveApprovalRequest(input)).rejects.toThrow("Redemption not found");
  });
});

// ===========================================================================
// approve — the other request types
// ===========================================================================

describe("approveApprovalRequest — points adjustments", () => {
  const input = { approvalId: "apr-1", reviewerId: "user-1" } as any;

  beforeEach(() => {
    db.approvalRequest.findUnique.mockResolvedValue(
      approval({ requestType: "POINTS_ADJUSTMENT", points: 250, redemptionId: null }),
    );
  });

  test("credits both balances for an addition", async () => {
    await approveApprovalRequest(input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { increment: 250 },
      lifetimePoints: { increment: 250 },
    });
  });

  // A deduction deliberately leaves lifetimePoints alone — it is a lifetime total.
  test("a deduction moves the balance but not the lifetime total", async () => {
    db.approvalRequest.findUnique.mockResolvedValue(
      approval({ requestType: "POINTS_ADJUSTMENT", points: -100, redemptionId: null }),
    );

    await approveApprovalRequest(input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      currentPoints: { decrement: 100 },
    });
  });

  test("refuses a deduction the customer cannot cover", async () => {
    db.approvalRequest.findUnique.mockResolvedValue(
      approval({ requestType: "POINTS_ADJUSTMENT", points: -9999, redemptionId: null }),
    );

    await expect(approveApprovalRequest(input)).rejects.toThrow(
      "Customer does not have enough points",
    );
  });

  test("records the adjustment with the approver in its metadata", async () => {
    await approveApprovalRequest({ ...input, reviewerName: "Reviewer" });

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      transactionType: "ADJUST",
      points: 250,
      balanceAfter: 750,
      source: "manual_adjustment",
      metadata: expect.objectContaining({ approverName: "Reviewer", adjustmentType: "addition" }),
    });
  });

  test("tells the customer their balance moved", async () => {
    await approveApprovalRequest(input);

    expect(dispatchLoyaltyNotification).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.POINTS_ADJUSTED,
      expect.objectContaining({ points: 250, balanceAfter: 750 }),
    );
  });
});

describe("approveApprovalRequest — tier overrides", () => {
  const input = { approvalId: "apr-1", reviewerId: "user-1" } as any;

  beforeEach(() => {
    db.approvalRequest.findUnique.mockResolvedValue(
      approval({
        requestType: "TIER_OVERRIDE",
        redemptionId: null,
        requestData: { newTierId: "tier-2" },
      }),
    );
  });

  test("moves the account onto the requested tier", async () => {
    await approveApprovalRequest(input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0]).toMatchObject({
      where: { id: "acct-1" },
      data: { currentTierId: "tier-2" },
    });
  });

  // NOTE: pins current behaviour. The notification sends the new tier's ID where
  // the old tier's NAME is sent, so the customer's WhatsApp message reads
  // "upgraded from Bronze to tier-2". See issues.txt 20.28.
  test("announces the new tier by its id and the old one by its name", async () => {
    await approveApprovalRequest(input);

    expect(dispatchLoyaltyNotification).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.TIER_UPGRADED,
      expect.objectContaining({ newTier: "tier-2", oldTier: "Silver" }),
    );
  });
});

describe("approveApprovalRequest — account status", () => {
  const input = { approvalId: "apr-1", reviewerId: "user-1" } as any;

  // NOTE: pins current behaviour. These two write "SUSPENDED" / "ACTIVE" in
  // upper case, while the update endpoint's schema only accepts lower-case
  // values and createCustomerAccount tests for the lower-case "inactive". An
  // account suspended through an approval therefore cannot be matched by the
  // reactivation path. See issues.txt 20.27.
  test("suspends with an upper-case status", async () => {
    db.approvalRequest.findUnique.mockResolvedValue(
      approval({ requestType: "ACCOUNT_SUSPENSION", redemptionId: null }),
    );

    await approveApprovalRequest(input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({
      status: "SUSPENDED",
    });
  });

  test("reactivates with an upper-case status", async () => {
    db.approvalRequest.findUnique.mockResolvedValue(
      approval({ requestType: "ACCOUNT_REACTIVATION", redemptionId: null }),
    );

    await approveApprovalRequest(input);

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).toEqual({ status: "ACTIVE" });
  });

  // NOTE: the bulk branch marks the request approved and does nothing else — the
  // comment says the processing "would be triggered separately", and nothing in
  // the module triggers it. See issues.txt 20.25.
  test("a bulk operation is approved but never carried out", async () => {
    db.approvalRequest.findUnique.mockResolvedValue(
      approval({ requestType: "BULK_OPERATION", redemptionId: null }),
    );

    await approveApprovalRequest(input);

    expect(db.approvalRequest.update.mock.calls[0][0].data.status).toBe("APPROVED");
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// reject / cancel / expire
// ===========================================================================

describe("rejectApprovalRequest", () => {
  const input = { approvalId: "apr-1", reviewerId: "user-1", reason: "Not eligible" } as any;

  test("refuses a request that is not pending", async () => {
    db.approvalRequest.findUnique.mockResolvedValue(approval({ status: "REJECTED" }));

    await expect(rejectApprovalRequest(input)).rejects.toThrow("Approval request is not pending");
  });

  test("records the reviewer and the reason", async () => {
    await rejectApprovalRequest(input);

    expect(db.approvalRequest.update.mock.calls[0][0].data).toMatchObject({
      status: "REJECTED",
      reviewedBy: "user-1",
      reviewNotes: "Not eligible",
    });
  });

  test("rejects the redemption behind it too", async () => {
    await rejectApprovalRequest(input);

    expect(db.loyaltyRedemption.update).toHaveBeenCalledWith({
      where: { id: "red-1" },
      data: { status: "REJECTED" },
    });
  });

  test("touches no redemption when the request is not about one", async () => {
    db.approvalRequest.findUnique.mockResolvedValue(
      approval({ requestType: "POINTS_ADJUSTMENT", redemptionId: null }),
    );

    await rejectApprovalRequest(input);

    expect(db.loyaltyRedemption.update).not.toHaveBeenCalled();
  });

  // NOTE: a rejected redemption is never refunded here — but nothing was
  // deducted either, because the points are only taken at approval time. The
  // exception is the regular-reward path, which deducts BEFORE approval when
  // approval is not required (issues.txt 20.19).
  test("does not move any points when rejecting", async () => {
    await rejectApprovalRequest(input);

    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
  });
});

describe("cancelApprovalRequest", () => {
  const input = { approvalId: "apr-1", reason: "Customer changed their mind" } as any;

  test("refuses a request that is not pending", async () => {
    db.approvalRequest.findUnique.mockResolvedValue(approval({ status: "CANCELLED" }));

    await expect(cancelApprovalRequest(input)).rejects.toThrow("Approval request is not pending");
  });

  test("cancels the request and its redemption together", async () => {
    await cancelApprovalRequest(input);

    expect(db.approvalRequest.update.mock.calls[0][0].data).toMatchObject({
      status: "CANCELLED",
      reviewNotes: "Customer changed their mind",
    });
    expect(db.loyaltyRedemption.update).toHaveBeenCalledWith({
      where: { id: "red-1" },
      data: { status: "CANCELLED" },
    });
  });

  // NOTE: unlike reject, cancel records no reviewer and no reviewedAt, so the
  // audit trail cannot say who cancelled a request or when.
  // See issues.txt 20.25.
  test("records neither who cancelled it nor when", async () => {
    await cancelApprovalRequest(input);

    const data = db.approvalRequest.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("reviewedBy");
    expect(data).not.toHaveProperty("reviewedAt");
  });
});

describe("expirePendingRequests", () => {
  test("expires nothing when nothing is due", async () => {
    expect(await expirePendingRequests()).toEqual({ expired: 0 });
    expect(db.loyaltyRedemption.updateMany).not.toHaveBeenCalled();
  });

  test("finds only pending requests whose expiry has passed", async () => {
    await expirePendingRequests();

    const where = db.approvalRequest.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("PENDING");
    expect(where.expiresAt.lte).toBeInstanceOf(Date);
  });

  test("expires the requests and their redemptions together", async () => {
    db.approvalRequest.findMany.mockResolvedValue([
      { id: "apr-1", redemptionId: "red-1" },
      { id: "apr-2", redemptionId: null },
    ]);

    expect(await expirePendingRequests()).toEqual({ expired: 2 });
    expect(db.approvalRequest.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["apr-1", "apr-2"] } },
      data: { status: "EXPIRED" },
    });
    expect(db.loyaltyRedemption.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["red-1"] } },
      data: { status: "EXPIRED" },
    });
  });

  test("runs the whole sweep in one transaction", async () => {
    await expirePendingRequests();

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
});
