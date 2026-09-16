import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";
import { LoyaltySettingsPage } from "@/components/dashboard/loyalty/settings/LoyaltySettingsPage.tsx";

// The old page had a Notifications tab; those settings now live on Messages.
const searchSchema = z.object({ tab: z.string().optional().catch(undefined) });

export const Route = createFileRoute("/dashboard/loyalty/settings/")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (search.tab === "notifications") {
      throw redirect({
        to: LOYALTY_PATHS.messages,
        search: { tab: "automatic" },
        replace: true,
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <LoyaltySettingsPage />;
}
