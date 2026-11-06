import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../prisma.js", () => ({
  default: { subscription: { findMany: vi.fn() } },
}));

vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  notificationQueue: { add: vi.fn() },
}));

vi.mock("../../logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

vi.mock("../react/templates.js", () => ({
  renderSubscriptionExpiryEmail: vi.fn(async (props: { stage: string }) => `html:${props.stage}`),
}));

import prisma from "../../prisma.js";
import { notificationQueue } from "../../../workers/bullmq/queues/index.js";
import { subscriptionExpiryAlert } from "./subscriptionExpiryAlert.js";

const DAY = 24 * 60 * 60 * 1000;

function subscription(daysUntilExpiry: number, overrides: Record<string, unknown> = {}) {
  return {
    orgId: "org-1",
    expiresAt: new Date(Date.now() + daysUntilExpiry * DAY),
    basePlan: { displayName: "Pro" },
    org: { owner: { email: "owner@test.example", name: "Sam" } },
    ...overrides,
  };
}

/** The stage of every reminder queued, in order. */
function stagesSent() {
  return vi
    .mocked(notificationQueue.add)
    .mock.calls.map((call) => (call[1] as { emailData: { html: string } }).emailData.html);
}

describe("subscription expiry reminders", () => {
  beforeEach(() => {
    vi.mocked(prisma.subscription.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
    vi.mocked(notificationQueue.add)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  test("only considers plans a gateway bills on a schedule", async () => {
    // Telling an Enterprise customer their contract "expires tomorrow" — when nothing
    // will actually happen to it — is worse than saying nothing.
    await subscriptionExpiryAlert();

    const where = vi.mocked(prisma.subscription.findMany).mock.calls[0]?.[0]?.where as {
      basePlan: { OR: unknown[] };
    };
    expect(where.basePlan.OR).toHaveLength(4);
  });

  test.each([
    [30, "30-days"],
    [15, "15-days"],
    [7, "7-days"],
    [3, "3-days"],
    [1, "tomorrow"],
    [0, "expired"],
  ])("warns %s days out with the %s stage", async (days, stage) => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([subscription(days)] as never);

    await subscriptionExpiryAlert();

    expect(stagesSent()).toEqual([`html:${stage}`]);
  });

  test("says nothing on a day that is not on the schedule", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([subscription(9)] as never);

    await subscriptionExpiryAlert();

    expect(notificationQueue.add).not.toHaveBeenCalled();
  });

  test("skips an org with no owner to write to, and still mails the others", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription(7, { orgId: "ownerless", org: { owner: null } }),
      subscription(7),
    ] as never);

    await subscriptionExpiryAlert();

    expect(stagesSent()).toEqual(["html:7-days"]);
  });

  test("one failed send does not cancel the rest of the run", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      subscription(7, { orgId: "org-a" }),
      subscription(7, { orgId: "org-b" }),
      subscription(7, { orgId: "org-c" }),
    ] as never);
    vi.mocked(notificationQueue.add).mockRejectedValueOnce(new Error("redis is down"));

    await expect(subscriptionExpiryAlert()).resolves.not.toThrow();
    expect(notificationQueue.add).toHaveBeenCalledTimes(3);
  });
});
