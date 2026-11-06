import { createFileRoute, redirect } from "@tanstack/react-router";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";

// The template library is Messages › Templates. The editor at /templates/:id stays. Kept
// so old links still land.
export const Route = createFileRoute("/dashboard/loyalty/templates/")({
  beforeLoad: () => {
    throw redirect({ to: LOYALTY_PATHS.messages, search: { tab: "templates" }, replace: true });
  },
});
