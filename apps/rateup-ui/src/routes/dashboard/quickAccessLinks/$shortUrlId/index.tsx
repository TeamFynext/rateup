import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/quickAccessLinks/$shortUrlId/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/dashboard/link-pages/$shortUrlId", params });
  },
});
