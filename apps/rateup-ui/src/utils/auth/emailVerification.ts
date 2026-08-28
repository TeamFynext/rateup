import { EmailVerificationClaim } from "supertokens-auth-react/recipe/emailverification";
import Session from "supertokens-auth-react/recipe/session";

/**
 * Where a session whose email is not verified has to go.
 *
 * `EmailVerification.init({ mode: "REQUIRED" })` on the API means every `verifySession()`
 * route answers 403 "invalid claim" until the email is verified — so a signed-in but
 * unverified visitor has exactly one page they can use, and this is it.
 */
export const VERIFY_EMAIL_PATH = "/login/verify-email";

/**
 * Pull a fresh `st-ev` value into the session's access token payload.
 *
 * The claim validator caches a `false` for ~10s before refetching, so anyone who verified
 * elsewhere (another tab, another device, a social login) carries a stale `false`.
 * Refreshing before deciding where to send them is what stops the two pages bouncing.
 */
export async function refreshEmailVerificationClaim() {
  try {
    await EmailVerificationClaim.refresh({});
  } catch (err) {
    // Carry on with what we have: the guard re-checks and the claim refetches on its
    // own timer, so a failed refresh must not be the thing that blocks a redirect.
    console.error("Failed to refresh the email verification claim:", err);
  }
}

/**
 * Whether this session's email is verified, re-checking a `false` against the API first.
 *
 * An unknown claim reads as verified on purpose: it means email verification is not
 * gating this session, and answering `false` there would strand the user on the verify
 * page with no email to confirm.
 */
export async function isEmailVerified(): Promise<boolean> {
  try {
    if ((await Session.getClaimValue({ claim: EmailVerificationClaim })) !== false) return true;

    await refreshEmailVerificationClaim();
    return (await Session.getClaimValue({ claim: EmailVerificationClaim })) !== false;
  } catch (err) {
    // No session, or the claim could not be read — neither is "unverified", and treating
    // it as such would redirect a signed-out visitor to a page that needs a session.
    console.error("Failed to read the email verification claim:", err);
    return true;
  }
}
