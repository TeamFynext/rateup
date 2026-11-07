import { describe, expect, test } from "vite-plus/test";
import { captchaPlugins, shouldValidateCaptcha } from "./captcha.js";

const check = shouldValidateCaptcha as unknown as (api: string) => boolean;

describe("SuperTokens CAPTCHA", () => {
  test("is off without a Turnstile secret", () => {
    expect(captchaPlugins("")).toEqual([]);
    expect(captchaPlugins(undefined)).toEqual([]);
  });

  test("adds the SuperTokens plugin when a secret is set", () => {
    const [plugin] = captchaPlugins("secret");
    expect(plugin.id).toBe("supertokens-plugin-captcha");
  });

  test("guards sign-up and SMS codes only", () => {
    expect(check("signUpPOST")).toBe(true);
    expect(check("createCodePOST")).toBe(true);
    // The mobile app calls these, and cannot show a widget.
    expect(check("signInPOST")).toBe(false);
    expect(check("generatePasswordResetTokenPOST")).toBe(false);
    // These already need a secret code or token from an email/SMS.
    expect(check("consumeCodePOST")).toBe(false);
    expect(check("passwordResetPOST")).toBe(false);
  });
});
