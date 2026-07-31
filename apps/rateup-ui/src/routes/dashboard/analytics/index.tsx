import { createFileRoute } from "@tanstack/react-router";

import Analytics from "@/components/whatsapp/inbox/analytics/analaytics.tsx";

export const Route = createFileRoute("/dashboard/analytics/")({
  /** Declares the search params this route reads, so links to it type-check. */
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  component: page,
});

function page() {
  return <Analytics />;
}
