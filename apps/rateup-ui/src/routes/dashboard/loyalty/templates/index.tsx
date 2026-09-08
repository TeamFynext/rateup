import { createFileRoute, redirect } from "@tanstack/react-router";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";

// WhatsApp Templates became Messages › Automated notifications, one row per message with
// its Meta state. The editor at /templates/:id stays. Kept so old links still land.
export const Route = createFileRoute("/dashboard/loyalty/templates/")({
  beforeLoad: () => {
    throw redirect({
      to: LOYALTY_PATHS.messages,
      search: { section: "notifications" },
      replace: true,
    });
  },
});
