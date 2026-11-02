import { createFileRoute, redirect } from "@tanstack/react-router";

/** Staff is a section now (Staff members, Audit log); its own address opens Staff members. */
export const Route = createFileRoute("/_app/staff/")({
  beforeLoad: () => {
    throw redirect({ to: "/staff/members", replace: true });
  },
});
