import {
  EmailVerificationClaim,
  isEmailVerified as fetchEmailVerified,
} from "supertokens-auth-react/recipe/emailverification";
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
 * Verification only ever goes false -> true, so a `true` holds for the rest of the page's
 * life. Without this every move inside the dashboard re-reads the claim, and a session
 * missing `st-ev` pays a round trip for each one.
 */
let verifiedThisSession = false;

/**
 * Drop that memo. Signing out is the one moment the answer can go back to "no" without a
 * reload — the next visitor at this tab is a different session entirely.
 */
export function forgetEmailVerification() {
  verifiedThisSession = false;
}

/**
 * Whether this session's email is verified, re-checking anything but a plain `true`.
 *
 * The claim is only ever trusted when it says `true`. A `false` is re-read from the API
 * because the validator caches it for ~10s, and an *absent* claim is asked about too:
 * a session restored on a later visit can carry no `st-ev` at all, and reading that as
 * "verified" is what let an unverified visitor past the dashboard guard, into the 403s,
 * and back to /login — the bounce this whole module exists to prevent.
 */
export async function isEmailVerified(): Promise<boolean> {
  if (verifiedThisSession) return true;

  try {
    if ((await Session.getClaimValue({ claim: EmailVerificationClaim })) === true) {
      verifiedThisSession = true;
      return true;
    }

    await refreshEmailVerificationClaim();
    const refreshed = await Session.getClaimValue({ claim: EmailVerificationClaim });
    if (typeof refreshed === "boolean") {
      verifiedThisSession = refreshed;
      return refreshed;
    }

    // Still no claim on the session. Ask the API outright rather than guessing: it is the
    // one answer that cannot disagree with the gate the API itself enforces.
    verifiedThisSession = (await fetchEmailVerified()).isVerified;
    return verifiedThisSession;
  } catch (err) {
    // No session, or neither the claim nor the API could be read — none of which is
    // "unverified", and treating it as such would redirect a signed-out visitor to a
    // page that needs a session.
    console.error("Failed to read the email verification claim:", err);
    return true;
  }
}
