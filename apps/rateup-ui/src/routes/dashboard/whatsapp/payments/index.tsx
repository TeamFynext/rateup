import { createFileRoute, redirect } from "@tanstack/react-router";

// Payments moved to Commerce → Settings → Getting paid.
export const Route = createFileRoute("/dashboard/whatsapp/payments/")({
  beforeLoad: () => {
    throw redirect({
      to: "/dashboard/commerce/settings",
      search: { tab: "payments" },
      replace: true,
    });
  },
});
