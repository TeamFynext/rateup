import { useQuery } from "@tanstack/react-query";

import { getUsageStats } from "./stats.api";

/**
 * `enabled` is for callers mounted app-wide (the sidebar): this query is
 * deliberately staleTime:0 and refetches on focus, so it should only run on the
 * screens that show a usage number. Defaults to on for the billing pages.
 */
export const useUsageStats = (enabled = true) =>
  useQuery({
    queryKey: ["stats"],
    queryFn: getUsageStats,
    enabled,
    // Usage counters change server-side (messages, responses, resets), so
    // always pull fresh numbers whenever the billing page is (re)visited.
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
