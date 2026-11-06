import { axiosClient } from "@/backend/apiClient";

const LOYALTY_BASE = "/loyalty";

export interface AssignRewardRequest {
  rewardId: string;
  notes?: string;
  customerId: string;
}

export interface AssignRewardResponse {
  success: boolean;
  message: string;
  /** The `CustomerReward` row the API minted — `shortCode` is what staff type to use it. */
  data?: {
    id: string;
    customerId?: string;
    accountId?: string;
    rewardId: string;
    shortCode?: string;
    status?: string;
    assignedAt: string;
    notes?: string;
    reward?: { id: string; name: string; pointsCost: number; rewardType: string };
  };
}

export async function assignRewardToCustomer(
  payload: AssignRewardRequest,
): Promise<AssignRewardResponse> {
  const res = await axiosClient.post(
    `${LOYALTY_BASE}/accounts/${payload.customerId}/assign-reward`,
    payload,
  );
  return res.data;
}
