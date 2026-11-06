import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/quickAccessLinks/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/link-pages" });
  },
});
