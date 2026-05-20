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
  data?: {
    id: string;
    customerId: string;
    rewardId: string;
    assignedAt: string;
    notes?: string;
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
