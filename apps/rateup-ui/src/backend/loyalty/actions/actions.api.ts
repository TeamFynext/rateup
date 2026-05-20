import { axiosClient } from "@/backend/apiClient";

import { LOYALTY_BASE } from "../base.ts";

const actionBaseUrl = LOYALTY_BASE + "/action";

export async function getLoyaltyActions() {
  return (await axiosClient.get(actionBaseUrl)).data;
}

export async function createLoyaltyAction(data) {
  await axiosClient.post(actionBaseUrl, data);
}

export async function updateLoyaltyAction(data, actionId) {
  await axiosClient.put(`${actionBaseUrl}/${actionId}`, data);
}

export async function getLoyaltyActionById(actionId) {
  return (await axiosClient.get(`${actionBaseUrl}/${actionId}`)).data;
}

export async function deleteLoyaltyActionById(actionId) {
  await axiosClient.delete(`${actionBaseUrl}/${actionId}`);
}

interface referalProps {
  referralCode: string;
  data: {
    refereePhone: string;
    refereeName?: string;
    amount?: number;
    actionIds: string[];
    issuePurchasePoints?: boolean;
  };
}

export async function referralLoyaltyAction({
  referralCode,
  data,
}: referalProps) {
  await axiosClient.post(`${actionBaseUrl}/${referralCode}`, data);
}

type BulkActionProps = {
  customerIds: string[];
  actionIds: string[];
  groupIds: string[];
  isAllCustomer: boolean;
  isAllGroups: boolean;
  isAllActions: boolean;
  amount?: number;
};

export async function bulkLoyaltyAction(data: BulkActionProps) {
  return await axiosClient.post(`${actionBaseUrl}/bulk`, data);
}
