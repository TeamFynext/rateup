import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL = "https://cdn.test.example";
});

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./email.service.js", () => ({
  sendEmailService: vi.fn(),
  storeOtp: vi.fn(),
  validateOtp: vi.fn(),
}));

import { log } from "../../utils/logger.js";
import { sendEmailService, storeOtp, validateOtp } from "./email.service.js";
import { sendEmailHandler, sendOTPEmailHandler, validateOTPHandler } from "./email.controller.js";
import { emailPublicRoutes } from "./email.public.route.js";
import { GenerateOtpSchema, sendEmailSchema, validateOtpSchema } from "./email.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const service = {
  send: sendEmailService as unknown as Mock,
  store: storeOtp as unknown as Mock,
  validate: validateOtp as unknown as Mock,
};

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  service.send.mockResolvedValue(undefined);
  service.store.mockResolvedValue(undefined);
  service.validate.mockResolvedValue(true);
});

// ===========================================================================
// sendEmailHandler
// ===========================================================================

describe("sendEmailHandler", () => {
  const body = {
    toEmail: "someone@example.test",
    subject: "Hello",
    purpose: "GeneralTemplate",
    text: "text",
    data: { body: "hi", buttonLink: "https://app.example" },
  };

  test("answers 200 once the send resolves", async () => {
    const rep = reply();

    await sendEmailHandler({ body } as never, rep);

    expect(answer(rep).code).toBe(200);
  });

  // NOTE: sendEmailService resolves with nothing, so the success response body
  // is undefined — the caller gets a 200 with no payload.
  test("sends the service's empty result as the response body", async () => {
    const rep = reply();

    await sendEmailHandler({ body } as never, rep);

    expect(answer(rep).body).toBeUndefined();
  });

  // NOTE: the whole request body — recipient address included — is written to
  // stdout with console.log rather than the project's logger, so it bypasses
  // both level filtering and redaction.
  test("prints the entire request body to stdout", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendEmailHandler({ body } as never, reply());

    expect(spy).toHaveBeenCalledWith(body);
    spy.mockRestore();
  });

  test("hands the request body to the service untouched", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendEmailHandler({ body } as never, reply());

    expect(service.send).toHaveBeenCalledWith(body);
    spy.mockRestore();
  });

  // NOTE: nothing in the handler consults request.session or an org — recipient
  // and content are whatever the unauthenticated caller supplied.
  test("delivers to any address the caller names", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const rep = reply();

    await sendEmailHandler({ body: { ...body, toEmail: "victim@elsewhere.test" } } as never, rep);

    expect(service.send.mock.calls[0][0].toEmail).toBe("victim@elsewhere.test");
    expect(answer(rep).code).toBe(200);
    spy.mockRestore();
  });

  test("logs the failure and answers 500", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    service.send.mockRejectedValueOnce(new Error("transport down"));
    const rep = reply();

    await sendEmailHandler({ body } as never, rep);

    expect(answer(rep).code).toBe(500);
    expect(log.error).toHaveBeenCalled();
    spy.mockRestore();
  });

  // NOTE: the raw message goes back to the caller on a public route.
  test("returns the raw error message to the caller", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    service.send.mockRejectedValueOnce(
      new Error(`Invalid \`prisma.otpStore.upsert()\` invocation on OtpStore.userId`),
    );
    const rep = reply();

    await sendEmailHandler({ body } as never, rep);

    expect(answer(rep).body.error).toContain("prisma.otpStore.upsert()");
    spy.mockRestore();
  });

  test("falls back to a fixed message when the throw has none", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    service.send.mockRejectedValueOnce({});
    const rep = reply();

    await sendEmailHandler({ body } as never, rep);

    expect(answer(rep).body).toEqual({ error: "Something Went Wrong! Try again." });
    spy.mockRestore();
  });
});

// ===========================================================================
// sendOTPEmailHandler
// ===========================================================================

describe("sendOTPEmailHandler", () => {
  const otpBody = () => ({
    toEmail: "respondent@example.test",
    subject: "Your code",
    purpose: "SurveyEmailOTPQuestion",
    text: "code",
    userId: "user-1",
    surveyId: "survey-1",
    data: { surveyName: "Customer NPS" },
  });

  test("stores a six digit code and answers 200", async () => {
    const rep = reply();

    await sendOTPEmailHandler({ body: otpBody() } as never, rep);

    expect(service.store.mock.calls[0][0]).toMatch(/^[0-9]{6}$/);
    expect(answer(rep).code).toBe(200);
  });

  test("stores against the userId and surveyId the caller supplied", async () => {
    await sendOTPEmailHandler({ body: otpBody() } as never, reply());

    expect(service.store.mock.calls[0].slice(1)).toEqual(["user-1", "survey-1"]);
  });

  test("stores the code before attempting to send it", async () => {
    const order: string[] = [];
    service.store.mockImplementationOnce(async () => void order.push("store"));
    service.send.mockImplementationOnce(async () => void order.push("send"));

    await sendOTPEmailHandler({ body: otpBody() } as never, reply());

    expect(order).toEqual(["store", "send"]);
  });

  test("writes the code into the request body's data before sending", async () => {
    const body = otpBody();

    await sendOTPEmailHandler({ body } as never, reply());

    expect(body.data).toHaveProperty("otp", service.store.mock.calls[0][0]);
    expect(service.send).toHaveBeenCalledWith(body);
  });

  test("overwrites an otp the caller tried to choose", async () => {
    const body = { ...otpBody(), data: { surveyName: "s", otp: "000000" } };

    await sendOTPEmailHandler({ body } as never, reply());

    expect(body.data.otp).not.toBe("000000");
  });

  // NOTE: `data: z.any()` accepts null, and `data.otp = otp` then throws — but
  // only after the code has already been written to the database. JSON has no
  // undefined, so null is how a real request reaches this.
  test("500s on a null data, leaving a stored code behind", async () => {
    const rep = reply();
    const body = { ...otpBody(), data: null };

    await sendOTPEmailHandler({ body } as never, rep);

    expect(service.store).toHaveBeenCalledOnce();
    expect(service.send).not.toHaveBeenCalled();
    expect(answer(rep).code).toBe(500);
  });

  // NOTE: toEmail and userId are independent fields with nothing tying them
  // together — the handler will mint a code for one identity and post it to an
  // address chosen by the caller.
  test("sends the code for one userId to an unrelated address", async () => {
    const body = { ...otpBody(), userId: "victim-user", toEmail: "attacker@evil.test" };

    await sendOTPEmailHandler({ body } as never, reply());

    expect(service.store.mock.calls[0][1]).toBe("victim-user");
    expect(service.send.mock.calls[0][0].toEmail).toBe("attacker@evil.test");
  });

  test("never consults a session for the identity", async () => {
    const req: any = { body: otpBody(), session: { getUserId: vi.fn() } };

    await sendOTPEmailHandler(req, reply());

    expect(req.session.getUserId).not.toHaveBeenCalled();
  });

  // NOTE: purpose comes from the body too, so a caller can store a code and
  // have the message rendered by a template that never mentions it.
  test("stores a code even when the purpose renders no code", async () => {
    const rep = reply();
    const body = { ...otpBody(), purpose: "GeneralTemplate" };

    await sendOTPEmailHandler({ body } as never, rep);

    expect(service.store).toHaveBeenCalledOnce();
    expect(service.send.mock.calls[0][0].purpose).toBe("GeneralTemplate");
    expect(answer(rep).code).toBe(200);
  });

  test("issues a different code each time", async () => {
    await sendOTPEmailHandler({ body: otpBody() } as never, reply());
    await sendOTPEmailHandler({ body: otpBody() } as never, reply());
    await sendOTPEmailHandler({ body: otpBody() } as never, reply());

    const codes = service.store.mock.calls.map((c) => c[0]);
    expect(new Set(codes).size).toBeGreaterThan(1);
  });

  test("nothing limits how many codes one caller may request", async () => {
    for (let i = 0; i < 20; i++) {
      await sendOTPEmailHandler({ body: otpBody() } as never, reply());
    }

    expect(service.store).toHaveBeenCalledTimes(20);
    expect(service.send).toHaveBeenCalledTimes(20);
  });

  test("a storage failure answers 500 and sends no mail", async () => {
    service.store.mockRejectedValueOnce(new Error("unique constraint failed"));
    const rep = reply();

    await sendOTPEmailHandler({ body: otpBody() } as never, rep);

    expect(service.send).not.toHaveBeenCalled();
    expect(answer(rep).code).toBe(500);
    expect(answer(rep).body.error).toContain("unique constraint failed");
  });

  test("passes an absent surveyId through as undefined", async () => {
    const { surveyId: _drop, ...body } = otpBody();

    await sendOTPEmailHandler({ body } as never, reply());

    expect(service.store.mock.calls[0][2]).toBeUndefined();
  });
});

// ===========================================================================
// validateOTPHandler
// ===========================================================================

describe("validateOTPHandler", () => {
  const body = { otp: "123456", userId: "user-1", surveyId: "survey-1" };

  test("answers 200 with the verdict", async () => {
    const rep = reply();

    await validateOTPHandler({ body } as never, rep);

    expect(answer(rep)).toEqual({ code: 200, body: { isValid: true } });
  });

  test("answers 200 for a rejected code too", async () => {
    service.validate.mockResolvedValueOnce(false);
    const rep = reply();

    await validateOTPHandler({ body } as never, rep);

    expect(answer(rep)).toEqual({ code: 200, body: { isValid: false } });
  });

  test("checks against the userId and surveyId the caller supplied", async () => {
    await validateOTPHandler({ body } as never, reply());

    expect(service.validate).toHaveBeenCalledWith("123456", "user-1", "survey-1");
  });

  // NOTE: the verdict is returned to the caller and stored nowhere. Nothing
  // else in the codebase reads OtpStore, so no later request can tell whether
  // this check ever happened.
  test("records nothing about the outcome", async () => {
    const rep = reply();

    await validateOTPHandler({ body } as never, rep);

    expect(answer(rep).body).toEqual({ isValid: true });
    expect(service.store).not.toHaveBeenCalled();
  });

  test("nothing limits how many guesses one caller may make", async () => {
    service.validate.mockResolvedValue(false);

    for (let i = 0; i < 50; i++) {
      await validateOTPHandler(
        { body: { ...body, otp: String(i).padStart(6, "0") } } as never,
        reply(),
      );
    }

    expect(service.validate).toHaveBeenCalledTimes(50);
  });

  test("logs and 500s when the check throws", async () => {
    service.validate.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await validateOTPHandler({ body } as never, rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "db down" } });
    expect(log.error).toHaveBeenCalled();
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("emailPublicRoutes", () => {
  function server() {
    const posts: any[] = [];
    const srv: any = {
      post: vi.fn((url, opts, handler) => posts.push({ url, opts, handler })),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      addHook: vi.fn(),
      register: vi.fn(),
    };
    return { srv, posts };
  }

  test("registers three POSTs and nothing else", async () => {
    const { srv, posts } = server();

    await emailPublicRoutes(srv);

    expect(posts.map((p) => p.url)).toEqual(["/send-email", "/otp/send-email", "/otp/validate"]);
    expect(srv.get).not.toHaveBeenCalled();
    expect(srv.register).not.toHaveBeenCalled();
  });

  // NOTE: registered at /api/email in registerRoutes.ts:113 with no session
  // check, no preHandler, no rate limit and no hook of any kind.
  test("adds no authentication, hook or rate limit", async () => {
    const { srv, posts } = server();

    await emailPublicRoutes(srv);

    expect(srv.addHook).not.toHaveBeenCalled();
    for (const p of posts) {
      expect(p.opts.preHandler).toBeUndefined();
      expect(p.opts.onRequest).toBeUndefined();
      expect(p.opts.config).toBeUndefined();
      expect(Object.keys(p.opts)).toEqual(["schema"]);
    }
  });

  test("validates only the body, and never the reply", async () => {
    const { srv, posts } = server();

    await emailPublicRoutes(srv);

    expect(posts.map((p) => p.opts.schema.body)).toEqual([
      sendEmailSchema,
      GenerateOtpSchema,
      validateOtpSchema,
    ]);
    for (const p of posts) {
      expect(p.opts.schema.response).toBeUndefined();
    }
  });
});

// ===========================================================================
// Schemas
// ===========================================================================

describe("the body schemas", () => {
  // NOTE: toEmail is z.string(), not z.email() — the module's own contact-form
  // sibling uses the stricter one.
  test("accepts a toEmail that is not an address", () => {
    const parsed = sendEmailSchema.safeParse({
      toEmail: "not an address",
      subject: "s",
      purpose: "GeneralTemplate",
      text: "t",
      data: {},
    });

    expect(parsed.success).toBe(true);
  });

  test("puts no ceiling on subject or text length", () => {
    const parsed = sendEmailSchema.safeParse({
      toEmail: "a@b.test",
      subject: "x".repeat(50_000),
      purpose: "GeneralTemplate",
      text: "y".repeat(500_000),
      data: {},
    });

    expect(parsed.success).toBe(true);
  });

  // NOTE: Zod 4 treats a z.any() key as required when it is absent entirely,
  // which is the one thing standing between the handler and a null dereference.
  test("rejects a body with no data key", () => {
    const parsed = GenerateOtpSchema.safeParse({
      toEmail: "a@b.test",
      subject: "s",
      purpose: "SurveyEmailOTPQuestion",
      text: "t",
      userId: "user-1",
    });

    expect(parsed.success).toBe(false);
  });

  // NOTE: ...but it accepts null, which is what a JSON caller can actually
  // send, and that is the value the handler assigns into.
  test("accepts a null data", () => {
    const parsed = GenerateOtpSchema.safeParse({
      toEmail: "a@b.test",
      subject: "s",
      purpose: "SurveyEmailOTPQuestion",
      text: "t",
      userId: "user-1",
      data: null,
    });

    expect(parsed.success).toBe(true);
  });

  test("accepts any string as the purpose", () => {
    const parsed = sendEmailSchema.safeParse({
      toEmail: "a@b.test",
      subject: "s",
      purpose: "whatever",
      text: "t",
      data: {},
    });

    expect(parsed.success).toBe(true);
  });

  test("requires a userId to mint or check a code", () => {
    expect(validateOtpSchema.safeParse({ otp: "1", surveyId: "s" }).success).toBe(false);
    expect(GenerateOtpSchema.safeParse({ toEmail: "a@b.test" }).success).toBe(false);
  });
});
