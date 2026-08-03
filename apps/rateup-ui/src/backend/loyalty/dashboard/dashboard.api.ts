import { useQuery } from "@tanstack/react-query";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";

import { getLoyaltyDashboardData } from "./dashboard.query";

export const useLoyaltyDashboardData = () => {
  return useQuery({
    queryKey: loyaltyKeys.dashboard(),
    queryFn: getLoyaltyDashboardData,
  });
};
