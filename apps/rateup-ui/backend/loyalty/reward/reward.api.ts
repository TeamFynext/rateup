import { axiosClient } from "../../apiClient";
import { LOYALTY_BASE } from "../base";

const base = LOYALTY_BASE + "/reward";

export async function getRewards() {
  return (await axiosClient.get(base)).data;
}
export async function createReward(reward) {
  return await axiosClient.post(base, reward);
}
export async function getReward(rewardId: string) {
  return (await axiosClient.get(base + "/" + rewardId)).data;
}
export async function updateReward(reward) {
  return await axiosClient.put(`${base}/${reward.id}`, reward);
}
export async function deleteReward(id: string) {
  return await axiosClient.delete(base + "/" + id);
}
