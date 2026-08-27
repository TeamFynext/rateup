import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    usageStats: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    // The gate now reads the allowance through getConversationAllowance, which adds any
    // conversation packs the org has bought.
    subscriptionAddon: { findMany: vi.fn(() => Promise.resolve([])) },
  },
}));

import prisma from "../../../utils/prisma.js";
import { UNLIMITED_COUNT } from "../../subscription/subscription.data.js";
import { checkConversationLimitAvailable } from "./wasurvey.auth.js";

/**
 * The gate every WhatsApp send passes through. `true` means "allowed"; `false` refuses
 * the send, so a wrong answer here is a customer whose messages silently stop.
 */
describe("the conversation send gate", () => {
  function onPlan(max: number | undefined, used: number, isAnnual = false) {
    vi.mocked(prisma.usageStats.findUnique).mockResolvedValue({
      monthlyMeteredConversationsCount: used,
      annualMeteredConversationsCount: used,
    } as never);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      isAnnualMessageLimit: isAnnual,
      features: max === undefined ? {} : { whatsapp: { conversation: { count: { max } } } },
    } as never);
  }

  beforeEach(() => {
    vi.mocked(prisma.usageStats.findUnique).mockReset();
    vi.mocked(prisma.subscription.findUnique).mockReset();
  });

  test("allows a send below the allowance", async () => {
    onPlan(10_000, 9_999);
    expect(await checkConversationLimitAvailable("org-1")).toBe(true);
  });

  test("refuses a send once the allowance is spent", async () => {
    onPlan(10_000, 10_000);
    expect(await checkConversationLimitAvailable("org-1")).toBe(false);
  });

  test("never refuses an uncapped plan, however much it has used", async () => {
    // Enterprise is invoiced on actual usage. Its allowance is a sentinel, not a
    // ceiling — comparing against it would eventually cut off a contracted customer.
    onPlan(UNLIMITED_COUNT, UNLIMITED_COUNT + 1);
    expect(await checkConversationLimitAvailable("org-1")).toBe(true);
  });

  test("treats a hand-set effectively-unlimited figure the same way", async () => {
    onPlan(5_000_000, 4_999_999);
    expect(await checkConversationLimitAvailable("org-1")).toBe(true);
  });

  test("allows the send when the plan states no allowance at all", async () => {
    onPlan(undefined, 1_000_000);
    expect(await checkConversationLimitAvailable("org-1")).toBe(true);
  });

  test("counts an annual allowance across the year", async () => {
    // 11,000 used against a 10,000/month annual plan is well inside 120,000.
    onPlan(10_000, 11_000, true);
    expect(await checkConversationLimitAvailable("org-1")).toBe(true);
  });

  test("counts a conversation pack towards the allowance", async () => {
    // The customer paid for the headroom; refusing at the plan's bare number would be
    // taking money for capacity and then not honouring it.
    onPlan(5_000, 6_000);
    vi.mocked(prisma.subscriptionAddon.findMany).mockResolvedValue([{ quantity: 1 }] as never);

    expect(await checkConversationLimitAvailable("org-1")).toBe(true);
  });

  test("still refuses once the plan and its packs are both spent", async () => {
    onPlan(5_000, 10_000);
    vi.mocked(prisma.subscriptionAddon.findMany).mockResolvedValue([{ quantity: 1 }] as never);

    expect(await checkConversationLimitAvailable("org-1")).toBe(false);
  });
});
