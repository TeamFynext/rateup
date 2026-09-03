import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../prisma.js", () => ({
  default: { subscription: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  notificationQueue: { add: vi.fn() },
}));
vi.mock("../../logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../react/templates.js", () => ({
  renderUsageLimitEmail: vi.fn(async () => "html"),
}));

import prisma from "../../prisma.js";
import { notificationQueue } from "../../../workers/bullmq/queues/index.js";
import { sendUsageLimitMailAlert } from "./usageLimitAlert.js";

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    orgId: "org-1",
    lastLimitAlertSentAt: null,
    org: { owner: { email: "owner@test.example" } },
    ...overrides,
  };
}

describe("the usage-limit alert", () => {
  beforeEach(() => {
    vi.mocked(prisma.subscription.findUnique)
      .mockReset()
      .mockResolvedValue(subscription() as never);
    vi.mocked(prisma.subscription.update)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(notificationQueue.add)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  test("queues the alert to the org's owner and stamps it as sent", async () => {
    await sendUsageLimitMailAlert("org-1");

    const [, job] = vi.mocked(notificationQueue.add).mock.calls[0] as [string, any];
    expect(job.emailData.to).toBe("owner@test.example");
    expect(prisma.subscription.update).toHaveBeenCalled();
  });

  test("queues nothing when there is no owner email to send to", async () => {
    // The bug this covers: `to` was read straight off the relation with nothing checking
    // it, so an org whose owner could not be read queued an email addressed to
    // `undefined`. SES refused it — "Missing required header 'To'" — and BullMQ retried
    // that same undeliverable job five times with backoff.
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
      subscription({ org: { owner: null } }) as never,
    );

    await sendUsageLimitMailAlert("org-1");

    expect(notificationQueue.add).not.toHaveBeenCalled();
  });

  test("does not silence the org for a week over a mail it could not send", async () => {
    // Stamping `lastLimitAlertSentAt` is what suppresses the next six days of alerts. Doing
    // it for a send that never happened would cost the org the one warning it gets.
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
      subscription({ org: { owner: null } }) as never,
    );

    await sendUsageLimitMailAlert("org-1");

    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  test("stays quiet when one went out inside the last week", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
      subscription({ lastLimitAlertSentAt: new Date() }) as never,
    );

    await sendUsageLimitMailAlert("org-1");

    expect(notificationQueue.add).not.toHaveBeenCalled();
  });

  test("sends again once the week has passed", async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
      subscription({ lastLimitAlertSentAt: eightDaysAgo }) as never,
    );

    await sendUsageLimitMailAlert("org-1");

    expect(notificationQueue.add).toHaveBeenCalledTimes(1);
  });
});
