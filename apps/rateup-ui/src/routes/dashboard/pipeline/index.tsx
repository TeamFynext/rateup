import { createFileRoute, redirect } from "@tanstack/react-router";

/** Pipelines moved to /dashboard/pipelines; old links and bookmarks keep working. */
export const Route = createFileRoute("/dashboard/pipeline/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/dashboard/pipelines",
      // The old URL's query, carried across as-is: the target's own validateSearch
      // parses it, so this route does not restate (and drift from) that schema.
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
