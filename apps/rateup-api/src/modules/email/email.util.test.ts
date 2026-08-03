import { beforeEach, describe, expect, test, vi } from "vitest";

// constants.ts builds rateupLogo from env at import time, so the value has to be
// in place before the module graph loads.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL = "https://cdn.test.example";
});

import crypto from "node:crypto";
import { createGeneralEmailBodyTemaple, generateOTP, getEmailBodyTemplate } from "./email.util.js";
import { createEmailBodyOTPGeneration } from "./emailTemplates/emailTemplateOTPGeneration.js";

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
// getEmailBodyTemplate — the purpose switch
// ===========================================================================

describe("getEmailBodyTemplate", () => {
  test("renders the OTP template for the survey OTP purpose", () => {
    const html = getEmailBodyTemplate("SurveyEmailOTPQuestion", {
      otp: "123456",
      surveyName: "Customer NPS",
    });

    expect(html).toContain("123456");
    expect(html).toContain("Customer NPS");
  });

  test("renders the general template for the general purpose", () => {
    const html = getEmailBodyTemplate("GeneralTemplate", {
      body: "You have been invited",
      buttonLink: "https://app.example/invite",
      title: "Invitation",
    });

    expect(html).toContain("You have been invited");
    expect(html).toContain("https://app.example/invite");
    expect(html).toContain("Invitation");
  });

  // The switch had no default, so an unrecognised purpose returned undefined and
  // became `html: undefined` on the outgoing message — an email delivered with no
  // body, answered 200. `purpose` is a z.enum on the schemas now, and this throw
  // covers any other caller.
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

  // Both branches now read through `data?.`; a missing payload renders the template
  // with empty values rather than throwing out of the send.
  test("the general branch tolerates a missing payload", () => {
    expect(() => getEmailBodyTemplate("GeneralTemplate", undefined)).not.toThrow();
  });

  test("the OTP branch tolerates a missing payload too", () => {
    expect(() => getEmailBodyTemplate("SurveyEmailOTPQuestion", undefined)).not.toThrow();
  });
});

// ===========================================================================
// createGeneralEmailBodyTemaple
// ===========================================================================

describe("createGeneralEmailBodyTemaple", () => {
  // Every value used to be interpolated raw, which is what made 25.1's relay a
  // phishing tool rather than merely a spam tool.
  test("escapes the body", () => {
    const html = createGeneralEmailBodyTemaple(
      "<img src=x onerror=alert(1)>",
      "https://app.example",
    );

    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  // Escaping alone would leave `javascript:` and `data:` hrefs intact, which some
  // mail clients honour, so a link that is not ordinary http(s) is dropped.
  test("drops a link that is not http or https", () => {
    const html = createGeneralEmailBodyTemaple("hi", "javascript:alert(1)");

    expect(html).not.toContain("javascript:alert(1)");
    expect(html).not.toContain("<a href");
  });

  test("keeps an ordinary http(s) link", () => {
    const html = createGeneralEmailBodyTemaple("hi", "https://app.example/invite?x=1");

    expect(html).toContain(`href="https://app.example/invite?x=1"`);
  });

  // A caller-supplied link containing a double quote used to close the attribute
  // and add its own.
  test("a quote in the link can no longer break out of the href attribute", () => {
    const html = createGeneralEmailBodyTemaple("hi", `https://x" onclick="steal()`);

    expect(html).not.toContain(`onclick="steal()"`);
  });

  test("escapes the title", () => {
    const html = createGeneralEmailBodyTemaple("hi", "https://x", "<b>bold</b>");

    expect(html).toContain("<h1>&lt;b&gt;bold&lt;/b&gt;</h1>");
  });

  test("renders an empty heading when no title is given", () => {
    const html = createGeneralEmailBodyTemaple("hi", "https://x");

    expect(html).toContain("<h1></h1>");
  });

  test("renders an empty paragraph for a missing body", () => {
    const html = createGeneralEmailBodyTemaple(undefined as never, "https://x");

    expect(html).not.toContain("<p>undefined</p>");
    expect(html).toContain("<p></p>");
  });

  // It used to render `href="undefined"` and a Visit button that went nowhere.
  test("omits the Visit button when there is no usable link", () => {
    const html = createGeneralEmailBodyTemaple("hi", undefined as never);

    expect(html).not.toContain(`href="undefined"`);
    expect(html).not.toContain("Visit");
  });

  test("embeds the logo from the CDN env var", () => {
    const html = createGeneralEmailBodyTemaple("hi", "https://x");

    expect(html).toContain("https://cdn.test.example/images/");
  });
});

// ===========================================================================
// createEmailBodyOTPGeneration
// ===========================================================================

describe("createEmailBodyOTPGeneration", () => {
  test("renders the code", () => {
    expect(createEmailBodyOTPGeneration({ otp: "654321", surveyName: "s" })).toContain("654321");
  });

  test("states the ten minute validity the service actually enforces", () => {
    const html = createEmailBodyOTPGeneration({ otp: "1", surveyName: "s" });

    expect(html).toContain("valid only for next 10 minutes");
  });

  // NOTE: surveyName still comes from the caller-supplied `data` blob on a public
  // route and nothing checks it against the survey the userId belongs to — but it
  // is escaped, so it can no longer bring markup into the message.
  test("escapes the survey name", () => {
    const html = createEmailBodyOTPGeneration({
      otp: "1",
      surveyName: "<a href='https://evil.test'>click</a>",
    });

    expect(html).not.toContain("<a href='https://evil.test'>click</a>");
    expect(html).toContain("&lt;a href=&#39;https://evil.test&#39;&gt;");
  });

  // It used to read "To continue undefined, please use...".
  test("reads correctly when the survey name is missing", () => {
    const html = createEmailBodyOTPGeneration({ otp: "1" });

    expect(html).not.toContain("undefined");
    expect(html).toContain("please use the following One Time Password");
  });

  // Previously dereferenced `.otp` on the payload directly and threw a TypeError.
  test("renders with empty values when the payload is absent", () => {
    expect(() => createEmailBodyOTPGeneration(undefined)).not.toThrow();
  });
});
