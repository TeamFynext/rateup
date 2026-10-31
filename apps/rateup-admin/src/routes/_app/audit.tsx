import { createFileRoute, redirect } from "@tanstack/react-router";

/** The audit log moved under Staff; old links keep their filters. */
export const Route = createFileRoute("/_app/audit")({
  beforeLoad: ({ location }) => {
    throw redirect({ to: "/staff/audit-log", search: location.search as never, replace: true });
  },
});
