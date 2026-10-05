import { redirect } from "@tanstack/react-router";
import Session from "supertokens-auth-react/recipe/session";

import { userInfoQuery } from "@/backend/user/user.options";
import type { RouterContext } from "@/routes/__root";
import { isEmailVerified, VERIFY_EMAIL_PATH } from "@/utils/auth/emailVerification.ts";
import { resolvePermissions } from "@/utils/authz/can.ts";
import { allowedFeaturesFromPermissions } from "@/utils/authz/features.ts";
import { getDashboardLandingTarget } from "@/utils/dashboard-feature-access.ts";

/** Where `/dashboard/` sends a visitor. Always throws a redirect. */
export async function redirectToDashboardLanding({ context }: { context: RouterContext }) {
  const queryClient = context.getQueryClient();
  const userQueryData = await queryClient.fetchQuery(userInfoQuery());
  const user = userQueryData && "data" in userQueryData ? userQueryData.data : null;

  if (!user) {
    // "No user" here is not only a missing session: with EmailVerification in REQUIRED
    // mode the API answers /user/info with 403 "invalid claim" while the email is
    // unverified, and `fetchUserInfo` reports that as an error body rather than data.
    // Sending that visitor to /login would only send them back here — /login sees a
    // live session and returns them to the dashboard.
    if (!(await isEmailVerified())) {
      throw redirect({
        to: VERIFY_EMAIL_PATH,
        replace: true,
      });
    }

    // With a live session, /login is not the exit: it sees the session and sends the
    // visitor straight back here, and the two pages flicker between each other for
    // good. The email is verified and there is still no account behind the session, so
    // the session itself is unusable — /logout clears it first, and the /login it lands
    // on then finds nothing and stays put.
    throw redirect({
      to: (await Session.doesSessionExist()) ? "/logout" : "/login",
      replace: true,
    });
  }

  const permissions = resolvePermissions(user);

  // Setup connects channels for the whole org, so it is the org-wide roles' job.
  if (!user.onboardingChecklistCompleted && permissions.has("channels.manage")) {
    throw redirect({
      to: "/dashboard/setup",
      replace: true,
    });
  }

  if (!permissions.has("inbox.read")) {
    throw redirect({
      to: getDashboardLandingTarget(allowedFeaturesFromPermissions(permissions)),
      replace: true,
    });
  }

  throw redirect({
    to: "/dashboard/inbox",
    search: { tab: "open" },
    replace: true,
  });
}
