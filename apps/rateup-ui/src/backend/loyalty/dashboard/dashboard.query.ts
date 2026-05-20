import { axiosClient } from "@/backend/apiClient";

const BASE_PATH = "/loyalty/dashboard/";

interface LoyaltyDashboardStats {
  programExists: boolean;
  programId: string;
  currencySymbol: string;
  summary: {
    totalMembers: number;
    totalMembersChange: number | null;
    activeThisMonth: number;
    activeThisMonthChange: number | null;
    pointsIssued: number;
    pointsIssuedChange: number | null;
    rewardsRedeemed: number;
    rewardsRedeemedChange: number | null;
  };
  memberGrowth: {
    month: string;
    members: number;
    active: number;
  }[];
  pointsActivity: {
    month: string;
    issued: number;
    redeemed: number;
  }[];
  tierDistribution: {
    name: string;
    value: number;
  }[];
  popularRewards: {
    id: string;
    name: string;
    pointsCost: number;
    count: number;
  }[];
  recentActivity: {
    user: string;
    action: string;
    item: string;
    points: number;
    createdAt: string;
  }[];
}

export const getLoyaltyDashboardData =
  async (): Promise<LoyaltyDashboardStats> => {
    return (await axiosClient.get(`${BASE_PATH}`))?.data;
  };
