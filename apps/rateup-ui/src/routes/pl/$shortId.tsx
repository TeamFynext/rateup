import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * A pipeline card's share link. Kept short like a web survey's `/ws/<id>`, and
 * handed to the board, which is behind sign-in and resolves the id itself.
 */
export const Route = createFileRoute("/pl/$shortId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/dashboard/pipeline",
      search: { lead: params.shortId },
      replace: true,
    });
  },
});
