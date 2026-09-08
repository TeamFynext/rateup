import { createFileRoute, redirect } from "@tanstack/react-router";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";

// Commands became Messages › Keyword replies. Kept so bookmarks and old links still land.
export const Route = createFileRoute("/dashboard/loyalty/command/")({
  beforeLoad: () => {
    throw redirect({ to: LOYALTY_PATHS.messages, search: { section: "keywords" }, replace: true });
  },
});
