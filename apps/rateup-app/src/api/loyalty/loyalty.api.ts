import axios from "@/src/config/axios";
import {
  AssignRewardRequest,
  AssignRewardResponse,
  CustomerRewardsResponse,
  LoyaltyTier,
} from "./loyalty.type";

const base = "/api/loyalty/accounts";
const LOYALTY_ROUTES_BASE = "/api/loyalty/tiers";

export async function getCustomerRewardsByPhone(
  phone: string,
): Promise<CustomerRewardsResponse> {
  const response = await axios.get(`${base}/phone/${phone}`);
  return response.data;
}

export const getLoyaltyTiers = async (): Promise<LoyaltyTier[]> => {
  const response = await axios.get(LOYALTY_ROUTES_BASE);
  return response.data;
};

export async function awardPoints(data: {
  contactId: string;
  purchaseAmount: number;
  locationId?: string;
  productCategories?: string[];
  productSkus?: string[];
  paymentMethod?: string;
  channel?: string;
  orderId?: string;
  notes?: string;
}) {
  return (await axios.post(`${base}/award-points`, data)).data;
}

export async function redeemReward(data: {
  customerId: string;
  rewardId: string;
  locationId?: string;
  orderId?: string;
  notes?: string;
}) {
  await axios.post(`${base}/redeem`, data);
}

export async function assignRewardToCustomer(
  payload: AssignRewardRequest,
): Promise<AssignRewardResponse> {
  const res = await axios.post(
    `${base}/${payload.customerId}/assign-reward`,
    payload,
  );
  return res.data;
}

export async function redeemRewardByShortCode(shortCode: string) {
  return (await axios.post(`${base}/rewards/${shortCode}/redeem`)).data;
}
