import { beforeEach, describe, expect, test, vi } from "vitest";

// constants.ts builds the CDN urls from env at import time, so the value has to
// be in place before the module graph loads.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL = "https://cdn.test.example";
});

import crypto from "node:crypto";
import { generateOTP, getEmailBodyTemplate, httpUrlOrNothing } from "./email.util.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// generateOTP
// ===========================================================================

describe("generateOTP", () => {
  test("returns a string of exactly the requested length", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOTP(6)).toHaveLength(6);
    }
  });

  test("returns only digits", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOTP(6)).toMatch(/^[0-9]{6}$/);
    }
  });

  test("draws from a CSPRNG rather than Math.random", () => {
    const spy = vi.spyOn(crypto, "randomInt");
    const random = vi.spyOn(Math, "random");

    generateOTP(6);

    expect(spy).toHaveBeenCalledOnce();
    expect(random).not.toHaveBeenCalled();
  });

  test("covers the whole 000000-999999 range inclusive", () => {
    const spy = vi.spyOn(crypto, "randomInt");

    generateOTP(6);

    // randomInt's max is exclusive, so 1_000_000 means 999999 is reachable.
    expect(spy).toHaveBeenCalledWith(0, 1_000_000);
  });

  test("pads a small draw with leading zeros instead of shortening the code", () => {
    vi.spyOn(crypto, "randomInt").mockReturnValue(42 as never);

    expect(generateOTP(6)).toBe("000042");
  });

  test("keeps the full width for the largest draw", () => {
    vi.spyOn(crypto, "randomInt").mockReturnValue(999_999 as never);

    expect(generateOTP(6)).toBe("999999");
  });

  test("a zero draw is a valid code, not an empty string", () => {
    vi.spyOn(crypto, "randomInt").mockReturnValue(0 as never);

    expect(generateOTP(6)).toBe("000000");
  });

  // NOTE: crypto.randomInt refuses a range wider than 2^48. Math.pow(10, 15)
  // exceeds it, so any length of 15 or more throws rather than returning a
  // code. Only 6 is used today; recorded so a longer code is not assumed safe.
  test("throws for lengths crypto.randomInt cannot represent", () => {
    expect(() => generateOTP(15)).toThrow();
  });

  test("length 1 works and stays single digit", () => {
    expect(generateOTP(1)).toMatch(/^[0-9]$/);
  });
});

// ===========================================================================
// httpUrlOrNothing — the button-link sanitiser
// ===========================================================================

describe("httpUrlOrNothing", () => {
  test("keeps an ordinary https link", () => {
    expect(httpUrlOrNothing("https://app.example/invite?x=1")).toBe(
      "https://app.example/invite?x=1",
    );
  });

  test("keeps an ordinary http link", () => {
    expect(httpUrlOrNothing("http://app.example/")).toBe("http://app.example/");
  });

  // Some mail clients honour these, so anything that is not http(s) is dropped
  // rather than escaped.
  test.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
  ])("drops %s", (value) => {
    expect(httpUrlOrNothing(value)).toBeUndefined();
  });

  test("drops a value that is not a url at all", () => {
    expect(httpUrlOrNothing("not a url")).toBeUndefined();
  });

  test("drops an empty link", () => {
    expect(httpUrlOrNothing("")).toBeUndefined();
  });
});

// ===========================================================================
// getEmailBodyTemplate — the purpose switch
// ===========================================================================

describe("getEmailBodyTemplate", () => {
  test("renders the OTP template for the survey OTP purpose", async () => {
    const html = await getEmailBodyTemplate("SurveyEmailOTPQuestion", {
      otp: "123456",
      surveyName: "Customer NPS",
    });

    expect(html).toContain("123456");
    expect(html).toContain("Customer NPS");
  });

  test("states the ten minute validity the service actually enforces", async () => {
    const html = await getEmailBodyTemplate("SurveyEmailOTPQuestion", { otp: "1" });

    expect(html).toContain("The code expires in 10 minutes");
  });

  // It used to read "To continue undefined, please use...".
  test("reads correctly when the survey name is missing", async () => {
    const html = await getEmailBodyTemplate("SurveyEmailOTPQuestion", { otp: "1" });

    expect(html).not.toContain("undefined");
  });

  test("escapes a survey name that carries markup", async () => {
    const html = await getEmailBodyTemplate("SurveyEmailOTPQuestion", {
      otp: "1",
      surveyName: "<a href='https://evil.test'>click</a>",
    });

    expect(html).not.toContain("<a href='https://evil.test'>click</a>");
    expect(html).toContain("&lt;a href=");
  });

  test("renders the general template for the general purpose", async () => {
    const html = await getEmailBodyTemplate("GeneralTemplate", {
      body: "You have been invited",
      buttonLink: "https://app.example/invite",
      title: "Invitation",
    });

    expect(html).toContain("You have been invited");
    expect(html).toContain("https://app.example/invite");
    expect(html).toContain("Invitation");
  });

  test("escapes a body that carries markup", async () => {
    const html = await getEmailBodyTemplate("GeneralTemplate", {
      body: "<img src=x onerror=alert(1)>",
    });

    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  test("drops a button link that is not http or https", async () => {
    const html = await getEmailBodyTemplate("GeneralTemplate", {
      body: "hi",
      buttonLink: "javascript:alert(1)",
    });

    expect(html).not.toContain("javascript:alert(1)");
  });

  test("throws for an unrecognised purpose rather than rendering nothing", () => {
    expect(() => getEmailBodyTemplate("PasswordReset", { otp: "1" })).toThrow(/No email template/);
  });

  test("throws when the purpose is missing", () => {
    expect(() => getEmailBodyTemplate(undefined, {})).toThrow(/No email template/);
  });

  test("still matches the purpose case sensitively, and refuses the rest", () => {
    expect(() => getEmailBodyTemplate("generaltemplate", { body: "hi" })).toThrow();
    expect(() => getEmailBodyTemplate("SURVEYEMAILOTPQUESTION", { otp: "1" })).toThrow();
  });

  // Both branches read through `data?.`; a missing payload renders the template
  // with empty values rather than throwing out of the send.
  test("the general branch tolerates a missing payload", async () => {
    await expect(getEmailBodyTemplate("GeneralTemplate", undefined)).resolves.toBeTypeOf("string");
  });

  test("the OTP branch tolerates a missing payload too", async () => {
    await expect(getEmailBodyTemplate("SurveyEmailOTPQuestion", undefined)).resolves.toBeTypeOf(
      "string",
    );
  });

  test("embeds the logo from the CDN env var", async () => {
    const html = await getEmailBodyTemplate("GeneralTemplate", { body: "hi" });

    expect(html).toContain("https://cdn.test.example/images/");
  });
});
