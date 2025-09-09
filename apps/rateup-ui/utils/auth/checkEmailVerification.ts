import { EmailVerificationClaim } from "supertokens-auth-react/recipe/emailverification";
import Session from "supertokens-auth-react/recipe/session";

export async function checkEmailVerification(): Promise<boolean> {
  if (await Session.doesSessionExist()) {
    let validationErrors = await Session.validateClaims();

    if (validationErrors.length === 0) {
      // user has verified their email address
      return true;
    } else {
      for (const err of validationErrors) {
        if (err.id === EmailVerificationClaim.id) {
          // email is not verified
          const currentPath = window.location.pathname;
          if (currentPath !== "/login/verify-email") {
            window.location.assign("/login/verify-email");
          }
        }
      }
    }
  }
  // a session does not exist, or email is not verified
  return false;
}
