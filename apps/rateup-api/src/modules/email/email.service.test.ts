import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL = "https://cdn.test.example";
});

vi.mock("../../utils/prisma.js", () => ({
  default: {
    otpStore: { upsert: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("../../utils/email/sendAWSEmail.js", () => ({ sendAWSEmail: vi.fn() }));

import crypto from "node:crypto";
import prisma from "../../utils/prisma.js";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail.js";
import { sendEmailService, storeOtp, validateOtp } from "./email.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { otpStore: Record<string, Mock> };
const send = sendAWSEmail as unknown as Mock;

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

const NOW = new Date(2026, 6, 29, 10, 0, 0).getTime();
const TEN_MINUTES = 10 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  // clearAllMocks keeps implementations but drops return values, so every mock a
  // test reads through has to be re-armed here.
  db.otpStore.upsert.mockResolvedValue({ id: "otp-row" });
  db.otpStore.findUnique.mockResolvedValue(null);
  db.otpStore.delete.mockResolvedValue({ id: "otp-row" });
  send.mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// sendEmailService
// ===========================================================================

describe("sendEmailService", () => {
  const params = {
    toEmail: "recipient@example.test",
    subject: "Your code",
    purpose: "GeneralTemplate",
    text: "plain text fallback",
    data: { body: "hello", buttonLink: "https://app.example" },
  };

  test("sends exactly one message", async () => {
    await sendEmailService(params as never);

    expect(send).toHaveBeenCalledOnce();
  });

  // NOTE: every field of the outgoing message is copied straight from the
  // request body. On an unauthenticated route that makes recipient, subject and
  // body all caller-chosen.
  test("takes recipient, subject and text verbatim from the caller", async () => {
    await sendEmailService(params as never);

    const msg = send.mock.calls[0][0];
    expect(msg.to).toBe("recipient@example.test");
    expect(msg.subject).toBe("Your code");
    expect(msg.text).toBe("plain text fallback");
  });

  test("renders the html from the caller-chosen purpose", async () => {
    await sendEmailService(params as never);

    expect(send.mock.calls[0][0].html).toContain("hello");
  });

  test("escapes the caller's markup on the way into the html body", async () => {
    await sendEmailService({
      ...params,
      data: { body: "<b>urgent</b>", buttonLink: "https://evil.test/login" },
    } as never);

    const { html } = send.mock.calls[0][0];
    expect(html).not.toContain("<b>urgent</b>");
    expect(html).toContain("&lt;b&gt;urgent&lt;/b&gt;");
    // An ordinary http(s) link is still rendered.
    expect(html).toContain(`href="https://evil.test/login"`);
  });

  test("refuses to send when the purpose matches no template", async () => {
    await expect(
      sendEmailService({ ...params, purpose: "NoSuchTemplate" } as never),
    ).rejects.toThrow(/No email template/);

    expect(send).not.toHaveBeenCalled();
  });

  test("sets no from, reply-to or attachments of its own", async () => {
    await sendEmailService(params as never);

    const msg = send.mock.calls[0][0];
    expect(msg).not.toHaveProperty("from");
    expect(msg).not.toHaveProperty("replyTo");
    expect(msg.attachments).toBeUndefined();
  });

  test("does not validate the recipient before handing it to the transport", async () => {
    await sendEmailService({ ...params, toEmail: "not-an-email" } as never);

    expect(send.mock.calls[0][0].to).toBe("not-an-email");
  });

  // NOTE: a comma-separated string is a nodemailer address list, so one request
  // can address many recipients through a schema that only says z.string().
  test("passes a multi-recipient string through untouched", async () => {
    await sendEmailService({ ...params, toEmail: "a@x.test, b@y.test, c@z.test" } as never);

    expect(send.mock.calls[0][0].to).toBe("a@x.test, b@y.test, c@z.test");
  });

  test("resolves with nothing when the message went out", async () => {
    await expect(sendEmailService(params as never)).resolves.toBeUndefined();
  });

  test("fails when the transport reports the message was not sent", async () => {
    send.mockResolvedValueOnce(false);

    await expect(sendEmailService(params as never)).rejects.toThrow(/could not be sent/);
  });

  test("propagates a transport error too", async () => {
    send.mockRejectedValueOnce(new Error("SES rejected"));

    await expect(sendEmailService(params as never)).rejects.toThrow("SES rejected");
  });

  test("renders the payload it is given rather than the body's data", async () => {
    await sendEmailService(
      { ...params, data: { body: "from the body" } } as never,
      { body: "from the caller", buttonLink: "https://app.example" } as never,
    );

    expect(send.mock.calls[0][0].html).toContain("from the caller");
    expect(send.mock.calls[0][0].html).not.toContain("from the body");
  });
});

// ===========================================================================
// storeOtp
// ===========================================================================

describe("storeOtp", () => {
  test("stores the sha256 of the code, never the code itself", async () => {
    await storeOtp("123456", "user-1", "survey-1");

    const arg = db.otpStore.upsert.mock.calls[0][0];
    const serialised = JSON.stringify(arg);
    expect(arg.create.otp).toBe(sha256("123456"));
    expect(serialised).not.toContain("123456");
  });

  test("hashes with no salt, so the digest is the same for every user", async () => {
    await storeOtp("123456", "user-1");
    await storeOtp("123456", "user-2");

    const first = db.otpStore.upsert.mock.calls[0][0].create.otp;
    const second = db.otpStore.upsert.mock.calls[1][0].create.otp;
    expect(first).toBe(second);
  });

  test("sets the expiry ten minutes out", async () => {
    await storeOtp("123456", "user-1");

    const arg = db.otpStore.upsert.mock.calls[0][0];
    expect(arg.create.expiryDate).toBe(String(NOW + TEN_MINUTES));
    expect(arg.update.expiryDate).toBe(String(NOW + TEN_MINUTES));
  });

  // NOTE: expiryDate is a String column holding a stringified epoch. Nothing in
  // the database can compare, index or sweep it — expiry is enforced only by
  // the parseInt in validateOtp.
  test("writes the expiry as a string, not a date", async () => {
    await storeOtp("123456", "user-1");

    expect(typeof db.otpStore.upsert.mock.calls[0][0].create.expiryDate).toBe("string");
  });

  // NOTE: OtpStore.userId is @unique on its own and surveyId is not part of any
  // unique constraint (prisma/schema.prisma:1834-1840). The where here reads
  // like a compound key but only userId can select a row; surveyId is an extra
  // filter, and the create branch below it must satisfy the userId constraint.
  test("keys the upsert on userId with surveyId as an extra filter", async () => {
    await storeOtp("123456", "user-1", "survey-1");

    expect(db.otpStore.upsert.mock.calls[0][0].where).toEqual({
      userId: "user-1",
      surveyId: "survey-1",
    });
  });

  test("both branches carry the same code and expiry", async () => {
    await storeOtp("123456", "user-1", "survey-1");

    const { create, update } = db.otpStore.upsert.mock.calls[0][0];
    expect(update.otp).toBe(create.otp);
    expect(create.userId).toBe("user-1");
    expect(create.surveyId).toBe("survey-1");
  });

  // NOTE: Prisma drops undefined keys rather than matching NULL, so a call
  // without a surveyId selects the user's row whatever survey it was issued for.
  test("omits the survey filter entirely when no surveyId is given", async () => {
    await storeOtp("123456", "user-1");

    expect(db.otpStore.upsert.mock.calls[0][0].where.surveyId).toBeUndefined();
    expect(db.otpStore.upsert.mock.calls[0][0].create.surveyId).toBeUndefined();
  });

  test("issuing a second code for the same user rewrites the first", async () => {
    await storeOtp("111111", "user-1", "survey-1");
    await storeOtp("222222", "user-1", "survey-2");

    // Same unique key both times: one row per user, not one per user per survey.
    expect(db.otpStore.upsert.mock.calls[0][0].where.userId).toBe("user-1");
    expect(db.otpStore.upsert.mock.calls[1][0].where.userId).toBe("user-1");
  });

  test("does not reject a userId the caller invented", async () => {
    await storeOtp("123456", "anything-at-all");

    expect(db.otpStore.upsert).toHaveBeenCalledOnce();
  });

  test("propagates a write failure to the caller", async () => {
    db.otpStore.upsert.mockRejectedValueOnce(new Error("unique constraint"));

    await expect(storeOtp("123456", "user-1", "survey-2")).rejects.toThrow("unique constraint");
  });
});

// ===========================================================================
// validateOtp
// ===========================================================================

describe("validateOtp", () => {
  const stored = (over: Record<string, unknown> = {}) => ({
    id: "otp-row",
    userId: "user-1",
    surveyId: "survey-1",
    otp: sha256("123456"),
    expiryDate: String(NOW + TEN_MINUTES),
    ...over,
  });

  test("looks the row up by the hash, never by the plaintext", async () => {
    db.otpStore.findUnique.mockResolvedValueOnce(stored());

    await validateOtp("123456", "user-1", "survey-1");

    const where = db.otpStore.findUnique.mock.calls[0][0].where;
    expect(where.otp).toBe(sha256("123456"));
    expect(JSON.stringify(where)).not.toContain("123456");
  });

  // NOTE: `otp` is a plain non-unique column, so it cannot select a row on its
  // own; it rides along as a filter on the userId lookup.
  test("filters on userId, surveyId and the hash together", async () => {
    db.otpStore.findUnique.mockResolvedValueOnce(stored());

    await validateOtp("123456", "user-1", "survey-1");

    expect(db.otpStore.findUnique.mock.calls[0][0].where).toEqual({
      userId: "user-1",
      surveyId: "survey-1",
      otp: sha256("123456"),
    });
  });

  test("accepts an unexpired match", async () => {
    db.otpStore.findUnique.mockResolvedValueOnce(stored());

    await expect(validateOtp("123456", "user-1", "survey-1")).resolves.toBe(true);
  });

  test("consumes the code on a successful check", async () => {
    db.otpStore.findUnique.mockResolvedValue(stored());

    await expect(validateOtp("123456", "user-1", "survey-1")).resolves.toBe(true);

    expect(db.otpStore.delete).toHaveBeenCalledOnce();
    expect(db.otpStore.delete.mock.calls[0][0].where).toEqual(
      db.otpStore.findUnique.mock.calls[0][0].where,
    );
  });

  test("rejects and clears an expired code", async () => {
    db.otpStore.findUnique.mockResolvedValueOnce(stored({ expiryDate: String(NOW - 1) }));

    await expect(validateOtp("123456", "user-1", "survey-1")).resolves.toBe(false);
    expect(db.otpStore.delete).toHaveBeenCalledOnce();
  });

  test("the expiry comparison is strict, so the exact millisecond is expired", async () => {
    db.otpStore.findUnique.mockResolvedValueOnce(stored({ expiryDate: String(NOW) }));

    await expect(validateOtp("123456", "user-1", "survey-1")).resolves.toBe(false);
  });

  test("rejects when no row matches", async () => {
    db.otpStore.findUnique.mockResolvedValueOnce(null);

    await expect(validateOtp("999999", "user-1", "survey-1")).resolves.toBe(false);
    expect(db.otpStore.delete).not.toHaveBeenCalled();
  });

  test("a wrong guess neither clears the code nor records the attempt", async () => {
    db.otpStore.findUnique.mockResolvedValue(null);

    for (let i = 0; i < 25; i++) {
      await validateOtp(String(i).padStart(6, "0"), "user-1", "survey-1");
    }

    expect(db.otpStore.delete).not.toHaveBeenCalled();
    expect(db.otpStore.upsert).not.toHaveBeenCalled();
  });

  test("omits the survey filter when no surveyId is given", async () => {
    db.otpStore.findUnique.mockResolvedValueOnce(stored());

    await validateOtp("123456", "user-1");

    expect(db.otpStore.findUnique.mock.calls[0][0].where.surveyId).toBeUndefined();
  });

  // NOTE: parseInt on anything non-numeric yields NaN, and every comparison
  // with NaN is false — so a malformed expiry reads as expired and the row is
  // deleted. Fail-closed here, but silently.
  test("treats a malformed expiry as expired and deletes the row", async () => {
    db.otpStore.findUnique.mockResolvedValueOnce(stored({ expiryDate: "not-a-number" }));

    await expect(validateOtp("123456", "user-1", "survey-1")).resolves.toBe(false);
    expect(db.otpStore.delete).toHaveBeenCalledOnce();
  });

  // NOTE: parseInt stops at the first non-digit, so an ISO timestamp would be
  // read as its year — 2026 milliseconds after the epoch, i.e. always expired.
  test("reads an ISO expiry as its year", async () => {
    db.otpStore.findUnique.mockResolvedValueOnce(
      stored({ expiryDate: "2026-07-29T10:10:00.000Z" }),
    );

    await expect(validateOtp("123456", "user-1", "survey-1")).resolves.toBe(false);
  });

  test("deletes with the same filter it read with", async () => {
    db.otpStore.findUnique.mockResolvedValueOnce(stored({ expiryDate: String(NOW - 1) }));

    await validateOtp("123456", "user-1", "survey-1");

    expect(db.otpStore.delete.mock.calls[0][0].where).toEqual(
      db.otpStore.findUnique.mock.calls[0][0].where,
    );
  });

  test("propagates a lookup failure rather than answering false", async () => {
    db.otpStore.findUnique.mockRejectedValueOnce(new Error("db down"));

    await expect(validateOtp("123456", "user-1", "survey-1")).rejects.toThrow("db down");
  });
});
