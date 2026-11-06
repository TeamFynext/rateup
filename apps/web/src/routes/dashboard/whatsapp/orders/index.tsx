import { createFileRoute, redirect } from "@tanstack/react-router";

// Orders moved to the Commerce section.
export const Route = createFileRoute("/dashboard/whatsapp/orders/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/commerce/orders" });
  },
});
