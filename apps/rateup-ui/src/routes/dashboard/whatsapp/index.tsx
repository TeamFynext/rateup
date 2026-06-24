import { createFileRoute, redirect } from "@tanstack/react-router";

import { getTeamFeatures } from "@/backend/team/team.api";
import { fetchUserInfo } from "@/backend/user/user.api";
import { getQueryClient } from "@/components/providers.tsx";
import {
  getDashboardLandingTarget,
  getWhatsappLandingTarget,
} from "@/utils/dashboard-feature-access.ts";
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

export const Route = createFileRoute("/dashboard/whatsapp/")({
  ssr: false,
  loader: async () => {
    const queryClient = getQueryClient();
    const userQueryData = await queryClient.fetchQuery({
      queryKey: ["userInfoQuery"],
      queryFn: fetchUserInfo,
      staleTime: 60 * 1000,
    });

    const user = userQueryData && "data" in userQueryData ? userQueryData.data : null;

    if (!user) {
      throw redirect({ to: "/login", replace: true });
    }

    const teamIds = user.role === UserRole.SUPADM ? [] : (user.teams ?? []);

    if (teamIds.length > 0) {
      const allowedFeatures = await getMemberAllowedFeatures(teamIds);
      throw redirect({
        to: getWhatsappLandingTarget(allowedFeatures),
        replace: true,
      });
    }

    if (user.role === UserRole.SUPADM) {
      throw redirect({ to: "/dashboard/whatsapp/flows", replace: true });
    }

    throw redirect({
      to: getDashboardLandingTarget(new Set<string>()),
      replace: true,
    });
  },
});
