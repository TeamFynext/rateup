import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    $queryRaw: vi.fn(),
    usageStats: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    subscriptionAddon: { findMany: vi.fn() },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("./limitAlerts.js", () => ({ maybeNotifyLimitReached: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import {
  canMessageContact,
  getActiveContactBudget,
  normalizeCustomerId,
  recordActiveContact,
  type RecordActiveContactInput,
} from "./activeContacts.js";
import { currentPeriodStart, periodKey } from "./billingPeriod.js";
import { maybeNotifyLimitReached } from "./limitAlerts.js";
import { UNLIMITED_COUNT } from "./subscription.data.js";

const queryRaw = vi.mocked(prisma.$queryRaw);

function onPlan(max: number | undefined, used: number, packs = 0) {
  vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
    features:
      max === undefined ? {} : { whatsapp: { activeContacts: { active: true, count: { max } } } },
  } as never);
  vi.mocked(prisma.usageStats.findUnique).mockResolvedValue({
    activeContactsCount: used,
    activeContactsPeriodStart: currentPeriodStart(),
  } as never);
  vi.mocked(prisma.subscriptionAddon.findMany).mockResolvedValue(
    (packs ? [{ quantity: packs, creditsGranted: null, creditsUsed: 0 }] : []) as never,
  );
}

/** The values interpolated into the nth raw query, in order. */
function queryValues(call: number): unknown[] {
  return queryRaw.mock.calls[call].slice(1);
}

beforeEach(() => {
  vi.clearAllMocks();
  queryRaw.mockReset();
});

describe("normalizeCustomerId", () => {
  test("reduces a WhatsApp id to its digits", () => {
    expect(normalizeCustomerId("WHATSAPP", "+91 98765-43210")).toBe("919876543210");
  });

  test("leaves other channels' ids alone", () => {
    expect(normalizeCustomerId("INSTAGRAM", "ig-123")).toBe("ig-123");
  });
});

describe("recordActiveContact", () => {
  const input: RecordActiveContactInput = {
    orgId: "org-1",
    platform: "WHATSAPP",
    customerId: "+91 98765 43210",
    at: new Date("2026-10-15T10:00:00Z"),
    direction: "receive",
    isBroadcast: false,
  };

  test("does not count a contact who was only sent a broadcast", async () => {
    await recordActiveContact({ ...input, direction: "send", isBroadcast: true });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  test("counts a contact who replies to a broadcast", async () => {
    onPlan(1_000, 1);
    queryRaw.mockResolvedValueOnce([{ id: "ac-1" }] as never);
    queryRaw.mockResolvedValueOnce([{ count: 1 }] as never);

    await recordActiveContact({ ...input, direction: "receive", isBroadcast: true });

    expect(queryRaw).toHaveBeenCalledTimes(2);
  });

  test("counts a non-broadcast outbound message", async () => {
    onPlan(1_000, 1);
    queryRaw.mockResolvedValueOnce([{ id: "ac-1" }] as never);
    queryRaw.mockResolvedValueOnce([{ count: 1 }] as never);

    await recordActiveContact({ ...input, direction: "send" });

    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(queryValues(0)).toContain("OUTBOUND");
  });

  test("records the WhatsApp id as digits, in the period of the message", async () => {
    queryRaw.mockResolvedValueOnce([] as never);

    await recordActiveContact(input);

    const values = queryValues(0);
    expect(values).toContain("919876543210");
    expect(values).toContain("WHATSAPP:919876543210");
    expect(values).toContain(periodKey(new Date("2026-10-01T00:00:00Z")));
    expect(values).toContain("INBOUND");
  });

  test("keys the row by contact id when the contact is known", async () => {
    queryRaw.mockResolvedValueOnce([] as never);

    await recordActiveContact({ ...input, contactId: "contact-1" });

    expect(queryValues(0)[2]).toBe("contact-1");
  });

  test("leaves the counter alone when the contact was already counted this month", async () => {
    queryRaw.mockResolvedValueOnce([] as never);

    await recordActiveContact(input);

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(maybeNotifyLimitReached).not.toHaveBeenCalled();
  });

  test("alerts when the count reaches the allowance, packs included", async () => {
    onPlan(1_000, 0, 1);
    queryRaw.mockResolvedValueOnce([{ id: "ac-1" }] as never);
    queryRaw.mockResolvedValueOnce([{ count: 2_000 }] as never);

    await recordActiveContact(input);

    expect(maybeNotifyLimitReached).toHaveBeenCalledWith(
      "org-1",
      "activeContacts",
      new Date("2026-10-01T00:00:00Z"),
    );
  });

  test("does not alert below the allowance", async () => {
    onPlan(1_000, 0, 1);
    queryRaw.mockResolvedValueOnce([{ id: "ac-1" }] as never);
    queryRaw.mockResolvedValueOnce([{ count: 1_999 }] as never);

    await recordActiveContact(input);

    expect(maybeNotifyLimitReached).not.toHaveBeenCalled();
  });

  test("never alerts an uncapped plan", async () => {
    onPlan(UNLIMITED_COUNT, 0);
    queryRaw.mockResolvedValueOnce([{ id: "ac-1" }] as never);
    queryRaw.mockResolvedValueOnce([{ count: UNLIMITED_COUNT + 1 }] as never);

    await recordActiveContact(input);

    expect(maybeNotifyLimitReached).not.toHaveBeenCalled();
  });

  test("swallows a database failure so the message still goes through", async () => {
    queryRaw.mockRejectedValueOnce(new Error("db down"));

    await expect(recordActiveContact(input)).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalled();
  });
});

describe("getActiveContactBudget", () => {
  test("adds in-date contact packs to the plan's allowance", async () => {
    onPlan(1_000, 812, 1);

    expect(await getActiveContactBudget("org-1")).toMatchObject({
      metered: true,
      used: 812,
      max: 2_000,
      planMax: 1_000,
      addonContacts: 1_000,
      remaining: 1_188,
      exhausted: false,
    });
  });

  test("is exhausted exactly at the allowance", async () => {
    onPlan(1_000, 1_000);
    expect((await getActiveContactBudget("org-1")).exhausted).toBe(true);
  });

  test("starts a new month at zero, whatever last month's counter says", async () => {
    onPlan(1_000, 1_000);
    vi.mocked(prisma.usageStats.findUnique).mockResolvedValue({
      activeContactsCount: 1_000,
      activeContactsPeriodStart: new Date("2020-01-01T00:00:00Z"),
    } as never);

    expect(await getActiveContactBudget("org-1")).toMatchObject({ used: 0, exhausted: false });
  });

  test.each([
    ["the unlimited sentinel", UNLIMITED_COUNT],
    ["no allowance at all", undefined],
  ])("does not meter %s", async (_label, max) => {
    onPlan(max, 9_999_999);

    const budget = await getActiveContactBudget("org-1");

    expect(budget).toMatchObject({ metered: false, exhausted: false });
    expect(budget.max).toBeUndefined();
  });
});

describe("canMessageContact", () => {
  const recipient = { platform: "WHATSAPP" as const, customerId: "+919876543210" };

  test("allows any recipient under the allowance without looking them up", async () => {
    onPlan(1_000, 999);

    expect(await canMessageContact("org-1", recipient)).toBe(true);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  test("allows a contact already counted this month once the allowance is spent", async () => {
    onPlan(1_000, 1_000);
    queryRaw.mockResolvedValueOnce([{ hit: 1 }] as never);

    expect(await canMessageContact("org-1", recipient)).toBe(true);
    expect(queryValues(0)).toContain("919876543210");
  });

  test("refuses a new contact once the allowance is spent", async () => {
    onPlan(1_000, 1_000);
    queryRaw.mockResolvedValueOnce([] as never);

    expect(await canMessageContact("org-1", recipient)).toBe(false);
  });

  test("refuses when the allowance is spent and no recipient is named", async () => {
    onPlan(1_000, 1_000);

    expect(await canMessageContact("org-1")).toBe(false);
    expect(queryRaw).not.toHaveBeenCalled();
  });
});
