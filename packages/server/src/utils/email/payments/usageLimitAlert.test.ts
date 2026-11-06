import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../prisma.js", () => ({
  default: {
    subscription: { updateMany: vi.fn() },
    orgMember: { findMany: vi.fn() },
    org: { findUnique: vi.fn() },
  },
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
import { recipientsWhere } from "../../../authz/recipients.js";
import { renderUsageLimitEmail } from "../react/templates.js";
import { sendFormResponseLimitAlert, sendUsageLimitMailAlert } from "./usageLimitAlert.js";

function members(...emails: (string | null)[]) {
  return emails.map((email) => ({ user: email === null ? null : { email } }));
}

function queuedRecipients() {
  return vi
    .mocked(notificationQueue.add)
    .mock.calls.map(([, job]) => (job as { emailData: { to: string } }).emailData.to);
}

describe("the usage-limit alert", () => {
  beforeEach(() => {
    vi.mocked(prisma.orgMember.findMany)
      .mockReset()
      .mockResolvedValue(members("admin@test.example") as never);
    vi.mocked(prisma.org.findUnique)
      .mockReset()
      .mockResolvedValue({ owner: { email: "owner@test.example" } } as never);
    vi.mocked(prisma.subscription.updateMany).mockReset();
    vi.mocked(notificationQueue.add)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  test("emails the owner and every member who can manage billing", async () => {
    const result = await sendUsageLimitMailAlert("org-1", "activeContacts");

    expect(prisma.orgMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org-1", ...recipientsWhere("billing.manage") },
      }),
    );
    expect(queuedRecipients().sort()).toEqual(["admin@test.example", "owner@test.example"]);
    expect(result).toEqual({ sent: 2 });
  });

  test("queues one job per recipient, mailing an owner who is also a member once", async () => {
    vi.mocked(prisma.orgMember.findMany).mockResolvedValue(
      members("owner@test.example", "admin@test.example", "admin@test.example", null) as never,
    );

    await sendUsageLimitMailAlert("org-1", "campaignCredits");

    expect(notificationQueue.add).toHaveBeenCalledTimes(2);
    expect(queuedRecipients().sort()).toEqual(["admin@test.example", "owner@test.example"]);
  });

  test("renders the email for the limit that was reached", async () => {
    await sendUsageLimitMailAlert("org-1", "campaignCredits");

    expect(renderUsageLimitEmail).toHaveBeenCalledWith("campaignCredits");
    const [, job] = vi.mocked(notificationQueue.add).mock.calls[0] as [string, any];
    expect(job.emailData.subject).toMatch(/campaign credits/i);
  });

  test("queues nothing when there is nobody to send to", async () => {
    // An undefined `to` is refused by SES and retried by BullMQ five times over.
    vi.mocked(prisma.orgMember.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.org.findUnique).mockResolvedValue({ owner: null } as never);

    const result = await sendUsageLimitMailAlert("org-1", "activeContacts");

    expect(notificationQueue.add).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0 });
  });
});

describe("the form-response alert", () => {
  beforeEach(() => {
    vi.mocked(prisma.orgMember.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
    vi.mocked(prisma.org.findUnique)
      .mockReset()
      .mockResolvedValue({ owner: { email: "owner@test.example" } } as never);
    vi.mocked(prisma.subscription.updateMany).mockReset();
    vi.mocked(notificationQueue.add)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  test("sends when it claims the week", async () => {
    vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 } as never);

    await sendFormResponseLimitAlert("org-1");

    expect(renderUsageLimitEmail).toHaveBeenCalledWith("formResponses");
    expect(notificationQueue.add).toHaveBeenCalledTimes(1);
  });

  test("stays quiet when one went out inside the last week", async () => {
    vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 0 } as never);

    const result = await sendFormResponseLimitAlert("org-1");

    expect(notificationQueue.add).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0 });
  });

  test("only claims a subscription not stamped within the last seven days", async () => {
    vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 0 } as never);
    const before = Date.now();

    await sendFormResponseLimitAlert("org-1");

    const { where } = vi.mocked(prisma.subscription.updateMany).mock.calls[0][0] as any;
    const cutoff = where.OR[1].lastLimitAlertSentAt.lt.getTime();
    expect(before - cutoff).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 1000);
    expect(where.OR[0]).toEqual({ lastLimitAlertSentAt: null });
  });
});
