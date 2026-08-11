import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/meta-agent/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/meta-agent/overview" });
  },
});
