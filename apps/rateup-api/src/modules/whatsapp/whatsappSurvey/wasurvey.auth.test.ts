import { beforeEach, describe, expect, test, vi } from "vitest";

// The conversation-limit guard reads usage + subscription from prisma; mock it so
// the tests are pure and never touch a database.
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    usageStats: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    // The gate reads the allowance through getConversationAllowance, which adds any
    // conversation packs the org holds; no packs here.
    subscriptionAddon: { findMany: vi.fn(() => Promise.resolve([])) },
  },
}));

import prisma from "../../../utils/prisma.js";
import {
  assertWithinConversationLimit,
  checkConversationLimitAvailable,
  ConversationLimitError,
} from "./wasurvey.auth.js";

const usageMock = prisma.usageStats.findUnique as unknown as ReturnType<typeof vi.fn>;
const subMock = prisma.subscription.findUnique as unknown as ReturnType<typeof vi.fn>;

function seed({
  monthly = 0,
  annual = 0,
  max = 500,
  isAnnual = false,
}: {
  monthly?: number;
  annual?: number;
  max?: number;
  isAnnual?: boolean;
}) {
  // The guard reads the METERED counters (self-derived 24h windows). The inbox-ticket
  // counters are seeded to deliberately conflicting values so a regression that reads
  // them again fails loudly instead of coincidentally agreeing.
  usageMock.mockResolvedValue({
    monthlyMeteredConversationsCount: monthly,
    annualMeteredConversationsCount: annual,
    monthlyConversationsCount: 0,
    annualConversationsCount: 0,
  });
  subMock.mockResolvedValue({
    isAnnualMessageLimit: isAnnual,
    features: { whatsapp: { conversation: { count: { max } } } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ConversationLimitError", () => {
  test("carries a 403 status, its own name, and a default upgrade message", () => {
    const err = new ConversationLimitError();
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(403);
    expect(err.name).toBe("ConversationLimitError");
    expect(err.message).toMatch(/conversation limit reached/i);
    expect(err.message).toMatch(/upgrade/i);
  });

  test("accepts a custom message", () => {
    expect(new ConversationLimitError("custom").message).toBe("custom");
  });
});

describe("checkConversationLimitAvailable (monthly plan)", () => {
  test("is within the allowance below the limit", async () => {
    seed({ monthly: 200, max: 500 });
    expect(await checkConversationLimitAvailable("org")).toBe(true);
  });

  test("is exceeded exactly at the limit (>= is the cutoff)", async () => {
    seed({ monthly: 500, max: 500 });
    expect(await checkConversationLimitAvailable("org")).toBe(false);
  });

  test("is exceeded above the limit", async () => {
    seed({ monthly: 501, max: 500 });
    expect(await checkConversationLimitAvailable("org")).toBe(false);
  });
});

describe("checkConversationLimitAvailable (annual pooled plan)", () => {
  test("pools at max * 12 and uses the annual counter", async () => {
    // 5000 annual against a 500/mo plan → pool of 6000, still within.
    seed({ annual: 5000, monthly: 999999, max: 500, isAnnual: true });
    expect(await checkConversationLimitAvailable("org")).toBe(true);
  });

  test("is exceeded once the annual pool is reached", async () => {
    seed({ annual: 6000, max: 500, isAnnual: true });
    expect(await checkConversationLimitAvailable("org")).toBe(false);
  });
});

describe("assertWithinConversationLimit", () => {
  test("resolves silently when within the allowance", async () => {
    seed({ monthly: 10, max: 500 });
    await expect(assertWithinConversationLimit("org")).resolves.toBeUndefined();
  });

  test("throws ConversationLimitError when over the allowance", async () => {
    seed({ monthly: 500, max: 500 });
    await expect(assertWithinConversationLimit("org")).rejects.toBeInstanceOf(
      ConversationLimitError,
    );
  });
});
