import { createFileRoute, redirect } from "@tanstack/react-router";

/** Calls moved under the Inbox (/dashboard/inbox/calls); old links keep working. */
export const Route = createFileRoute("/dashboard/analytics/call-history/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/dashboard/inbox/calls",
      // The target's own validateSearch parses the old query.
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
