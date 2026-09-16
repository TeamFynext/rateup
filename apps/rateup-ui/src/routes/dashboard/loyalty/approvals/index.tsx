import { createFileRoute, redirect } from "@tanstack/react-router";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";

// Approvals became Activity › Pending. Kept so bookmarks and old links still land.
export const Route = createFileRoute("/dashboard/loyalty/approvals/")({
  beforeLoad: () => {
    throw redirect({
      to: LOYALTY_PATHS.activity,
      search: { filter: "pending", page: 1 },
      replace: true,
    });
  },
});
