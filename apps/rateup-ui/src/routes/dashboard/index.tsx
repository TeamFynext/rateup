import { createFileRoute, redirect } from "@tanstack/react-router";

import { getTeamFeatures } from "@/backend/team/team.api";
import { userInfoQuery } from "@/backend/user/user.options";
import { Loader } from "@/components/ui/loader.tsx";
import { isEmailVerified, VERIFY_EMAIL_PATH } from "@/utils/auth/emailVerification.ts";
import { getDashboardLandingTarget } from "@/utils/dashboard-feature-access.ts";
import { UserRole } from "@/utils/enums/index.ts";

async function getMemberAllowedFeatures(teamIds: string[]): Promise<Set<string>> {
  const teamFeaturesResponses = await Promise.all(teamIds.map((id) => getTeamFeatures(id)));
  const allowedFeatures = new Set<string>();

  for (const result of teamFeaturesResponses) {
    for (const feature of result.features) {
      allowedFeatures.add(feature.feature);
    }
  }

  return allowedFeatures;
}

export const Route = createFileRoute("/dashboard/")({
  ssr: false,
  loader: async ({ context }) => {
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

      throw redirect({
        to: "/login",
        replace: true,
      });
    }

    if (!user.onboardingChecklistCompleted && user.role === UserRole.SUPADM) {
      throw redirect({
        to: "/dashboard/setup",
        replace: true,
      });
    }

    const teamIds = user?.role === UserRole.SUPADM ? [] : (user.teams ?? []);

    if (teamIds.length > 0) {
      const allowedFeatures = await getMemberAllowedFeatures(teamIds);
      const firstAllowedTarget = getDashboardLandingTarget(allowedFeatures);
      throw redirect({
        to: firstAllowedTarget,
        replace: true,
      });
    }

    throw redirect({
      to: "/dashboard/inbox",
      search: { tab: "open" },
      replace: true,
    });
  },
  component: DashboardHome,
});

function DashboardHome() {
  return <Loader />;
}
