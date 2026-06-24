import { axiosClient } from "../apiClient";

const LOYALTY_BASE = "/loyalty";

interface LoyaltyTier {
  id: string;
  programId: string;
  name: string;
  threshold: number;
  pointsMultiplier: string;
  color: string;
  benefitsDescription?: string;
  priority: number;
  createdAt: string;
  program: {
    currencyCode: string;
  };
}

export interface LoyaltyTierInput {
  name: string;
  color: string;
  pointsMultiplier: number;
  threshold: number;
  description?: string;
  benefits?: string[];
}

interface LoyaltyTierDetails extends LoyaltyTier {
  customers?: Array<{ id: string }>;
}

export async function getLoyaltyTiers() {
  const res = await axiosClient.get(`${LOYALTY_BASE}/tiers`);
  return res.data as LoyaltyTier[];
}

export async function createLoyaltyTier(data: LoyaltyTierInput) {
  const res = await axiosClient.post(`${LOYALTY_BASE}/tiers`, data);
  return res.data as LoyaltyTier;
}

export async function getLoyaltyTierById(id: string) {
  const res = await axiosClient.get(`${LOYALTY_BASE}/tiers/${id}`);
  return res.data as LoyaltyTierDetails;
}

export async function updateLoyaltyTier(id: string, data: Partial<LoyaltyTierInput>) {
  const res = await axiosClient.put(`${LOYALTY_BASE}/tiers/${id}`, data);
  return res.data as LoyaltyTier;
}

export async function deleteLoyaltyTier(id: string, options?: { downgradeCustomers?: boolean }) {
  const res = await axiosClient.delete(`${LOYALTY_BASE}/tiers/${id}`, {
    params: {
      downgradeCustomers: options?.downgradeCustomers,
    },
  });
  return res.data;
}
