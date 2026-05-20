import { useQuery } from "@tanstack/react-query";

import { getUsageStats } from "./stats.api";

export const useUsageStats = () =>
  useQuery({
    queryKey: ["stats"],
    queryFn: getUsageStats,
  });
