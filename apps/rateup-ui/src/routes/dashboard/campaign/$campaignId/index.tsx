import { createFileRoute, redirect } from "@tanstack/react-router";

/** Campaigns moved to /dashboard/campaigns; old links and bookmarks keep working. */
export const Route = createFileRoute("/dashboard/campaign/$campaignId/")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: "/dashboard/campaigns/$campaignId",
      params: { campaignId: params.campaignId },
      // The old URL's query, carried across as-is: the target's own validateSearch
      // parses it, so this route does not restate (and drift from) that schema.
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
