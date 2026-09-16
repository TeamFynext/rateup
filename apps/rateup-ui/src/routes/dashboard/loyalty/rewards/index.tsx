import { createFileRoute, redirect } from "@tanstack/react-router";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";

// Rewards became Program › Rewards. Kept so bookmarks and old links still land.
export const Route = createFileRoute("/dashboard/loyalty/rewards/")({
  beforeLoad: () => {
    throw redirect({ to: LOYALTY_PATHS.program, search: { section: "rewards" }, replace: true });
  },
});
