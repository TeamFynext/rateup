import { createFileRoute } from "@tanstack/react-router";

import { StorefrontPreviewPage } from "@/components/dashboard/commerce/pages/StorefrontPreviewPage";

export const Route = createFileRoute("/dashboard/commerce/settings/storefront-preview")({
  component: StorefrontPreviewPage,
});
