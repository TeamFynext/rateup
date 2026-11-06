import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyProgram: { findMany: vi.fn() },
    customerLoyaltyAccount: { findMany: vi.fn(), update: vi.fn() },
    loyaltyTransaction: { groupBy: vi.fn() },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../messaging/send.js", () => ({ sendLoyaltyEvent: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import { sendLoyaltyEvent } from "../messaging/send.js";
import { reevaluateRollingTiers } from "./tierReevaluation.service.js";

/** The `sendLoyaltyEvent` call made for `event`: org, recipient, data and options. */
function sentEvent(event: string) {
  const call = (sendLoyaltyEvent as unknown as { mock: { calls: unknown[][] } }).mock.calls.find(
    (args) => args[1] === event,
  );
  return call && { orgId: call[0], to: call[2], data: call[3], options: call[4] };
}

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  loyaltyProgram: Record<string, Mock>;
  customerLoyaltyAccount: Record<string, Mock>;
  loyaltyTransaction: Record<string, Mock>;
};

const VIP = { id: "vip", name: "VIP", threshold: 5000 };
const MEMBER = { id: "member", name: "Member", threshold: 0 };

function program(over: Record<string, unknown> = {}) {
  return {
    id: "prog-1",
    orgId: "org-1",
    tierQualificationWindowMonths: 6,
    // Highest threshold first, as the service loads them.
    tiers: [VIP, MEMBER],
    ...over,
  };
}

function member(id: string, currentTierId: string | null, phone: string | null = `9${id}`) {
  return { id, currentTierId, contact: { phone, name: `Member ${id}` } };
}

function spent(rows: Record<string, number>) {
  db.loyaltyTransaction.groupBy.mockResolvedValue(
    Object.entries(rows).map(([accountId, sum]) => ({ accountId, _sum: { purchaseAmount: sum } })),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyProgram.findMany.mockResolvedValue([program()]);
  db.customerLoyaltyAccount.findMany.mockResolvedValue([]);
  db.customerLoyaltyAccount.update.mockResolvedValue({});
  spent({});
});

describe("reevaluateRollingTiers", () => {
  test("only considers active, tiered programmes that set a window", async () => {
    await reevaluateRollingTiers();

    expect(db.loyaltyProgram.findMany.mock.calls[0][0].where).toEqual({
      status: "active",
      tiersEnabled: true,
      tierQualificationWindowMonths: { not: null },
    });
  });

  test("promotes a member whose windowed spend reached VIP, and tells them", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValueOnce([member("a", "member")]);
    spent({ a: 6000 });

    const summary = await reevaluateRollingTiers();

    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { currentTierId: "vip" },
    });
    expect(sentEvent(LoyaltyEventType.TIER_UPGRADED)).toMatchObject({
      orgId: "org-1",
      to: { accountId: "a" },
      data: { tier: "VIP" },
    });
    expect(summary).toMatchObject({ programs: 1, evaluated: 1, promoted: 1, demoted: 0 });
  });

  test("demotes silently — no notification, only a log line", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValueOnce([member("a", "vip")]);
    spent({ a: 100 });

    const summary = await reevaluateRollingTiers();

    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { currentTierId: "member" },
    });
    expect(sendLoyaltyEvent).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: "a", from: "VIP", to: "Member" }),
      expect.stringContaining("demoted"),
    );
    expect(summary).toMatchObject({ promoted: 0, demoted: 1 });
  });

  test("leaves a member who still qualifies for their tier alone", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValueOnce([
      member("a", "vip"),
      member("b", "member"),
    ]);
    spent({ a: 9000, b: 50 });

    await reevaluateRollingTiers();

    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("placing an untiered member on the base rung is not announced", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValueOnce([member("a", null)]);

    await reevaluateRollingTiers();

    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { currentTierId: "member" },
    });
    expect(sendLoyaltyEvent).not.toHaveBeenCalled();
  });

  test("one member's failed message does not stop the sweep", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValueOnce([
      member("a", "member"),
      member("b", "member"),
    ]);
    spent({ a: 6000, b: 7000 });
    (sendLoyaltyEvent as Mock).mockRejectedValueOnce(new Error("Meta is down"));

    const summary = await reevaluateRollingTiers();

    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledTimes(2);
    expect(summary.promoted).toBe(2);
    expect(log.error).toHaveBeenCalledTimes(1);
  });

  test("pages through members in batches, keying each page on the last id seen", async () => {
    const page = Array.from({ length: 500 }, (_, i) =>
      member(`m${String(i).padStart(3, "0")}`, "member"),
    );
    db.customerLoyaltyAccount.findMany
      .mockResolvedValueOnce(page)
      .mockResolvedValueOnce([member("z", "member")]);

    const summary = await reevaluateRollingTiers();

    expect(db.customerLoyaltyAccount.findMany).toHaveBeenCalledTimes(2);
    expect(db.customerLoyaltyAccount.findMany.mock.calls[1][0]).toMatchObject({
      cursor: { id: "m499" },
      skip: 1,
    });
    expect(summary.evaluated).toBe(501);
  });

  test("a programme with no tiers at all is skipped", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program({ tiers: [] })]);

    const summary = await reevaluateRollingTiers();

    expect(db.customerLoyaltyAccount.findMany).not.toHaveBeenCalled();
    expect(summary.programs).toBe(0);
  });
});
