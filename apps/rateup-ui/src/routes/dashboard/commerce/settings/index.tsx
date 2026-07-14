import { createFileRoute } from "@tanstack/react-router";

import { CheckoutSettingsPage } from "@/components/dashboard/commerce/pages/CheckoutSettingsPage";

export const Route = createFileRoute("/dashboard/commerce/settings/")({
  component: CheckoutSettingsPage,
});
