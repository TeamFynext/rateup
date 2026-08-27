import { useQuery } from "@tanstack/react-query";

import { getAdminOverview } from "./admin.api";

export function useAdminOverview(months: number) {
  return useQuery({
    queryKey: ["adminOverview", months],
    queryFn: () => getAdminOverview(months),
    // Business figures move slowly; refetching on every focus just re-runs a dozen
    // aggregates over the whole database.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
