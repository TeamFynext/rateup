import { createFileRoute, redirect } from "@tanstack/react-router";

import { resolvePermissions } from "@/utils/authz/can.ts";
import { allowedFeaturesFromPermissions } from "@/utils/authz/features.ts";
import { getWhatsappLandingTarget } from "@/utils/dashboard-feature-access.ts";

export const Route = createFileRoute("/dashboard/whatsapp/")({
  ssr: false,
  loader: async ({ context }) => {
    const queryClient = context.getQueryClient();
    // Imported on demand: loaders land in the client entry, and this brings the API client.
    const { userInfoQuery } = await import("@/backend/user/user.options");
    const userQueryData = await queryClient.fetchQuery(userInfoQuery());

    const user = userQueryData && "data" in userQueryData ? userQueryData.data : null;

    if (!user) {
      throw redirect({ to: "/login", replace: true });
    }

    const allowed = allowedFeaturesFromPermissions(resolvePermissions(user));
    throw redirect({ to: getWhatsappLandingTarget(allowed), replace: true });
  },
});
