import { createFileRoute } from "@tanstack/react-router";

import { MaterialsPage } from "@/components/dashboard/loyalty/materials/MaterialsPage.tsx";
import {
  MATERIALS_TABS,
  type MaterialsTab,
} from "@/components/dashboard/loyalty/materials/materialsTabs.ts";
import { oneOf } from "@/utils/search.ts";

export const Route = createFileRoute("/dashboard/loyalty/materials/")({
  // Materials — the join QR card and the rewards brochure, as tabs.
  validateSearch: (search: Record<string, unknown>): { tab?: MaterialsTab } => ({
    tab: oneOf(MATERIALS_TABS, search.tab),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { tab } = Route.useSearch();
  return <MaterialsPage tab={tab} />;
}
