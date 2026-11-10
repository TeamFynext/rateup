import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));

import { redact } from "./staffAudit.js";

describe("redact", () => {
  test("credentials, OTPs, PINs and passcodes go, numbers included; look-alike words stay", () => {
    expect(
      redact({
        credential: "c",
        passcode: "p",
        otp: 123456,
        otpCode: "123456",
        loginPin: 1234,
        user_pin: "0000",
        shipping: "express",
        opinion: "fine",
        pinned: true,
      }),
    ).toEqual({
      credential: "[redacted]",
      passcode: "[redacted]",
      otp: "[redacted]",
      otpCode: "[redacted]",
      loginPin: "[redacted]",
      user_pin: "[redacted]",
      shipping: "express",
      opinion: "fine",
      pinned: true,
    });
  });

  test("replaces secret-looking values at any depth and leaves the rest", () => {
    expect(
      redact({
        reason: "customer asked",
        password: "hunter2",
        nested: { apiKey: "k", clientSecret: "s", accessToken: "t", plan: "PRO" },
        list: [{ Authorization: "Bearer x", name: "a" }],
      }),
    ).toEqual({
      reason: "customer asked",
      password: "[redacted]",
      nested: {
        apiKey: "[redacted]",
        clientSecret: "[redacted]",
        accessToken: "[redacted]",
        plan: "PRO",
      },
      list: [{ Authorization: "[redacted]", name: "a" }],
    });
  });

  test("keeps counts and flags whose names only look secret, and stores dates as dates", () => {
    const expiresAt = new Date("2027-03-31T18:29:59.999Z");
    expect(
      redact({
        ai: { active: false, count: { promptTokens: 0, completionTokens: 12000 } },
        expiresAt,
        token: { value: "t" },
      }),
    ).toEqual({
      ai: { active: false, count: { promptTokens: 0, completionTokens: 12000 } },
      expiresAt: "2027-03-31T18:29:59.999Z",
      token: "[redacted]",
    });
  });

  test("passes primitives through", () => {
    expect(redact("x")).toBe("x");
    expect(redact(null)).toBeNull();
    expect(redact(3)).toBe(3);
  });
});
