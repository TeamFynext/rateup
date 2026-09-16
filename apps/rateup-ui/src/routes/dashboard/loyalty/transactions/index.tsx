import { createFileRoute, redirect } from "@tanstack/react-router";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";

// Transactions was renamed Activity. Kept so bookmarks and old links still land.
export const Route = createFileRoute("/dashboard/loyalty/transactions/")({
  beforeLoad: () => {
    throw redirect({
      to: LOYALTY_PATHS.activity,
      search: { filter: "all", page: 1 },
      replace: true,
    });
  },
});
