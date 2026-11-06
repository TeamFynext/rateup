import { createFileRoute, redirect } from "@tanstack/react-router";

/** Renamed to match its sidebar label; old links keep working. */
export const Route = createFileRoute("/dashboard/meta-agent/settings")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/dashboard/meta-agent/go-live",
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
