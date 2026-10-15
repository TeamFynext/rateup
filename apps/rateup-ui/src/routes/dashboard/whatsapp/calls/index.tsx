import { createFileRoute, redirect } from "@tanstack/react-router";

// Calls moved under Analytics; old links and bookmarks land on the page that replaced it.
export const Route = createFileRoute("/dashboard/whatsapp/calls/")({
  validateSearch: (search: Record<string, unknown>): { tab?: "analytics" } => ({
    tab: search.tab === "analytics" ? "analytics" : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/dashboard/analytics/calls", search, replace: true });
  },
});
