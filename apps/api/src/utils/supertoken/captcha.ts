import CaptchaPlugin, {
  type SuperTokensPluginCaptchaConfig,
} from "@supertokens-plugins/captcha-nodejs";
import type { SuperTokensPlugin } from "supertokens-node/types";

/**
 * The SuperTokens endpoints that need a CAPTCHA: the ones a bot can turn into cost. Each
 * sign-up creates an org, and each SMS code is a paid text. Sign-in and the reset-email
 * request stay open because the mobile app calls them and cannot show a widget; the per-IP
 * and per-account limits in plugins/index.ts cover them.
 */
export const CAPTCHA_PROTECTED_APIS = new Set(["signUpPOST", "createCodePOST"]);

export const shouldValidateCaptcha: NonNullable<
  SuperTokensPluginCaptchaConfig["shouldValidate"]
> = (api: string) => CAPTCHA_PROTECTED_APIS.has(api);

/**
 * SuperTokens' CAPTCHA plugin with Cloudflare Turnstile, or nothing when TURNSTILE_SECRET_KEY
 * is unset (local dev and tests). The web app sends the token as `captcha` with
 * `captchaType: "turnstile"` in the request body.
 */
export function captchaPlugins(secretKey = process.env.TURNSTILE_SECRET_KEY): SuperTokensPlugin[] {
  if (!secretKey) return [];
  return [
    CaptchaPlugin.init({
      type: "turnstile",
      captcha: { secretKey },
      shouldValidate: shouldValidateCaptcha,
    }),
  ];
}
