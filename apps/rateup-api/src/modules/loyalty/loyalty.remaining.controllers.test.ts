import { beforeEach, describe, expect, test, vi } from "vitest";

// The redemption, approval and settings controllers.
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./program/program.service.js", () => ({ getLoyaltyProgramByOrg: vi.fn() }));

vi.mock("./redemptions/redemption.service.js", () => ({
  applyRedemption: vi.fn(),
  getRedemptionsByCustomer: vi.fn(),
  getTransactions: vi.fn(),
  getTransactionsForExport: vi.fn(),
  redeemReward: vi.fn(),
  verifyRedemption: vi.fn(),
}));

vi.mock("./approvals/approval.service.js", () => ({
  approveApprovalRequest: vi.fn(),
  cancelApprovalRequest: vi.fn(),
  createApprovalRequest: vi.fn(),
  getApprovalRequestById: vi.fn(),
  getApprovalRequests: vi.fn(),
  rejectApprovalRequest: vi.fn(),
}));

vi.mock("./settings/settings.service.js", () => ({
  createEventTrigger: vi.fn(),
  createLoyaltyWaCommand: vi.fn(),
  deleteEventTrigger: vi.fn(),
  deleteLoyaltyWaCommandById: vi.fn(),
  getAllEventTriggers: vi.fn(),
  getAllLoyaltyWaCommands: vi.fn(),
  getEventTrigger: vi.fn(),
  getLoyaltyWaCommand: vi.fn(),
  updateEventTrigger: vi.fn(),
  updateLoyaltyWaCommand: vi.fn(),
}));

vi.mock("../whatsapp/automatedReply/wa_automatedReply.service.js", () => ({
  getWaAutomatedReplyByRequestMessage: vi.fn(),
}));

import { getLoyaltyProgramByOrg } from "./program/program.service.js";
import {
  applyRedemption,
  getRedemptionsByCustomer,
  getTransactions,
  getTransactionsForExport,
  redeemReward,
  verifyRedemption,
} from "./redemptions/redemption.service.js";
import {
  approveApprovalRequest,
  cancelApprovalRequest,
  createApprovalRequest,
  getApprovalRequestById,
  getApprovalRequests,
  rejectApprovalRequest,
} from "./approvals/approval.service.js";
import {
  createEventTrigger,
  createLoyaltyWaCommand,
  deleteEventTrigger,
  getAllEventTriggers,
  getAllLoyaltyWaCommands,
  getEventTrigger,
  getLoyaltyWaCommand,
  updateEventTrigger,
  updateLoyaltyWaCommand,
} from "./settings/settings.service.js";

import {
  applyRedemptionHandler,
  getRedemptionsByCustomerHandler,
  getTransactionsHandler,
  redeemRewardHandler,
  verifyRedemptionHandler,
} from "./redemptions/redemption.controller.js";
import {
  approveApprovalRequestHandler,
  cancelApprovalRequestHandler,
  createApprovalRequestHandler,
  getApprovalRequestByIdHandler,
  getApprovalRequestsHandler,
  rejectApprovalRequestHandler,
} from "./approvals/approval.controller.js";
import {
  createEventTriggerHandler,
  createLoyaltyTemplateHandler,
  deleteEventTriggerHandler,
  getAllEventTriggersHandler,
  getAllLoyaltyTemplateHandler,
  getEventTriggerHandler,
  getLoyaltyTemplateHandler,
  updateEventTriggerHandler,
  updateLoyaltyTemplateHandler,
} from "./settings/settings.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-4111-8111-111111111111";
const PROGRAM = "prog-1";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep), header: vi.fn(() => rep) };
  return rep;
}

function request(over: Record<string, unknown> = {}): any {
  return { user: { orgId: ORG }, userId: "user-1", params: {}, query: {}, body: {}, ...over };
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  (getLoyaltyProgramByOrg as Mock).mockResolvedValue({ id: PROGRAM });
  (redeemReward as Mock).mockResolvedValue({ message: "ok" });
  (verifyRedemption as Mock).mockResolvedValue({ valid: true });
  (applyRedemption as Mock).mockResolvedValue({ id: "red-1" });
  (getRedemptionsByCustomer as Mock).mockResolvedValue([]);
  (getTransactions as Mock).mockResolvedValue({ transactions: [], pagination: {} });
  (getTransactionsForExport as Mock).mockResolvedValue([]);
  (createApprovalRequest as Mock).mockResolvedValue({ id: "apr-1" });
  (getApprovalRequests as Mock).mockResolvedValue({ approvals: [] });
  (getApprovalRequestById as Mock).mockResolvedValue({ id: "apr-1" });
  (approveApprovalRequest as Mock).mockResolvedValue({ id: "apr-1" });
  (rejectApprovalRequest as Mock).mockResolvedValue({ id: "apr-1" });
  (cancelApprovalRequest as Mock).mockResolvedValue({ id: "apr-1" });
  (createLoyaltyWaCommand as Mock).mockResolvedValue({ id: "cmd-1" });
  (updateLoyaltyWaCommand as Mock).mockResolvedValue({ id: "cmd-1" });
  (getLoyaltyWaCommand as Mock).mockResolvedValue({ id: "cmd-1" });
  (getAllLoyaltyWaCommands as Mock).mockResolvedValue([]);
  (createEventTrigger as Mock).mockResolvedValue({ id: "trg-1" });
  (updateEventTrigger as Mock).mockResolvedValue({ id: "trg-1" });
  (getEventTrigger as Mock).mockResolvedValue({ id: "trg-1" });
  (getAllEventTriggers as Mock).mockResolvedValue([]);
  (deleteEventTrigger as Mock).mockResolvedValue({ id: "trg-1" });
});

// ===========================================================================
// redemptions
// ===========================================================================

describe("the redemption controller", () => {
  test("redeems against the caller's own program", async () => {
    const rep = reply();

    await redeemRewardHandler(request({ body: { customerId: "acct-1", rewardId: "rwd-1" } }), rep);

    expect(redeemReward).toHaveBeenCalledWith(PROGRAM, { customerId: "acct-1", rewardId: "rwd-1" });
    expect(answer(rep).code).toBe(200);
  });

  test("refuses when the org has no program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await redeemRewardHandler(request({ body: {} }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Loyalty program not found" } });
  });

  test("reports an already-redeemed reward only when that is the constraint that failed", async () => {
    (redeemReward as Mock).mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
        meta: { target: ["rewardId", "accountId"] },
      }),
    );
    const rep = reply();

    await redeemRewardHandler(request({ body: {} }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { error: "Reward already redeemed" } });
  });

  test("reports a code collision as a collision, not as an already-taken reward", async () => {
    (redeemReward as Mock).mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
        meta: { target: ["redemptionCode"] },
      }),
    );
    const rep = reply();

    await redeemRewardHandler(request({ body: {} }), rep);

    const res = answer(rep);
    expect(res.code).toBe(409);
    expect(res.body.error).toContain("code collision");
  });

  test("a P2002 with no target at all is not read as an already-taken reward", async () => {
    (redeemReward as Mock).mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );
    const rep = reply();

    await redeemRewardHandler(request({ body: {} }), rep);

    expect(answer(rep).code).toBe(409);
  });

  test("passes any other failure through with its message", async () => {
    (redeemReward as Mock).mockRejectedValue(
      new Error("Insufficient points. Required: 100, Available: 50"),
    );
    const rep = reply();

    await redeemRewardHandler(request({ body: {} }), rep);

    expect(answer(rep)).toEqual({
      code: 500,
      body: { error: "Insufficient points. Required: 100, Available: 50" },
    });
  });

  test("verify, apply and the customer list all carry the caller's org", async () => {
    await verifyRedemptionHandler(request({ body: { redemptionCode: "RU-ABC123" } }), reply());
    await applyRedemptionHandler(
      request({ body: { redemptionCode: "RU-ABC123", appliedBy: "cashier-1" } }),
      reply(),
    );
    await getRedemptionsByCustomerHandler(request({ params: { customerId: "acct-1" } }), reply());

    expect(verifyRedemption).toHaveBeenCalledWith("RU-ABC123", ORG);
    expect(applyRedemption).toHaveBeenCalledWith(
      { redemptionCode: "RU-ABC123", appliedBy: "cashier-1" },
      ORG,
    );
    expect(getRedemptionsByCustomer).toHaveBeenCalledWith("acct-1", ORG);
  });

  test("lists transactions for the caller's program with the query's filters", async () => {
    const rep = reply();

    await getTransactionsHandler(
      request({ query: { source: "purchase", page: 2, limit: 10 } }),
      rep,
    );

    expect((getTransactions as Mock).mock.calls[0][0]).toBe(PROGRAM);
    expect((getTransactions as Mock).mock.calls[0][1]).toMatchObject({
      source: "purchase",
      page: 2,
      limit: 10,
    });
  });

  test("answers an empty array when the org has no program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await getTransactionsHandler(request({ query: {} }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: [] });
  });

  test("switches to the unpaginated reader for an export", async () => {
    const rep = reply();

    await getTransactionsHandler(request({ query: { export: "csv" } }), rep);

    expect(getTransactionsForExport).toHaveBeenCalled();
    expect(getTransactions).not.toHaveBeenCalled();
  });

  test("a csv export carries a header row", async () => {
    (getTransactionsForExport as Mock).mockResolvedValue([
      {
        id: "txn-1",
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
        transactionType: "earn",
        source: "purchase",
        points: 100,
        balanceAfter: 600,
        description: "Purchase",
        account: { contact: { name: "Ann", phone: "919000000001" } },
      },
    ]);
    const rep = reply();

    await getTransactionsHandler(request({ query: { export: "csv" } }), rep);

    const csv = rep.send.mock.calls[0][0] as string;
    expect(csv.split("\n")[0]).toBe(
      "Transaction ID,Date,Customer Name,Customer Phone,Type,Source,Points,Balance After,Description",
    );
    expect(rep.header).toHaveBeenCalledWith("Content-Type", "text/csv");
  });

  test("a comma in a description breaks the csv column alignment", async () => {
    (getTransactionsForExport as Mock).mockResolvedValue([
      {
        id: "txn-1",
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
        transactionType: "earn",
        source: "purchase",
        points: 100,
        balanceAfter: 600,
        description: "Refund, partial",
        account: { contact: { name: "Ann", phone: "919000000001" } },
      },
    ]);
    const rep = reply();

    await getTransactionsHandler(request({ query: { export: "csv" } }), rep);

    const row = (rep.send.mock.calls[0][0] as string).split("\n")[1];
    expect(row.split(",")).toHaveLength(10); // one more field than the header
  });

  test("labels a missing customer as N/A rather than blank", async () => {
    (getTransactionsForExport as Mock).mockResolvedValue([
      {
        id: "txn-1",
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
        transactionType: "earn",
        source: "purchase",
        points: 100,
        balanceAfter: 600,
        description: null,
        account: { contact: null },
      },
    ]);
    const rep = reply();

    await getTransactionsHandler(request({ query: { export: "csv" } }), rep);

    expect(rep.send.mock.calls[0][0]).toContain("N/A,N/A");
  });
});

// ===========================================================================
// approvals
// ===========================================================================

describe("the approval controller", () => {
  test("creates a request after resolving the caller's program", async () => {
    const rep = reply();

    await createApprovalRequestHandler(
      request({ body: { requestType: "POINTS_ADJUSTMENT", accountId: "acct-1", points: 50 } }),
      rep,
    );

    expect(getLoyaltyProgramByOrg).toHaveBeenCalledWith(ORG);
    expect(answer(rep).code).toBe(201);
  });

  test("refuses to create when the org has no program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await createApprovalRequestHandler(request({ body: {} }), rep);

    expect(answer(rep).code).toBe(404);
  });

  test("lists the caller's own program's requests", async () => {
    const rep = reply();

    await getApprovalRequestsHandler(request({ query: { requestType: "TIER_OVERRIDE" } }), rep);

    expect((getApprovalRequests as Mock).mock.calls[0][0]).toBe(PROGRAM);
    expect(answer(rep).code).toBe(200);
  });

  test("answers an empty array when the org has no program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await getApprovalRequestsHandler(request({ query: {} }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: [] });
  });

  test("turns a missing request into a 404", async () => {
    (getApprovalRequestById as Mock).mockRejectedValue(new Error("Approval request not found"));
    const rep = reply();

    await getApprovalRequestByIdHandler(request({ params: { approvalId: "nope" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Approval request not found" } });
  });

  test("approve, reject, cancel and read all carry the caller's program", async () => {
    await getApprovalRequestByIdHandler(request({ params: { approvalId: "apr-other" } }), reply());
    await approveApprovalRequestHandler(
      request({ params: { approvalId: "apr-other" }, body: {} }),
      reply(),
    );
    await rejectApprovalRequestHandler(
      request({ params: { approvalId: "apr-other" }, body: { reason: "no" } }),
      reply(),
    );
    await cancelApprovalRequestHandler(
      request({ params: { approvalId: "apr-other" }, body: { reason: "no" } }),
      reply(),
    );

    expect(getApprovalRequestById).toHaveBeenCalledWith("apr-other", PROGRAM);
    expect((approveApprovalRequest as Mock).mock.calls[0][1]).toBe(PROGRAM);
    expect((rejectApprovalRequest as Mock).mock.calls[0][1]).toBe(PROGRAM);
    expect((cancelApprovalRequest as Mock).mock.calls[0][1]).toBe(PROGRAM);
  });

  test("an org with no program cannot act on an approval at all", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await approveApprovalRequestHandler(
      request({ params: { approvalId: "apr-other" }, body: {} }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Loyalty program not found" } });
    expect(approveApprovalRequest).not.toHaveBeenCalled();
  });

  test("passes a refusal through with its message", async () => {
    (approveApprovalRequest as Mock).mockRejectedValue(
      new Error("Customer does not have enough points"),
    );
    const rep = reply();

    await approveApprovalRequestHandler(
      request({ params: { approvalId: "apr-1" }, body: {} }),
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 500,
      body: { error: "Customer does not have enough points" },
    });
  });
});

// ===========================================================================
// settings
// ===========================================================================

describe("the settings controller — WhatsApp commands", () => {
  test("creates a command against the caller's org", async () => {
    const rep = reply();

    await createLoyaltyTemplateHandler(request({ body: { type: "PointInformation" } }), rep);

    expect((createLoyaltyWaCommand as Mock).mock.calls[0][0]).toMatchObject({ orgId: ORG });
    expect(answer(rep).code).toBe(200);
  });

  test("lists the caller's own commands", async () => {
    const rep = reply();

    await getAllLoyaltyTemplateHandler(request(), rep);

    expect(getAllLoyaltyWaCommands).toHaveBeenCalledWith(ORG);
    expect(answer(rep).code).toBe(200);
  });

  test("fetching and updating a command both carry the session org", async () => {
    await getLoyaltyTemplateHandler(request({ params: { id: "cmd-other" } }), reply());
    await updateLoyaltyTemplateHandler(
      request({ params: { id: "cmd-other" }, body: { content: "x" } }),
      reply(),
    );

    expect(getLoyaltyWaCommand).toHaveBeenCalledWith("cmd-other", ORG);
    expect((updateLoyaltyWaCommand as Mock).mock.calls[0][2]).toBe(ORG);
  });

  test("answers a failure with the bare Error object", async () => {
    (getAllLoyaltyWaCommands as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getAllLoyaltyTemplateHandler(request(), rep);

    expect(answer(rep).code).toBe(500);
    expect(answer(rep).body).toBeInstanceOf(Error);
  });
});

describe("the settings controller — event triggers", () => {
  test("creates a trigger against the caller's own program, ignoring the body", async () => {
    const rep = reply();

    await createEventTriggerHandler(
      request({ body: { programId: "prog-other-org", eventType: "BIRTHDAY" } }),
      rep,
    );

    expect(getLoyaltyProgramByOrg).toHaveBeenCalledWith(ORG);
    expect((createEventTrigger as Mock).mock.calls[0][1]).toBe(PROGRAM);
    expect(answer(rep).code).toBe(201);
  });

  test("fetch, update and delete are all scoped to the caller's program", async () => {
    await getEventTriggerHandler(request({ params: { id: "trg-other" } }), reply());
    await updateEventTriggerHandler(
      request({ params: { id: "trg-other" }, body: { enabled: false } }),
      reply(),
    );
    await deleteEventTriggerHandler(request({ params: { id: "trg-other" } }), reply());

    expect(getEventTrigger).toHaveBeenCalledWith("trg-other", PROGRAM);
    expect((updateEventTrigger as Mock).mock.calls[0][2]).toBe(PROGRAM);
    expect(deleteEventTrigger).toHaveBeenCalledWith("trg-other", PROGRAM);
  });

  test("ignores the query's programId and lists only the caller's own", async () => {
    const rep = reply();

    await getAllEventTriggersHandler(request({ query: { programId: "prog-other-org" } }), rep);

    expect(getAllEventTriggers).toHaveBeenCalledWith(PROGRAM);
    expect(answer(rep).code).toBe(200);
  });

  test("omitting the query parameter lists the caller's own, not everyone's", async () => {
    const rep = reply();

    await getAllEventTriggersHandler(request({ query: {} }), rep);

    expect(getAllEventTriggers).toHaveBeenCalledWith(PROGRAM);
    expect(answer(rep).code).toBe(200);
  });

  test("an org with no program lists nothing at all", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await getAllEventTriggersHandler(request({ query: {} }), rep);

    expect(getAllEventTriggers).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({ code: 404, body: { error: "Loyalty program not found" } });
  });
});
