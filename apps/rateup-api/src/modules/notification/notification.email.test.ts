import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { orgMember: { findMany: vi.fn() }, notification: { create: vi.fn() } },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../mobileNotification/mobile.service.js", () => ({
  sendPushNotification: vi.fn(),
  checkPushReceipts: vi.fn(),
}));
vi.mock("../../utils/email/sendAWSEmail.js", () => ({ sendAWSEmail: vi.fn() }));
vi.mock("../../utils/email/payments/usageLimitAlert.js", () => ({
  sendUsageLimitMailAlert: vi.fn(),
}));

import { sendAWSEmail } from "../../utils/email/sendAWSEmail.js";
import { processNotification } from "./notification.service.js";

const job = (emailData: Record<string, unknown>) => ({ id: "1", data: { emailData } }) as never;

describe("processing an email job", () => {
  beforeEach(() => {
    vi.mocked(sendAWSEmail).mockReset().mockResolvedValue(true);
  });

  test("retries a send that failed, by throwing", async () => {
    // A throttled or transient SES failure is worth another attempt.
    vi.mocked(sendAWSEmail).mockResolvedValue(false);

    await expect(
      processNotification(job({ to: "owner@test.example", subject: "s", text: "t", html: "h" })),
    ).rejects.toThrow(/Email send failed/);
  });

  test("drops a job with no recipient instead of retrying it five times", async () => {
    // SES refuses it with "Missing required header 'To'" every single time, so throwing
    // only buys five stack traces and five pointless API calls.
    await expect(
      processNotification(job({ subject: "s", text: "t", html: "h" })),
    ).resolves.not.toThrow();

    expect(sendAWSEmail).not.toHaveBeenCalled();
  });
});
