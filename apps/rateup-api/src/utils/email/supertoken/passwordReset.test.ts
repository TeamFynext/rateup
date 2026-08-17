import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../workers/bullmq/queues/index.js", () => ({ notificationQueue: { add: vi.fn() } }));

import { notificationQueue } from "../../../workers/bullmq/queues/index.js";
import { logoUrl } from "../react/brand.js";
import { createEmailBody, sendResetPasswordMail } from "./passwordReset.js";

type Mock = ReturnType<typeof vi.fn>;

const addJobMock = notificationQueue.add as unknown as Mock;

const RESET_LINK = "https://app.rateup.app/auth/reset-password?token=tok-123&rid=emailpassword";
const ESCAPED_RESET_LINK = RESET_LINK.replace("&", "&amp;");
const EMAIL = "owner@acme.com";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sendResetPasswordMail", () => {
  test("queues a notification job addressed to the requesting user", async () => {
    await sendResetPasswordMail(RESET_LINK, EMAIL);

    expect(addJobMock).toHaveBeenCalledTimes(1);
    const [jobName, payload] = addJobMock.mock.calls[0];
    expect(jobName).toBe("notification");
    expect(payload.emailData).toMatchObject({
      to: EMAIL,
      subject: "Password Reset - RateUp.app",
      text: "Reset password for your rateup account.",
    });
  });

  test("carries the one-time reset link through to the queued email body", async () => {
    await sendResetPasswordMail(RESET_LINK, EMAIL);

    // The link lands in an href, so its `&` arrives html-escaped.
    expect(addJobMock.mock.calls[0][1].emailData.html).toContain(ESCAPED_RESET_LINK);
  });

  test.each([
    ["no reset link", "", EMAIL],
    ["no recipient", RESET_LINK, ""],
    ["neither", "", ""],
    ["an undefined reset link", undefined, EMAIL],
    ["an undefined recipient", RESET_LINK, undefined],
  ])("sends nothing when the request has %s", async (_name, link, email) => {
    await sendResetPasswordMail(link as string, email as string);

    expect(addJobMock).not.toHaveBeenCalled();
  });

  test("surfaces a queue failure as an email-sending error", async () => {
    addJobMock.mockRejectedValue(new Error("redis unavailable"));

    await expect(sendResetPasswordMail(RESET_LINK, EMAIL)).rejects.toThrow(
      "Email sending failed. E:Error: redis unavailable",
    );
  });
});

describe("createEmailBody", () => {
  test("puts the reset link on the call-to-action button", async () => {
    const html = await createEmailBody(RESET_LINK);

    expect(html).toContain(`href="${ESCAPED_RESET_LINK}"`);
    expect(html).toContain("Set a new password");
  });

  test("renders the RateUp logo from the CDN", async () => {
    expect(await createEmailBody(RESET_LINK)).toContain(logoUrl());
  });

  test("explains why the email arrived", async () => {
    expect(await createEmailBody(RESET_LINK)).toContain(
      "Someone asked to reset the password on the RateUp account registered to this address",
    );
  });

  test("tells the reader what happens if they ignore it", async () => {
    expect(await createEmailBody(RESET_LINK)).toContain(
      "your current password stays exactly as it is until someone opens the link",
    );
  });
});
