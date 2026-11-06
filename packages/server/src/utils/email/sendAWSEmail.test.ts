import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// `vi.mock` is hoisted above every const in the file, so the transport has to
// reach its spy through a getter rather than closing over one.
const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));

vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));
vi.mock("@aws-sdk/client-sesv2", () => ({
  SESv2Client: class {},
  SendEmailCommand: class {},
}));
vi.mock("../logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

import { sendAWSEmail } from "./sendAWSEmail.js";

const email = { to: "someone@example.com", subject: "Hi", text: "body", html: "<p>body</p>" };

describe("sendAWSEmail", () => {
  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({});
    delete process.env.DISABLE_EMAIL;
  });

  afterEach(() => {
    delete process.env.DISABLE_EMAIL;
  });

  test("sends through SES by default", async () => {
    await expect(sendAWSEmail(email)).resolves.toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  test("sends nothing when DISABLE_EMAIL is set", async () => {
    process.env.DISABLE_EMAIL = "true";

    await expect(sendAWSEmail(email)).resolves.toBe(true);
    expect(sendMail).not.toHaveBeenCalled();
  });

  // Reporting failure would make the caller throw, which asks BullMQ to retry —
  // turning every suppressed email into three suppressed emails and a failed job.
  test("reports success when suppressed, so nothing retries", async () => {
    process.env.DISABLE_EMAIL = "true";

    await expect(sendAWSEmail(email)).resolves.toBe(true);
  });

  test("only the exact value 'true' disables it", async () => {
    process.env.DISABLE_EMAIL = "false";

    await sendAWSEmail(email);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  test("reports failure when SES rejects, so the caller can retry", async () => {
    sendMail.mockRejectedValue(new Error("throttled"));

    await expect(sendAWSEmail(email)).resolves.toBe(false);
  });
});
