import { createFileRoute, redirect } from "@tanstack/react-router";

import { Analytics } from "@/components/dashboard/analytics/Analytics.tsx";
import {
  type AnalyticsSearch,
  isLegacyAnalyticsTab,
  parseAnalyticsSearch,
} from "@/components/dashboard/analytics/analyticsView.ts";

export const Route = createFileRoute("/dashboard/analytics/")({
  /** Declares the search params this route reads, so links to it type-check. */
  validateSearch: (search: Record<string, unknown>): AnalyticsSearch =>
    parseAnalyticsSearch(search),
  // Bookmarks to the six old tabs land on the view that replaced them, with a URL the
  // nav can match.
  beforeLoad: ({ location, search }) => {
    const tab = new URLSearchParams(location.searchStr).get("tab");
    if (isLegacyAnalyticsTab(tab)) {
      throw redirect({ to: "/dashboard/analytics", search, replace: true });
    }
  },
  component: Analytics,
});
