import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/settings/")({
  loader: () => {
    throw redirect({ to: "/dashboard/settings/account" });
  },
});
