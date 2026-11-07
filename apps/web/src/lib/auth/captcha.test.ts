import { afterEach, describe, expect, test, vi } from "vite-plus/test";

/** The module reads the site key when it loads, so each test loads it fresh. */
async function load(siteKey: string) {
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", siteKey);
  vi.resetModules();
  return import("./captcha.tsx");
}

afterEach(() => vi.unstubAllEnvs());

describe("captcha", () => {
  test("is off without a site key", async () => {
    const { getCaptchaToken, captchaOptions } = await load("");
    expect(await getCaptchaToken("signup")).toBeNull();
    expect(captchaOptions(null)).toEqual({});
  });

  test("adds the token to the SuperTokens body in the plugin's shape", async () => {
    const { captchaOptions } = await load("site-key");
    const hook = captchaOptions("tok").options?.preAPIHook;
    const out = await hook!({
      url: "/api/auth/signup",
      requestInit: { method: "POST", body: JSON.stringify({ formFields: [] }) },
      userContext: {},
    });
    expect(out.url).toBe("/api/auth/signup");
    const body = out.requestInit.body;
    expect(typeof body === "string" ? JSON.parse(body) : body).toEqual({
      formFields: [],
      captcha: "tok",
      captchaType: "turnstile",
    });
  });
});
