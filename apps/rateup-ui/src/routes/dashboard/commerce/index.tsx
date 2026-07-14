import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/commerce/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/commerce/overview" });
  },
});
