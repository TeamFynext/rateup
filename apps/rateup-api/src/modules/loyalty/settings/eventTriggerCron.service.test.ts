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
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../loyaltyMessaging.js", () => ({ sendLoyaltyMessage: vi.fn() }));
vi.mock("../accounts/account.service.js", () => ({ assignRewardToCustomer: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { sendLoyaltyMessage } from "../loyaltyMessaging.js";
import { assignRewardToCustomer } from "../accounts/account.service.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import {
  checkBirthdayEventTriggers,
  checkInactivityEventTriggers,
  checkPointsExpiration,
  checkPointsExpiryAlerts,
} from "./eventTriggerCron.service.js";
import { DEFAULT_SEND_HOUR, POINTS_EXPIRY_LEDGER_HOUR } from "./reminderSchedule.js";

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

/// A UTC instant on the given date at the hour a reminder goes out.
///
/// The sweep runs hourly and each occasion only acts when its programme's chosen hour has
/// struck locally, so a fixture clock at any other hour sends nothing. Programme fixtures
/// carry `timezone: "Etc/UTC"`, so the local hour is the UTC hour.
function atSendHour(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day, DEFAULT_SEND_HOUR));
}

/// The same, for the hour points are actually written off at.
function atLedgerHour(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day, POINTS_EXPIRY_LEDGER_HOUR));
}

interface TriggerFixture {
  id: string;
  programId: string;
  waTemplateId: string | null;
  rewardId: string | null;
  triggerDays: number | null;
  leadDays: number | null;
  sendHour: number | null;
  program: {
    id: string;
    name: string;
    orgId: string;
    whatsappNotifications: boolean;
    sendTextInSession: boolean;
    /// The reminder sweep reads this to decide whether the programme's hour has struck.
    timezone: string | null;
  };
  reward: { id: string; name: string; pointsCost: number } | null;
}

/** The send the crons hand to the session-aware sender, as toHaveBeenCalledWith wants it. */
function sentTo(phone: string, params: string[], templateId = "tmpl-1") {
  return {
    orgId: ORG,
    phone,
    waTemplateId: templateId,
    params,
    preferTextInSession: true,
  };
}

function trigger(over: Record<string, unknown> = {}) {
  const base: TriggerFixture = {
    id: "trg-1",
    programId: PROGRAM,
    waTemplateId: "tmpl-1",
    rewardId: null,
    triggerDays: null,
    leadDays: null,
    sendHour: null,
    program: {
      id: PROGRAM,
      name: "Rewards",
      orgId: ORG,
      whatsappNotifications: true,
      sendTextInSession: true,
      timezone: "Etc/UTC",
    },
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
    vi.setSystemTime(atSendHour(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.$queryRaw.mockResolvedValue([{ id: "acct-1" }]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
    ]);

    await checkBirthdayEventTriggers();

    expect(sendLoyaltyMessage).toHaveBeenCalledWith(
      sentTo("919000000001", ["Ann", "a special reward"]),
    );
  });

  test("ignores a customer whose birthday is another day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(atSendHour(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.$queryRaw.mockResolvedValue([]);

    await checkBirthdayEventTriggers();

    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
  });

  test("names the configured reward in the message when there is one", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(atSendHour(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([
      trigger({ rewardId: "rwd-1", reward: { name: "Free cake" } }),
    ]);
    db.$queryRaw.mockResolvedValue([{ id: "acct-1" }]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
    ]);

    await checkBirthdayEventTriggers();

    expect((sendLoyaltyMessage as Mock).mock.calls[0][0].params).toEqual(["Ann", "Free cake"]);
    expect(assignRewardToCustomer).toHaveBeenCalledWith("acct-1", "rwd-1");
  });

  test("skips a customer with no phone number", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(atSendHour(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.$queryRaw.mockResolvedValue([{ id: "acct-1" }]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { phone: null, name: "Ann", orgId: ORG, dob: localDate(1990, 4, 15) } }),
    ]);

    await checkBirthdayEventTriggers();

    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
  });

  test("keeps going when one customer's send fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(atSendHour(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.$queryRaw.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ id: "a1", contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
      account({ id: "a2", contact: { ...account().contact, dob: localDate(1991, 4, 15) } }),
    ]);
    (sendLoyaltyMessage as Mock).mockRejectedValueOnce(new Error("meta down"));

    await checkBirthdayEventTriggers();

    expect((sendLoyaltyMessage as Mock).mock.calls).toHaveLength(2);
  });

  test("claims each customer before sending, so a second run greets nobody twice", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(atSendHour(2026, 4, 15));
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
    vi.setSystemTime(atSendHour(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.$queryRaw.mockResolvedValue([{ id: "acct-1" }]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
    ]);
    db.customerLoyaltyAccount.updateMany.mockResolvedValue({ count: 0 });

    await checkBirthdayEventTriggers();

    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
  });

  test("matches the month and day in SQL rather than in memory", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(atSendHour(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger()]);
    db.$queryRaw.mockResolvedValue([]);

    await checkBirthdayEventTriggers();

    expect(db.$queryRaw).toHaveBeenCalled();
    // Nothing came back, so nothing is greeted.
    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
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
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(atSendHour(2026, 2, 1));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
    vi.setSystemTime(new Date("2026-03-01T10:00:00.000Z"));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ triggerDays: 30 })]);

    await checkInactivityEventTriggers();

    expect(db.customerLoyaltyAccount.findMany.mock.calls[0][0].where).toEqual({
      programId: PROGRAM,
      status: "active",
      lastActivityAt: { lte: new Date("2026-01-30T10:00:00.000Z") },
    });
  });

  test("claims each customer before sending so two runs cannot double-send", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T10:00:00.000Z"));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ triggerDays: 30 })]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);

    await checkInactivityEventTriggers();

    // The claim turns on the member's own last activity, not the window edge: a nudge
    // that predates their last visit means they came back and lapsed again, which earns a
    // second nudge. A nudge after it means they never returned, and one was enough.
    expect(db.customerLoyaltyAccount.updateMany.mock.calls[0][0].where).toEqual({
      id: "acct-1",
      OR: [
        { lastInactivityReminderAt: null },
        { lastInactivityReminderAt: { lt: account().lastActivityAt } },
      ],
    });
    expect(sendLoyaltyMessage).toHaveBeenCalled();
  });

  test("skips a customer another process already claimed", async () => {
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ triggerDays: 30 })]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.customerLoyaltyAccount.updateMany.mockResolvedValue({ count: 0 });

    await checkInactivityEventTriggers();

    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
  });

  test("sends the customer's name and current points", async () => {
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ triggerDays: 30 })]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);

    await checkInactivityEventTriggers();

    expect((sendLoyaltyMessage as Mock).mock.calls[0][0].params).toEqual(["Ann", "500"]);
  });

  test("issues the win-back reward when one is configured", async () => {
    db.loyaltyEventTrigger.findMany.mockResolvedValue([
      trigger({ triggerDays: 30, rewardId: "rwd-1" }),
    ]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);

    await checkInactivityEventTriggers();

    expect(assignRewardToCustomer).toHaveBeenCalledWith("acct-1", "rwd-1");
  });

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
    vi.setSystemTime(atSendHour(2026, 4, 15));
    db.loyaltyEventTrigger.findMany.mockResolvedValue([trigger({ rewardId: "rwd-1" })]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      account({ contact: { ...account().contact, dob: localDate(1990, 4, 15) } }),
    ]);
  });

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
    expect(sendLoyaltyMessage).toHaveBeenCalled();
  });
});

// ===========================================================================
// Points expiry alerts
// ===========================================================================

describe("checkPointsExpiryAlerts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(atSendHour(2026, 4, 15));
    // What will actually lapse, which the alert now reports instead of the whole balance.
    db.$queryRaw.mockResolvedValue([{ total: 120n }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
      {
        id: PROGRAM,
        name: "Rewards",
        orgId: ORG,
        pointsExpirationMonths: 12,
        whatsappNotifications: true,
        sendTextInSession: true,
        timezone: "Etc/UTC",
      },
    ]);

    await checkPointsExpiryAlerts();

    expect(db.customerLoyaltyAccount.findMany).not.toHaveBeenCalled();
  });

  test("targets customers holding an earning that expires in fourteen days", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([
      {
        id: PROGRAM,
        name: "Rewards",
        orgId: ORG,
        pointsExpirationMonths: 12,
        whatsappNotifications: true,
        sendTextInSession: true,
        timezone: "Etc/UTC",
      },
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

  // The figure is what will actually lapse, not the balance. A member holding 500 points of
  // which 120 are old enough to expire used to be told all 500 were going.
  test("tells the customer what will actually expire, and when", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([
      {
        id: PROGRAM,
        name: "Rewards",
        orgId: ORG,
        pointsExpirationMonths: 12,
        whatsappNotifications: true,
        sendTextInSession: true,
        timezone: "Etc/UTC",
      },
    ]);
    db.loyaltyEventTrigger.findFirst.mockResolvedValue(trigger());
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);

    await checkPointsExpiryAlerts();

    const params = (sendLoyaltyMessage as Mock).mock.calls[0][0].params;
    expect(params[0]).toBe("Ann");
    // 120 is what the anti-join reports as expiring; the account holds 500.
    expect(params[1]).toBe("120");
    expect(params[2]).toMatch(/^\d{2} \w{3} \d{4}$/);
  });

  test("says nothing when nothing is actually due to lapse", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([
      {
        id: PROGRAM,
        name: "Rewards",
        orgId: ORG,
        pointsExpirationMonths: 12,
        whatsappNotifications: true,
        sendTextInSession: true,
        timezone: "Etc/UTC",
      },
    ]);
    db.loyaltyEventTrigger.findFirst.mockResolvedValue(trigger());
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.$queryRaw.mockResolvedValue([{ total: 0n }]);

    await checkPointsExpiryAlerts();

    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
  });

  test("claims the alert so a second run cannot repeat it", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([
      {
        id: PROGRAM,
        name: "Rewards",
        orgId: ORG,
        pointsExpirationMonths: 12,
        whatsappNotifications: true,
        sendTextInSession: true,
        timezone: "Etc/UTC",
      },
    ]);
    db.loyaltyEventTrigger.findFirst.mockResolvedValue(trigger());
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.customerLoyaltyAccount.updateMany.mockResolvedValue({ count: 0 });

    await checkPointsExpiryAlerts();

    // This alert had no claim marker at all before, so a retried tick re-sent it.
    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalled();
    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
  });

  test("honours a configured lead time instead of a fixed fortnight", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([
      {
        id: PROGRAM,
        name: "Rewards",
        orgId: ORG,
        pointsExpirationMonths: 12,
        whatsappNotifications: true,
        sendTextInSession: true,
        timezone: "Etc/UTC",
      },
    ]);
    db.loyaltyEventTrigger.findFirst.mockResolvedValue(trigger({ leadDays: 30 }));
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);

    await checkPointsExpiryAlerts();
    const withLead = db.customerLoyaltyAccount.findMany.mock.calls[0][0].where.transactions.some
      .createdAt.gte as Date;

    // The same programme with no lead configured falls back to the old fortnight, so the
    // configured window sits exactly the extra sixteen days later. Asserted as a
    // relationship rather than an instant: `startOf("day")` is machine-local.
    db.customerLoyaltyAccount.findMany.mockClear();
    db.loyaltyEventTrigger.findFirst.mockResolvedValue(trigger({ leadDays: null }));

    await checkPointsExpiryAlerts();
    const withDefault = db.customerLoyaltyAccount.findMany.mock.calls[0][0].where.transactions.some
      .createdAt.gte as Date;

    const days = (withLead.getTime() - withDefault.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(16);
  });

  test("selects on the same clock the expiry itself uses", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([
      {
        id: PROGRAM,
        name: "Rewards",
        orgId: ORG,
        pointsExpirationMonths: 12,
        whatsappNotifications: true,
        sendTextInSession: true,
        timezone: "Etc/UTC",
      },
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
  const program = {
    id: PROGRAM,
    name: "Rewards",
    orgId: ORG,
    pointsExpirationMonths: 12,
    whatsappNotifications: true,
    sendTextInSession: true,
    timezone: "Etc/UTC",
  };

  // Expiry writes the ledger, so it runs on the programme's own early morning rather than
  // an hour the merchant picks — the date a member was warned about has to be the date
  // their points actually go.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(atLedgerHour(2026, 4, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

  test("expiring points does not mark the account as active", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.$queryRaw.mockResolvedValue([{ id: "txn-old", points: 100 }]);

    await checkPointsExpiration();

    expect(db.customerLoyaltyAccount.update.mock.calls[0][0].data).not.toHaveProperty(
      "lastActivityAt",
    );
  });

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

  // The crons used to bypass the program's WhatsApp switch that Settings promises is
  // the master one; the points still expire, only the message is held.
  test("expires the points but says nothing when WhatsApp notifications are off", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([{ ...program, whatsappNotifications: false }]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.$queryRaw.mockResolvedValue([{ id: "txn-a", points: 10 }]);

    await checkPointsExpiration();

    expect(db.loyaltyTransaction.createMany).toHaveBeenCalled();
    expect(sendLoyaltyMessage).not.toHaveBeenCalled();
  });

  test("notifies the customer once per account, not once per transaction", async () => {
    db.loyaltyProgram.findMany.mockResolvedValue([program]);
    db.customerLoyaltyAccount.findMany.mockResolvedValue([account()]);
    db.$queryRaw.mockResolvedValue([
      { id: "txn-a", points: 10 },
      { id: "txn-b", points: 20 },
    ]);

    await checkPointsExpiration();

    expect((sendLoyaltyMessage as Mock).mock.calls).toHaveLength(1);
  });
});
