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
    customerReward: { create: vi.fn(), findUnique: vi.fn() },
    loyaltyReward: { findUnique: vi.fn() },
    loyaltyTransaction: { create: vi.fn(), createMany: vi.fn() },
    $queryRaw: vi.fn(),
    // The expiry writes its ledger rows and its one balance update together now.
    // See issues.txt 20.38.
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../contact/contact.utils.js", () => ({ handleSendTemplate: vi.fn() }));
// issueRewardToCustomer goes through assignRewardToCustomer now, rather than
// being a third short-code generator of its own. See issues.txt 20.36.
vi.mock("../accounts/account.service.js", () => ({ assignRewardToCustomer: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { handleSendTemplate } from "../../contact/contact.utils.js";
import { assignRewardToCustomer } from "../accounts/account.service.js";
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
  $transaction: Mock;
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
  db.loyaltyTransaction.createMany.mockResolvedValue({ count: 1 });
  db.$queryRaw.mockResolvedValue([]);
  db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
  (assignRewardToCustomer as Mock).mockResolvedValue({ id: "cr-1", shortCode: "ABCDEFGH" });
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
    db.$queryRaw.mockResolvedValue([{ id: "acct-1" }]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
    ]);

    await checkBirthdayEventTriggers();

    expect(handleSendTemplate).toHaveBeenCalledWith("tmpl-1", ORG, "919000000001", [
      "Ann",
      "a special reward",
    ]);
  });

  // The month and day are matched in SQL, so a customer whose birthday is not
  // today is never loaded at all. See issues.txt 20.36.
  test("ignores a customer whose birthday is another day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.$queryRaw.mockResolvedValue([]);

    await checkBirthdayEventTriggers();

    expect(handleSendTemplate).not.toHaveBeenCalled();
  });

  test("names the configured reward in the message when there is one", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([
      trigger({ rewardId: "rwd-1", reward: { name: "Free cake" } }),
    ]);
    db.$queryRaw.mockResolvedValue([{ id: "acct-1" }]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
    ]);

    await checkBirthdayEventTriggers();

    expect((handleSendTemplate as Mock).mock.calls[0][3]).toEqual(["Ann", "Free cake"]);
    expect(assignRewardToCustomer).toHaveBeenCalledWith("acct-1", "rwd-1");
  });

  test("skips a customer with no phone number", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.$queryRaw.mockResolvedValue([{ id: "acct-1" }]);
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
    db.$queryRaw.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ id: "a1", contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
      account({ id: "a2", contact: { ...account().contact, dob: localDate(1991, 4, 15) } }),
    ]);
    (handleSendTemplate as Mock).mockRejectedValueOnce(new Error("meta down"));

    await checkBirthdayEventTriggers();

    expect((handleSendTemplate as Mock).mock.calls).toHaveLength(2);
  });

  // The inactivity cron claims each customer with a conditional updateMany before
  // sending, precisely so an overlapping run cannot double-send. This cron used to
  // have no such guard and record nothing per customer, so a second run on the
  // same day — a redeploy, a retry, two instances — greeted every birthday
  // customer again. The claim is written to its own column, not to lastActivityAt.
  // See issues.txt 20.36 and 20.37.
  test("claims each customer before sending, so a second run greets nobody twice", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.$queryRaw.mockResolvedValue([{ id: "acct-1" }]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
    ]);

    await checkBirthdayEventTriggers();

    const claim = db.customerLoyaltyAccount.updateMany.mock.calls[0][0];
    expect(claim.where.id).toBe("acct-1");
    expect(claim.data.lastBirthdayGreetedAt).toBeInstanceOf(Date);
    expect(claim.data).not.toHaveProperty("lastActivityAt");
  });

  test("skips a customer another run already greeted today", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.$queryRaw.mockResolvedValue([{ id: "acct-1" }]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
    ]);
    db.customerLoyaltyAccount.updateMany.mockResolvedValue({ count: 0 });

    await checkBirthdayEventTriggers();

    expect(handleSendTemplate).not.toHaveBeenCalled();
  });

  // Every active customer with a date of birth used to be loaded for each trigger
  // and filtered in JavaScript, so the whole membership was materialised daily,
  // per trigger, to find the handful with a birthday. See issues.txt 20.36.
  test("matches the month and day in SQL rather than in memory", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDate(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.$queryRaw.mockResolvedValue([]);

    await checkBirthdayEventTriggers();

    expect(db.$queryRaw).toHaveBeenCalled();
    // Nothing came back, so nothing is greeted.
    expect(handleSendTemplate).not.toHaveBeenCalled();
  });

  test("survives a trigger whose program query fails", async () => {
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.$queryRaw.mockRejectedValue(new Error("connection lost"));

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ triggerDays: 30 })]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);

    await checkInactivityEventTriggers();

    expect(db.customerLoyaltyAccount.updateMany.mock.calls[0][0].where).toEqual({
      id: "acct-1",
      OR: [
        { lastInactivityReminderAt: null },
        { lastInactivityReminderAt: { lte: new Date("2026-01-30T00:00:00.000Z") } },
      ],
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

    expect(assignRewardToCustomer).toHaveBeenCalledWith("acct-1", "rwd-1");
  });

  // The claim used to write `lastActivityAt = now` — the same column this cron
  // SELECTS on, and the one the points-expiry alert reads. So reminding a dormant
  // customer marked them as active today: their inactivity clock restarted, they
  // would not be reminded again for another full window, and the reminder
  // cancelled its own follow-up. The record also claimed activity the customer had
  // not performed. It writes its own column now. See issues.txt 20.37.
  test("the claim does not pretend the customer did something", async () => {
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ triggerDays: 30 })]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);

    await checkInactivityEventTriggers();

    const data = db.customerLoyaltyAccount.updateMany.mock.calls[0][0].data;
    expect(data.lastInactivityReminderAt).toBeInstanceOf(Date);
    expect(data).not.toHaveProperty("lastActivityAt");
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

  // The assignment goes through assignRewardToCustomer, which loops until it finds
  // a free short code and checks the reward exists. This used to be a THIRD
  // short-code generator with its own alphabet that did NOT loop — shortCode is
  // @unique, so a collision threw, and the catch below swallowed it: the customer
  // received the birthday message promising "a special reward" and silently got
  // nothing. See issues.txt 20.36 and 20.9.
  test("issues the reward through the shared assignment path", async () => {
    await checkBirthdayEventTriggers();

    expect(assignRewardToCustomer).toHaveBeenCalledWith("acct-1", "rwd-1");
    expect(db.customerReward.create).not.toHaveBeenCalled();
  });

  // The catch stays — a failed reward must not stop the rest of the run — but the
  // failure is logged for what it is rather than hidden behind a success line.
  test("keeps going, and does not claim success, when the assignment fails", async () => {
    (assignRewardToCustomer as Mock).mockRejectedValue(new Error("Reward not found"));

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

  test("targets customers holding an earning that expires in fourteen days", async () => {
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
    expect(where.transactions.some.createdAt.gte).toBeInstanceOf(Date);
    expect(where.transactions.some.createdAt.lte).toBeInstanceOf(Date);
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

  // The alert used to select customers by `lastActivityAt` while the expiration
  // cron below expires individual EARN TRANSACTIONS by their own createdAt — two
  // different clocks for one event. A customer could be warned about an expiry
  // that never arrived, or lose points with no warning at all, depending on which
  // of the two had moved most recently. It selects on the clock that actually
  // decides now. See issues.txt 20.37.
  test("selects on the same clock the expiry itself uses", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([
      { id: PROGRAM, name: "Rewards", orgId: ORG, pointsExpirationMonths: 12 },
    ]);
    db.loyaltyEventTrigger.findFirst.mockResolvedValue(trigger());

    await checkPointsExpiryAlerts();

    const where = db.customerLoyaltyAccount.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty("lastActivityAt");
    expect(where.transactions.some).toMatchObject({
      transactionType: "earn",
      points: { gt: 0 },
    });
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

    expect(db.loyaltyTransaction.createMany).not.toHaveBeenCalled();
  });

  test("writes an expire row linked back to the earning it cancels", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account({ currentPoints: 500 })]);
    db.$queryRaw.mockResolvedValue([{ id: "txn-old", points: 100 }]);

    await checkPointsExpiration();

    expect(db.loyaltyTransaction.createMany.mock.calls[0][0].data[0]).toMatchObject({
      accountId: "acct-1",
      transactionType: "expire",
      points: -100,
      balanceAfter: 400,
      source: "expiration",
      referenceId: "txn-old",
    });
  });

  test("never takes more than the customer actually holds", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account({ currentPoints: 30 })]);
    db.$queryRaw.mockResolvedValue([{ id: "txn-old", points: 100 }]);

    await checkPointsExpiration();

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data.currentPoints).toBe(0);
  });

  // The sharpest defect in this file. `pointsToExpire = Math.min(totalExpiredPoints,
  // account.currentPoints)` was computed under the comment "Don't expire more
  // points than the customer currently has" — and then used ONLY for the log line
  // and the running total. The loop underneath wrote an expire row for each stale
  // earning's FULL value while the balance was separately clamped, so a customer
  // with 150 points of stale earnings against a 30-point balance (having spent the
  // rest) got expire rows totalling -150 while their balance fell by 30. Replaying
  // the ledger stopped reconciling with currentPoints, and the "points expired"
  // figure the cron reports was inflated for everyone who had ever redeemed.
  //
  // The allocation walks the stale earnings oldest-first and stops at the cap.
  // Earnings past that point still get a row, with zero points — the row is what
  // the NOT EXISTS keys on, so without it they would be re-examined forever.
  // See issues.txt 20.38.
  test("expires against the cap, and writes exactly what it took", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account({ currentPoints: 30 })]);
    db.$queryRaw.mockResolvedValue([
      { id: "txn-a", points: 100 },
      { id: "txn-b", points: 50 },
    ]);

    await checkPointsExpiration();

    const rows = db.loyaltyTransaction.createMany.mock.calls[0][0].data;
    expect(rows.map((r: { points: number }) => r.points)).toEqual([-30, -0]);
    expect(rows.map((r: { balanceAfter: number }) => r.balanceAfter)).toEqual([0, 0]);
    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data.currentPoints).toBe(0);
  });

  test("still marks the earnings it did not take, so they are not re-examined", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account({ currentPoints: 30 })]);
    db.$queryRaw.mockResolvedValue([
      { id: "txn-a", points: 100 },
      { id: "txn-b", points: 50 },
    ]);

    await checkPointsExpiration();

    const rows = db.loyaltyTransaction.createMany.mock.calls[0][0].data;
    expect(rows.map((r: { referenceId: string }) => r.referenceId)).toEqual(["txn-a", "txn-b"]);
  });

  // Expiring points used to write `lastActivityAt = now` — the very column the
  // expiry-alert cron used to decide who to warn next — so losing points pushed
  // the customer's next warning out by a full window even though they had done
  // nothing. See issues.txt 20.37.
  test("expiring points does not mark the account as active", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.$queryRaw.mockResolvedValue([{ id: "txn-old", points: 100 }]);

    await checkPointsExpiration();

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).not.toHaveProperty(
      "lastActivityAt",
    );
  });

  // The balance used to be re-read from the database once per expired transaction,
  // inside the loop, with each row written on its own and nothing around any of
  // it — an N+1 read for every customer with stale earnings. See issues.txt 20.38.
  test("reads the balance once and writes once, in one transaction", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.$queryRaw.mockResolvedValue([
      { id: "txn-a", points: 10 },
      { id: "txn-b", points: 20 },
      { id: "txn-c", points: 30 },
    ]);

    await checkPointsExpiration();

    expect(db.customerLoyaltyAccount.findUnique).not.toHaveBeenCalled();
    expect(db.loyaltyTransaction.createMany.mock.calls[0][0].data).toHaveLength(3);
    expect(db.customerLoyaltyAccount.update.mock.calls).toHaveLength(1);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  test("the running balance falls row by row across the ledger entries", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account({ currentPoints: 500 })]);
    db.$queryRaw.mockResolvedValue([
      { id: "txn-a", points: 10 },
      { id: "txn-b", points: 20 },
    ]);

    await checkPointsExpiration();

    const rows = db.loyaltyTransaction.createMany.mock.calls[0][0].data;
    expect(rows.map((r: { balanceAfter: number }) => r.balanceAfter)).toEqual([490, 470]);
  });

  test("skips an account whose expired earnings total nothing", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.$queryRaw.mockResolvedValue([{ id: "txn-old", points: 0 }]);

    await checkPointsExpiration();

    expect(db.loyaltyTransaction.createMany).not.toHaveBeenCalled();
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
    expect(db.loyaltyTransaction.createMany).toHaveBeenCalled();
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
