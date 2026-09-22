import { api } from "./client";
import type { IsoDate } from "./types";

export interface MonthlyPoint {
  /** `YYYY-MM-01` */
  month: string;
  value: number;
}

/** `GET /overview`: rateup-api's getAdminOverview plus the expiring-soon panel. */
export interface Overview {
  generatedAt: IsoDate;
  months: number;
  totals: {
    orgs: number;
    users: number;
    activeUsers: number;
    paidSubscriptions: number;
    /** Rupees. */
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
  topOrgsByConversations: { orgId: string; org: string; conversations: number }[];
  expiringSoon: {
    windowDays: number;
    total: number;
    orgs: {
      orgId: string;
      name: string;
      logo: string | null;
      plan: string | null;
      expiresAt: IsoDate;
    }[];
  };
}

export async function getOverview(months: number): Promise<Overview> {
  const { data } = await api.get<{ data: Overview }>("/overview", { params: { months } });
  return data.data;
}
