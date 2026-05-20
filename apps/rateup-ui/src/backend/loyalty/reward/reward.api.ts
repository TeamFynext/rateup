import { axiosClient } from "../../apiClient";
import { LOYALTY_BASE } from "../base.ts";

const base = LOYALTY_BASE + "/rewards";

export async function getLoyaltyRewards() {
  return (await axiosClient.get(base)).data;
}
export async function createLoyaltyReward(reward) {
  return await axiosClient.post(base, reward);
}
export async function getLoyaltyRewardById(rewardId: string) {
  return (await axiosClient.get(base + "/" + rewardId)).data;
}
export async function updateLoyaltyReward(rewardId: string, data) {
  return await axiosClient.put(`${base}/${rewardId}`, data);
}
export async function deleteReward(id: string) {
  return await axiosClient.delete(base + "/" + id);
}
