import { createFileRoute, redirect } from "@tanstack/react-router";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";

// Earning Rules became Program › Earning. Kept so bookmarks and old links still land.
export const Route = createFileRoute("/dashboard/loyalty/earning-rules/")({
  beforeLoad: () => {
    throw redirect({ to: LOYALTY_PATHS.program, search: { section: "earning" }, replace: true });
  },
});
