import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/commerce/payments/")({
  beforeLoad: () => {
    throw redirect({
      to: "/dashboard/commerce/settings",
      search: { tab: "payments" },
      replace: true,
    });
  },
});
