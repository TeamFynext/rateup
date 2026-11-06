import { useQuery } from "@tanstack/react-query";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";

import { getLoyaltyDashboardData, type DashboardPeriod } from "./dashboard.query";

/** The browser's zone, so "today" on the Overview is the merchant's today. */
export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export const useLoyaltyDashboardData = (period: DashboardPeriod = "30d", enabled = true) => {
  const tz = browserTimeZone();
  return useQuery({
    queryKey: loyaltyKeys.dashboard(period, tz),
    queryFn: () => getLoyaltyDashboardData({ period, tz }),
    enabled,
    // Aggregates over a 30-day window do not move by the second; the sidebar also reads
    // this and must not refetch it on every focus.
    staleTime: 60_000,
  });
};
