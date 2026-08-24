import { axiosClient } from "../apiClient";

/** One month of a time series. `month` is an ISO `YYYY-MM-01`. */
export interface MonthlyPoint {
  month: string;
  value: number;
}

export interface AdminOverview {
  generatedAt: string;
  months: number;
  totals: {
    orgs: number;
    users: number;
    activeUsers: number;
    paidSubscriptions: number;
    /** Rupees. The API normalises the gateway's minor units before sending. */
    revenueAllTime: number;
    revenueThisMonth: number;
    mrr: number;
    arpa: number;
  };
  revenue: MonthlyPoint[];
  signups: { orgs: MonthlyPoint[]; users: MonthlyPoint[] };
  planMix: { plan: string; orgs: number }[];
  orderOutcomes: { status: string; orders: number }[];
  usage: {
    conversations: number;
    formSubmissions: number;
    messages: number;
    aiTokens: number;
    campaigns: number;
  };
  topOrgsByConversations: { org: string; conversations: number }[];
}

export async function getAdminOverview(months: number) {
  // The whole page is one aggregate, so a slow month of data must not trip the client's
  // default timeout and leave the dashboard empty.
  const res = await axiosClient.get("/admin/overview", { params: { months }, timeout: 0 });
  return res.data as AdminOverview;
}
