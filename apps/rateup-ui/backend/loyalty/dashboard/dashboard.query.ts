import { axiosClient } from "@/backend/apiClient";

const BASE_PATH = "/loyalty/dashboard/";

interface SummaryData {
  title: string;
  id: number;
  value: number;
}

interface OverallActionsData {
  name: string;
  totalActions: number;
  type: string;
}

interface ActionName {
  title: string;
  type: string;
}

interface TopActionsData {
  name: ActionName;
  participants: number;
  points: number;
}

interface TopPerformersData {
  name: string;
  total_actions: number;
  recent_actions: number;
}

interface TopRedeemedRewardsData {
  name: string;
  times_redeemed: number;
  required_points: number;
}

interface LoyaltyDashboardStats {
  summaryData: SummaryData[];
  overallActionsData: OverallActionsData[];
  topActionsData: TopActionsData[];
  topPerformersData: TopPerformersData[];
  topRedeemedRewardsData: TopRedeemedRewardsData[];
}

export const getLoyaltyDashboardData =
  async (): Promise<LoyaltyDashboardStats> => {
    return (await axiosClient.get(`${BASE_PATH}`))?.data;
  };
