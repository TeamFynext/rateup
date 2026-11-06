import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyFeedbackSetting: { findUnique: vi.fn() },
    customerLoyaltyAccount: { findUnique: vi.fn() },
    loyaltyFeedbackRequest: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../../workers/bullmq/queues/loyaltyFeedback.queue.js", () => ({
  armFeedbackRequest: vi.fn(async () => {}),
  disarmFeedbackRequest: vi.fn(async () => {}),
  loyaltyFeedbackJobId: (id: string) => `feedback-${id}`,
  loyaltyFeedbackSendQueue: { getJob: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import {
  armFeedbackRequest,
  disarmFeedbackRequest,
  loyaltyFeedbackSendQueue,
} from "../../../workers/bullmq/queues/loyaltyFeedback.queue.js";
import {
  cancelScheduledFeedbackRequests,
  reconcileScheduledFeedbackRequests,
  scheduleFeedbackRequest,
} from "./feedback.scheduler.js";

const db = prisma as unknown as {
  loyaltyFeedbackSetting: { findUnique: ReturnType<typeof vi.fn> };
  customerLoyaltyAccount: { findUnique: ReturnType<typeof vi.fn> };
  loyaltyFeedbackRequest: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

const INPUT = { programId: "prog-1", accountId: "acct-1", transactionId: "txn-1" };

function liveSetting(overrides: Record<string, unknown> = {}) {
  return {
    id: "set-1",
    enabled: true,
    sendDelayMinutes: 120,
    cooldownDays: 30,
    flow: { status: "PUBLISHED" },
    waTemplate: { data: { status: "APPROVED" } },
    program: { status: "active" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  db.loyaltyFeedbackSetting.findUnique.mockResolvedValue(liveSetting());
  db.customerLoyaltyAccount.findUnique.mockResolvedValue({ contact: { phone: "15550001" } });
  db.loyaltyFeedbackRequest.findFirst.mockResolvedValue(null);
  db.loyaltyFeedbackRequest.create.mockResolvedValue({ id: "req-1" });
});

describe("scheduleFeedbackRequest — early outs", () => {
  test.each([
    ["no_setting", null],
    ["disabled", liveSetting({ enabled: false })],
    ["program_inactive", liveSetting({ program: { status: "paused" } })],
    ["flow_not_published", liveSetting({ flow: { status: "DRAFT" } })],
    ["flow_not_published", liveSetting({ flow: null })],
    ["template_not_approved", liveSetting({ waTemplate: { data: { status: "PENDING" } } })],
    ["template_not_approved", liveSetting({ waTemplate: null })],
  ])("returns %s without opening a row", async (reason, setting) => {
    db.loyaltyFeedbackSetting.findUnique.mockResolvedValue(setting);

    await expect(scheduleFeedbackRequest(INPUT)).resolves.toEqual({ scheduled: false, reason });
    expect(db.loyaltyFeedbackRequest.create).not.toHaveBeenCalled();
    expect(armFeedbackRequest).not.toHaveBeenCalled();
  });

  test("a customer with no phone cannot be asked", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ contact: { phone: null } });
    await expect(scheduleFeedbackRequest(INPUT)).resolves.toEqual({
      scheduled: false,
      reason: "no_phone",
    });
  });

  test("a recent ask inside the cooldown window blocks another", async () => {
    db.loyaltyFeedbackRequest.findFirst.mockResolvedValue({ id: "older" });

    await expect(scheduleFeedbackRequest(INPUT)).resolves.toEqual({
      scheduled: false,
      reason: "cooldown",
    });
    const where = db.loyaltyFeedbackRequest.findFirst.mock.calls[0]![0].where;
    expect(where.accountId).toBe("acct-1");
    // A completed ask was sent too, so it counts against the window.
    expect(where.status.in).toEqual(["SCHEDULED", "SENT", "COMPLETED"]);
  });

  test("a zero-day cooldown skips the lookup", async () => {
    db.loyaltyFeedbackSetting.findUnique.mockResolvedValue(liveSetting({ cooldownDays: 0 }));
    await scheduleFeedbackRequest(INPUT);
    expect(db.loyaltyFeedbackRequest.findFirst).not.toHaveBeenCalled();
  });

  test("the transaction's unique index turns a race into duplicate_transaction", async () => {
    db.loyaltyFeedbackRequest.create.mockRejectedValue({ code: "P2002" });
    await expect(scheduleFeedbackRequest(INPUT)).resolves.toEqual({
      scheduled: false,
      reason: "duplicate_transaction",
    });
  });

  test("other database errors still surface", async () => {
    db.loyaltyFeedbackRequest.create.mockRejectedValue(new Error("boom"));
    await expect(scheduleFeedbackRequest(INPUT)).rejects.toThrow("boom");
  });
});

describe("scheduleFeedbackRequest — happy path", () => {
  test("opens the row at now + delay and arms the delayed job", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T10:00:00Z"));

    const result = await scheduleFeedbackRequest(INPUT);

    const expectedFor = new Date("2026-09-10T12:00:00Z");
    expect(result).toEqual({ scheduled: true, requestId: "req-1", scheduledFor: expectedFor });
    expect(db.loyaltyFeedbackRequest.create).toHaveBeenCalledWith({
      data: {
        programId: "prog-1",
        accountId: "acct-1",
        transactionId: "txn-1",
        scheduledFor: expectedFor,
      },
      select: { id: true },
    });
    expect(armFeedbackRequest).toHaveBeenCalledWith("req-1", expectedFor);
  });

  test("a failed arm is logged, not thrown — the reconciler picks the row up", async () => {
    vi.mocked(armFeedbackRequest).mockRejectedValueOnce(new Error("redis down"));
    await expect(scheduleFeedbackRequest(INPUT)).resolves.toMatchObject({ scheduled: true });
  });
});

describe("cancelScheduledFeedbackRequests", () => {
  test("cancels only rows still SCHEDULED and disarms each", async () => {
    db.loyaltyFeedbackRequest.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    db.loyaltyFeedbackRequest.updateMany.mockResolvedValue({ count: 2 });

    await expect(cancelScheduledFeedbackRequests("prog-1", "Feedback switched off")).resolves.toBe(
      2,
    );
    expect(db.loyaltyFeedbackRequest.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["a", "b"] }, status: "SCHEDULED" },
      data: { status: "CANCELLED", failReason: "Feedback switched off" },
    });
    expect(disarmFeedbackRequest).toHaveBeenCalledTimes(2);
  });

  test("does nothing when nothing is waiting", async () => {
    db.loyaltyFeedbackRequest.findMany.mockResolvedValue([]);
    await expect(cancelScheduledFeedbackRequests("prog-1", "x")).resolves.toBe(0);
    expect(db.loyaltyFeedbackRequest.updateMany).not.toHaveBeenCalled();
  });
});

describe("reconcileScheduledFeedbackRequests", () => {
  test("arms only rows without a job", async () => {
    const due = new Date("2026-09-10T12:00:00Z");
    db.loyaltyFeedbackRequest.findMany.mockResolvedValue([
      { id: "armed", scheduledFor: due },
      { id: "lost", scheduledFor: due },
    ]);
    vi.mocked(loyaltyFeedbackSendQueue.getJob)
      .mockResolvedValueOnce({ id: "feedback-armed" } as never)
      .mockResolvedValueOnce(null as never);

    await expect(reconcileScheduledFeedbackRequests()).resolves.toEqual({ checked: 2, armed: 1 });
    expect(armFeedbackRequest).toHaveBeenCalledTimes(1);
    expect(armFeedbackRequest).toHaveBeenCalledWith("lost", due);
  });
});
