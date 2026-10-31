import { createFileRoute, redirect } from "@tanstack/react-router";

/** Contact groups were renamed Audiences; old links keep working. */
export const Route = createFileRoute("/dashboard/contacts/groups/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/contacts/audiences", replace: true });
  },
});
