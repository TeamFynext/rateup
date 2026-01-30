import { axiosClient } from "@/backend/apiClient";

const BASE_PATH = "/loyalty/dashboard/";

interface LoyaltyDashboardStats {
  programExists: boolean;
  programId: string;
  currencySymbol: string;
  defaultCountryCode: string;
  summary: {
    totalCustomers: number;
    pointsIssued: number;
    pointsRedeemed: number;
  };
  analytics: {
    pointsEarnedVsRedeemed: {
      date: string;
      earned: number;
      redeemed: number;
    }[];
    customerGrowthOverTime: {
      date: string;
      newCustomers: number;
      totalCustomers: number;
    }[];
  };
  tierBreakdown: {
    tierId: string;
    name: string;
    count: number;
  }[];
  popularRewards: {
    id: string;
    name: string;
    pointsCost: number;
    count: number;
  }[];
}

export const getLoyaltyDashboardData =
  async (): Promise<LoyaltyDashboardStats> => {
    return (await axiosClient.get(`${BASE_PATH}`))?.data;
  };
