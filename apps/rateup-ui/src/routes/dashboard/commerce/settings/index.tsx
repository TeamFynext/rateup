import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "@/components/dashboard/commerce/pages/SettingsPage";
import { SETTINGS_TABS, type SettingsTab } from "@/components/dashboard/commerce/shop/shopMeta";
import { oneOf } from "@/utils/search.ts";

export const Route = createFileRoute("/dashboard/commerce/settings/")({
  validateSearch: (search: Record<string, unknown>): { tab?: SettingsTab } => ({
    tab: oneOf(SETTINGS_TABS, search.tab),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { tab } = Route.useSearch();
  return <SettingsPage tab={tab} />;
}
