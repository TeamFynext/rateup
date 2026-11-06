import { createFileRoute } from "@tanstack/react-router";

import { CouponsPage } from "@/components/dashboard/commerce/pages/CouponsPage";

export const Route = createFileRoute("/dashboard/commerce/coupons/")({
  component: CouponsPage,
});
