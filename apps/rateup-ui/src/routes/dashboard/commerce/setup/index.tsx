import { createFileRoute } from "@tanstack/react-router";

import { SetupPage } from "@/components/dashboard/commerce/pages/SetupPage";

export const Route = createFileRoute("/dashboard/commerce/setup/")({
  component: SetupPage,
});
