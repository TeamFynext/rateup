import { createFileRoute, redirect } from "@tanstack/react-router";

// Payments moved to the Commerce section.
export const Route = createFileRoute("/dashboard/whatsapp/payments/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/commerce/payments" });
  },
});
