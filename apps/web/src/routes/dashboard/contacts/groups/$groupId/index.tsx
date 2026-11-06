import { createFileRoute, redirect } from "@tanstack/react-router";

/** Contact groups were renamed Audiences; old links keep working. */
export const Route = createFileRoute("/dashboard/contacts/groups/$groupId/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/dashboard/contacts/audiences/$audienceId",
      params: { audienceId: params.groupId },
      replace: true,
    });
  },
});
