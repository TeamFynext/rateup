import { createFileRoute } from "@tanstack/react-router";

import { OverviewPage } from "@/components/dashboard/commerce/pages/OverviewPage";

export const Route = createFileRoute("/dashboard/commerce/overview/")({
  component: OverviewPage,
});
