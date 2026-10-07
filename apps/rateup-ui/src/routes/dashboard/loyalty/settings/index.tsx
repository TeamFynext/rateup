import { createFileRoute, redirect } from "@tanstack/react-router";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";
import { LoyaltySettingsPage } from "@/components/dashboard/loyalty/settings/LoyaltySettingsPage.tsx";
import { optionalString } from "@/utils/search.ts";

export const Route = createFileRoute("/dashboard/loyalty/settings/")({
  // The old page had a Notifications tab; those settings now live on Messages.
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: optionalString(search.tab),
  }),
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
