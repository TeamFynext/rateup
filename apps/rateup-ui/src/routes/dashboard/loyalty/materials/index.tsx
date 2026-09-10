import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { MaterialsPage } from "@/components/dashboard/loyalty/materials/MaterialsPage.tsx";
import { MATERIALS_TABS } from "@/components/dashboard/loyalty/materials/materialsTabs.ts";

// Materials — the join QR card and the rewards brochure, as tabs.
const searchSchema = z.object({
  tab: z.enum(MATERIALS_TABS).optional().catch(undefined),
});

export const Route = createFileRoute("/dashboard/loyalty/materials/")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { tab } = Route.useSearch();
  return <MaterialsPage tab={tab} />;
}
