import { useQuery } from "@tanstack/react-query";

import { getLoyaltyDashboardData } from "./dashboard.query";

export const useLoyaltyDashboardData = () => {
  return useQuery({
    queryKey: ["loyaltyDashboardData"],
    queryFn: getLoyaltyDashboardData,
  });
};
