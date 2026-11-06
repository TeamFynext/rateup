import { axiosClient } from "../apiClient";

export interface ICreateReferralResponse {
  referral_code: string;
}

export interface IReferral {
  id: string;
  referral_code: string;
  name: string;
  email: string;
  visit_count: number;
  signup_count: number;
  created_at: string;
}

export async function createReferral(
  name: string,
  email: string,
): Promise<ICreateReferralResponse> {
  const response = await axiosClient.post("/referrals", { name, email });
  return response.data;
}

export async function getAllReferrals(): Promise<IReferral[]> {
  const response = await axiosClient.get("/referrals");
  return response.data;
}

export async function deleteReferral(id: string): Promise<void> {
  await axiosClient.delete(`/referrals/${id}`);
}

export async function trackVisit(code: string): Promise<void> {
  await axiosClient.post("/referrals/track-visit", { code });
}
