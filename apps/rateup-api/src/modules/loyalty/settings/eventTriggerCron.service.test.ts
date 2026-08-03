import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyEventTrigger: { findMany: vi.fn(), findFirst: vi.fn() },
    loyaltyProgram: { findMany: vi.fn() },
    customerLoyaltyAccount: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    customerReward: { create: vi.fn() },
    loyaltyReward: { findUnique: vi.fn() },
    loyaltyTransaction: { create: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../contact/contact.utils.js", () => ({ handleSendTemplate: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { handleSendTemplate } from "../../contact/contact.utils.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import {
  checkBirthdayEventTriggers,
  checkInactivityEventTriggers,
  checkPointsExpiration,
  checkPointsExpiryAlerts,
} from "./eventTriggerCron.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  loyaltyEventTrigger: Record<string, Mock>;
  loyaltyProgram: Record<string, Mock>;
  customerLoyaltyAccount: Record<string, Mock>;
  customerReward: Record<string, Mock>;
  loyaltyReward: Record<string, Mock>;
  loyaltyTransaction: Record<string, Mock>;
  $queryRaw: Mock;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const PROGRAM = "prog-1";

/// Local-time date components keep these fixtures TZ-independent — the crons
/// compare birthdays with dayjs, which reads the local clock.
function localDate(year: number, month: number, day: number) {
  return new Date(year, month, day, 12);
}

interface TriggerFixture {
  id: string;
  programId: string;
  waTemplateId: string | null;
  rewardId: string | null;
  triggerDays: number | null;
  program: { id: string; name: string; orgId: string };
  reward: { id: string; name: string; pointsCost: number } | null;
}

function trigger(over: Record<string, unknown> = {}) {
  const base: TriggerFixture = {
    id: "trg-1",
    programId: PROGRAM,
    waTemplateId: "tmpl-1",
    rewardId: null,
    triggerDays: null,
    program: { id: PROGRAM, name: "Rewards", orgId: ORG },
    reward: null,
  };
  return { ...base, ...over };
}

function account(over: Record<string, unknown> = {}) {
  return {
    id: "acct-1",
    currentPoints: 500,
    lastActivityAt: new Date(2026, 0, 1),
    contact: { id: "contact-1", phone: "919000000001", name: "Ann", orgId: ORG },
    program: { id: PROGRAM },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyEventTrigger.findMany.mockResolvedValue([]);
  db.loyaltyEventTrigger.findFirst.mockResolvedValue(null);
  db.loyaltyProgram.findMany.mockResolvedValue([]);
  db.customerLoyaltyAccount.findMany.mockResolvedValue([]);
  db.customerLoyaltyAccount.findUnique.mockResolvedValue({ currentPoints: 500 });
  db.customerLoyaltyAccount.update.mockResolvedValue({});
  db.customerLoyaltyAccount.updateMany.mockResolvedValue({ count: 1 });
  db.customerReward.create.mockResolvedValue({ id: "cr-1" });
  db.loyaltyReward.findUnique.mockResolvedValue({ id: "rwd-1", name: "Birthday treat" });
  db.loyaltyTransaction.create.mockResolvedValue({ id: "txn-1" });
  db.$queryRaw.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// Birthdays
// ===========================================================================

describe("checkBirthdayEventTriggers", () => {
  test("does nothing when no birthday trigger is enabled", async () => {
    await checkBirthdayEventTriggers();

    expect(db.customerLoyaltyAccount.findMany).not.toHaveBeenCalled();
  });

  test("only considers enabled triggers that have a template", async () => {
    await checkBirthdayEventTriggers();

    expect(db.loyaltyEventTrigger.findMany.mock.calls[0][0].where).toEqual({
      eventType: LoyaltyEventType.BIRTHDAY,
      enabled: true,
      waTemplateId: { not: null },
    });
  });

  test("greets a customer whose birthday is today", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
    ]);

    await checkBirthdayEventTriggers();

    expect(handleSendTemplate).toHaveBeenCalledWith("tmpl-1", ORG, "919000000001", [
      "Ann",
      "a special reward",
    ]);
  });

  test("ignores a customer whose birthday is another day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 16) } }),
    ]);

    await checkBirthdayEventTriggers();

    expect(handleSendTemplate).not.toHaveBeenCalled();
  });

  test("names the configured reward in the message when there is one", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([
      trigger({ rewardId: "rwd-1", reward: { name: "Free cake" } }),
    ]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
    ]);

    await checkBirthdayEventTriggers();

    expect((handleSendTemplate as Mock).mock.calls[0][3]).toEqual(["Ann", "Free cake"]);
    expect(db.customerReward.create).toHaveBeenCalled();
  });

  test("skips a customer with no phone number", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { phone: null, name: "Ann", orgId: ORG, dob: localDate(1990, 4, 15) } }),
    ]);

    await checkBirthdayEventTriggers();

    expect(handleSendTemplate).not.toHaveBeenCalled();
  });

  test("keeps going when one customer's send fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ id: "a1", contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
      account({ id: "a2", contact: { ...account().contact, dob: localDate(1991, 4, 15) } }),
    ]);
    (handleSendTemplate as Mock).mockRejectedValueOnce(new Error("meta down"));

    await checkBirthdayEventTriggers();

    expect((handleSendTemplate as Mock).mock.calls).toHaveLength(2);
  });

  // NOTE: pins current behaviour. The inactivity cron claims each customer with a
  // conditional updateMany before sending, precisely so an overlapping run cannot
  // double-send. The birthday cron has no such guard and no per-customer record
  // of having sent, so a second run on the same day — a redeploy, a retry, two
  // instances — greets every birthday customer again. See issues.txt 20.36.
  test("has no idempotency guard, so a second run greets everyone again", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
    ]);

    await checkBirthdayEventTriggers();
    await checkBirthdayEventTriggers();

    expect((handleSendTemplate as Mock).mock.calls).toHaveLength(2);
    expect(db.customerLoyaltyAccount.updateMany).not.toHaveBeenCalled();
  });

  // NOTE: every active customer with a date of birth is loaded for each trigger
  // and filtered in JavaScript, rather than matching the month and day in the
  // query. See issues.txt 20.36.
  test("loads the whole membership and filters birthdays in memory", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);

    await checkBirthdayEventTriggers();

    const where = db.customerLoyaltyAccount.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      programId: PROGRAM,
      status: "active",
      contact: { dob: { not: null } },
    });
    expect(db.customerLoyaltyAccount.findMany.mock.calls[0][0]).not.toHaveProperty("take");
  });

  test("survives a trigger whose program query fails", async () => {
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.customerLoyaltyAccount.findMany.mockRejectedValue(new Error("connection lost"));

    await expect(checkBirthdayEventTriggers()).resolves.toBeUndefined();
  });
});

// ===========================================================================
// Inactivity
// ===========================================================================

describe("checkInactivityEventTriggers", () => {
  test("only considers enabled triggers with both a day count and a template", async () => {
    await checkInactivityEventTriggers();

    expect(db.loyaltyEventTrigger.findMany.mock.calls[0][0].where).toEqual({
      eventType: LoyaltyEventType.INACTIVITY_REMINDER,
      enabled: true,
      triggerDays: { not: null },
      waTemplateId: { not: null },
    });
  });

  test("looks for customers whose last activity predates the window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ triggerDays: 30 })]);

    await checkInactivityEventTriggers();

    expect(db.customerLoyaltyAccount.findMany.mock.calls[0][0].where).toEqual({
      programId: PROGRAM,
      status: "active",
      lastActivityAt: { lte: new Date("2026-01-30T00:00:00.000Z") },
    });
  });

  test("claims each customer before sending so two runs cannot double-send", async () => {
    const lastActivityAt = new Date(2026, 0, 1);
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ triggerDays: 30 })]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account({ lastActivityAt })]);

    await checkInactivityEventTriggers();

    expect(db.customerLoyaltyAccount.updateMany.mock.calls[0][0].where).toEqual({
      id: "acct-1",
      lastActivityAt,
    });
    expect(handleSendTemplate).toHaveBeenCalled();
  });

  test("skips a customer another process already claimed", async () => {
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ triggerDays: 30 })]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.customerLoyaltyAccount.updateMany.mockResolvedValue({ count: 0 });

    await checkInactivityEventTriggers();

    expect(handleSendTemplate).not.toHaveBeenCalled();
  });

  test("sends the customer's name and current points", async () => {
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ triggerDays: 30 })]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);

    await checkInactivityEventTriggers();

    expect((handleSendTemplate as Mock).mock.calls[0][3]).toEqual(["Ann", "500"]);
  });

  test("issues the win-back reward when one is configured", async () => {
    db.loyaltyEventTrigger.findMany.mockResolvedValue([
      trigger({ triggerDays: 30, rewardId: "rwd-1" }),
    ]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);

    await checkInactivityEventTriggers();

    expect(db.customerReward.create.mock.calls[0][0].data).toMatchObject({
      accountId: "acct-1",
      rewardId: "rwd-1",
      status: "ISSUED",
    });
  });

  // NOTE: the claim writes lastActivityAt = now, which is the same column the
  // reminder window and the points-expiry alert both read. Reminding a dormant
  // customer therefore marks them as active today: their inactivity clock
  // restarts and their points-expiry alert window moves with it, even though the
  // customer did nothing. See issues.txt 20.37.
  test("the claim marks a dormant customer as active today", async () => {
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ triggerDays: 30 })]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);

    await checkInactivityEventTriggers();

    expect(
      db.customerLoyaltyAccount.updateMany.mock.calls[0][0].data.lastActivityAt,
    ).toBeInstanceOf(Date);
  });
});

// ===========================================================================
// Issuing rewards from a cron
// ===========================================================================

describe("issuing a reward from a trigger", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ rewardId: "rwd-1" })]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
    ]);
  });

  test("writes an ISSUED assignment with an eight-character code", async () => {
    await checkBirthdayEventTriggers();

    const data = db.customerReward.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ accountId: "acct-1", rewardId: "rwd-1", status: "ISSUED" });
    expect(data.shortCode).toMatch(/^[A-Z0-9]{8}$/);
  });

  test("does nothing when the configured reward has been deleted", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue(null);

    await checkBirthdayEventTriggers();

    expect(db.customerReward.create).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. This is a THIRD short-code generator, and
  // unlike assignRewardToCustomer it does not loop until it finds a free code —
  // shortCode is @unique, so a collision throws. The catch swallows it, so the
  // customer receives the birthday message and silently no reward. The same
  // swallow hides "already assigned" on a repeat run. See issues.txt 20.36.
  test("swallows a failed assignment after the message has gone out", async () => {
    db.customerReward.create.mockRejectedValue(new Error("Unique constraint failed on shortCode"));

    await expect(checkBirthdayEventTriggers()).resolves.toBeUndefined();
    expect(handleSendTemplate).toHaveBeenCalled();
  });
});

// ===========================================================================
// Points expiry alerts
// ===========================================================================

describe("checkPointsExpiryAlerts", () => {
  test("does nothing when no program has expiration enabled", async () => {
    await checkPointsExpiryAlerts();

    expect(db.loyaltyEventTrigger.findFirst).not.toHaveBeenCalled();
  });

  test("only considers active programs with expiration switched on", async () => {
    await checkPointsExpiryAlerts();

    expect(db.loyaltyProgram.findMany.mock.calls[0][0].where).toEqual({
      status: "active",
      enablePointsExpiration: true,
    });
  });

  test("skips a program with no expiry-alert trigger", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([
      { id: PROGRAM, name: "Rewards", orgId: ORG, pointsExpirationMonths: 12 },
    ]);

    await checkPointsExpiryAlerts();

    expect(db.customerLoyaltyAccount.findMany).not.toHaveBeenCalled();
  });

  test("targets customers with points whose last activity falls in the alert day", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([
      { id: PROGRAM, name: "Rewards", orgId: ORG, pointsExpirationMonths: 12 },
    ]);
    db.loyaltyEventTrigger.findFirst.mockResolvedValue(trigger());

    await checkPointsExpiryAlerts();

    const where = db.customerLoyaltyAccount.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      programId: PROGRAM,
      status: "active",
      currentPoints: { gt: 0 },
    });
    expect(where.lastActivityAt.gte).toBeInstanceOf(Date);
    expect(where.lastActivityAt.lte).toBeInstanceOf(Date);
  });

  test("tells the customer their balance and the expiry date", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([
      { id: PROGRAM, name: "Rewards", orgId: ORG, pointsExpirationMonths: 12 },
    ]);
    db.loyaltyEventTrigger.findFirst.mockResolvedValue(trigger());
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);

    await checkPointsExpiryAlerts();

    const params = (handleSendTemplate as Mock).mock.calls[0][3];
    expect(params[0]).toBe("Ann");
    expect(params[1]).toBe("500");
    expect(params[2]).toMatch(/^\d{2} \w{3} \d{4}$/);
  });

  // NOTE: the alert selects customers by lastActivityAt, but the expiration cron
  // below expires individual EARN TRANSACTIONS by their own createdAt. The two
  // use different clocks, so a customer can be warned about an expiry that never
  // happens, or lose points with no warning at all. See issues.txt 20.37.
  test("selects by lastActivityAt, which is not what actually expires points", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([
      { id: PROGRAM, name: "Rewards", orgId: ORG, pointsExpirationMonths: 12 },
    ]);
    db.loyaltyEventTrigger.findFirst.mockResolvedValue(trigger());

    await checkPointsExpiryAlerts();

    expect(db.customerLoyaltyAccount.findMany.mock.calls[0][0].where).toHaveProperty(
      "lastActivityAt",
    );
  });
});

// ===========================================================================
// Points expiration
// ===========================================================================

describe("checkPointsExpiration", () => {
  const program = { id: PROGRAM, name: "Rewards", orgId: ORG, pointsExpirationMonths: 12 };

  test("does nothing when no program has expiration enabled", async () => {
    await checkPointsExpiration();

    expect(db.customerLoyaltyAccount.findMany).not.toHaveBeenCalled();
  });

  test("only looks at active accounts that still have points", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);

    await checkPointsExpiration();

    expect(db.customerLoyaltyAccount.findMany.mock.calls[0][0].where).toEqual({
      programId: PROGRAM,
      status: "active",
      currentPoints: { gt: 0 },
    });
  });

  test("leaves an account alone when it has no expired earnings", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);

    await checkPointsExpiration();

    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  test("writes an expire row linked back to the earning it cancels", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account({ currentPoints: 500 })]);
    db.$queryRaw.mockResolvedValue([{ id: "txn-old", points: 100 }]);

    await checkPointsExpiration();

    expect(db.loyaltyTransaction.create.mock.calls[0][0].data).toMatchObject({
      accountId: "acct-1",
      transactionType: "expire",
      points: -100,
      balanceAfter: 400,
      source: "expiration",
      referenceId: "txn-old",
    });
  });

  test("clamps the resulting balance at zero", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account({ currentPoints: 30 })]);
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ currentPoints: 30 });
    db.$queryRaw.mockResolvedValue([{ id: "txn-old", points: 100 }]);

    await checkPointsExpiration();

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data.currentPoints).toBe(0);
  });

  // NOTE: pins current behaviour, and this is the sharpest defect in the file.
  // `pointsToExpire = Math.min(totalExpiredPoints, account.currentPoints)` is
  // computed with the comment "Don't expire more points than the customer
  // currently has" — and is then used ONLY for logging. The loop below writes an
  // expire row for each transaction's FULL value. With 150 points of stale
  // earnings against a 30-point balance the ledger records -150 while the
  // balance only falls by 30, so replaying the ledger no longer reconciles.
  // See issues.txt 20.38.
  test("the cap it computes is never applied to what it writes", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account({ currentPoints: 30 })]);
    db.customerLoyaltyAccount.findUnique
      .mockResolvedValueOnce({ currentPoints: 30 })
      .mockResolvedValueOnce({ currentPoints: 0 });
    db.$queryRaw.mockResolvedValue([
      { id: "txn-a", points: 100 },
      { id: "txn-b", points: 50 },
    ]);

    await checkPointsExpiration();

    const written = db.loyaltyTransaction.create.mock.calls.map((c) => c[0].data.points);
    expect(written).toEqual([-100, -50]); // 150 expired on the ledger...
    expect(db.customerLoyaltyAccount.update.mock.calls.at(-1)![0].data.currentPoints).toBe(0);
    // ...against a balance that only ever held 30.
  });

  // NOTE: expiring points writes lastActivityAt = now — the very column the
  // expiry-alert cron uses to decide who to warn next. Losing points therefore
  // resets the customer's expiry clock. See issues.txt 20.37.
  test("expiring points marks the account as active today", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.$queryRaw.mockResolvedValue([{ id: "txn-old", points: 100 }]);

    await checkPointsExpiration();

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data.lastActivityAt).toBeInstanceOf(
      Date,
    );
  });

  // NOTE: the balance is re-read from the database once per expired transaction,
  // inside the loop, and each row is written on its own — no transaction, and an
  // N+1 read for every customer with stale earnings. See issues.txt 20.38.
  test("re-reads the balance once per expired transaction", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.$queryRaw.mockResolvedValue([
      { id: "txn-a", points: 10 },
      { id: "txn-b", points: 20 },
      { id: "txn-c", points: 30 },
    ]);

    await checkPointsExpiration();

    expect(db.customerLoyaltyAccount.findUnique.mock.calls).toHaveLength(3);
    expect(db.loyaltyTransaction.create.mock.calls).toHaveLength(3);
  });

  test("skips an account whose expired earnings total nothing", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.$queryRaw.mockResolvedValue([{ id: "txn-old", points: 0 }]);

    await checkPointsExpiration();

    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  test("keeps processing after one account fails", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ id: "a1" }),
      account({ id: "a2" }),
    ]);
    db.$queryRaw
      .mockRejectedValueOnce(new Error("query failed"))
      .mockResolvedValueOnce([{ id: "txn-old", points: 10 }]);

    await expect(checkPointsExpiration()).resolves.toBeUndefined();
    expect(db.loyaltyTransaction.create).toHaveBeenCalled();
  });

  test("notifies the customer once per account, not once per transaction", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.$queryRaw.mockResolvedValue([
      { id: "txn-a", points: 10 },
      { id: "txn-b", points: 20 },
    ]);

    await checkPointsExpiration();

    expect((handleSendTemplate as Mock).mock.calls).toHaveLength(1);
  });
});
