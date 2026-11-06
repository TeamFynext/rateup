import { createFileRoute, redirect } from "@tanstack/react-router";

/** Calls moved under the Inbox (/dashboard/inbox/calls); old links keep working. */
export const Route = createFileRoute("/dashboard/analytics/calls/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/dashboard/inbox/calls",
      // The old URL's query, carried across as-is: the target's own validateSearch
      // parses it, so this route does not restate (and drift from) that schema.
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
