import { createFileRoute, redirect } from "@tanstack/react-router";

/** Renamed to match its sidebar label; old links keep working. */
export const Route = createFileRoute("/dashboard/meta-agent/operate")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/dashboard/meta-agent/test",
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
