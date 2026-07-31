import type { RequestPayload } from "@/types/api.ts";
import type { WaAssignedChatPermission } from "@/types/enums.ts";

/**
 * The setup wizard's per-step completion flags. Mirrors the API's
 * `onboardingChecklist` zod object; every step is optional.
 */
export interface OnboardingChecklist {
  api?: boolean;
  verify?: boolean;
  payment?: boolean;
  invite?: boolean;
  auto?: boolean;
  points?: boolean;
  tiers?: boolean;
  rewards?: boolean;
  referral?: boolean;
  cmds?: boolean;
  loyaltyauto?: boolean;
}

import { axiosClient } from "../apiClient";

export async function getTeamsMembersOfOrg() {
  try {
    const members: MembersResponse = (await axiosClient.get("/org/members-with-teams")).data;
    return members;
  } catch (e) {
    console.error(e);
    // return { error: "Error Occured!" };
  }
}

export async function getAllTeamsMembersOfOrg() {
  try {
    const members = (await axiosClient.get("/org/members-with-teams-and-invitation")).data;
    return members;
  } catch (e) {
    console.error(e);
    // return { error: "Error Occured!" };
  }
}

export interface IUpdateRole {
  role: string;
}

export interface IUpdateLogo {
  logo: string;
}

export const updateRole = (memberId: string, data: IUpdateRole) =>
  axiosClient({
    url: `/org/members/change-role/${memberId}`,
    method: "PUT",
    data: data,
  });

export const updateOrgLogo = (data: IUpdateLogo) =>
  axiosClient({
    url: `/org/update-logo`,
    method: "PUT",
    data: data,
  });

export interface IUpdateOrgDetails {
  name: string;
  phone: string;
  address: string;
  businessmail: string;
  location: string;
  industry: string;
  website: string;
  encryptionKeys: EncryptionKeys;
  waAssignedChatPermission: WaAssignedChatPermission;
  showLifecycle: boolean;
  onboardingChecklistCompleted: boolean;
  onboardingChecklist: OnboardingChecklist;
  isConversionApiActive: boolean;
}
export const updateOrgDetails = (data: Partial<IUpdateOrgDetails>) =>
  axiosClient.put("/org/update-details", data);

/** An organisation row as the admin org list returns it. */
export type AdminOrg = Org & {
  _count: { members: number; teams: number; invitations: number };
  owner: { id: string; name: string; email: string };
  AuditLog: { createdAt: string }[];
};

export async function getAllOrgs() {
  return (await axiosClient.get("/org")).data as AdminOrg[];
}
export async function getOrgStats(orgId: string) {
  return (await axiosClient.get(`/org/${orgId}`)).data;
}

export async function deleteOrg(orgId: string) {
  return await axiosClient.delete(`org/${orgId}`);
}

export async function updateOrgPause({ orgId, data }: { orgId: string; data: RequestPayload }) {
  return await axiosClient.put(`org/pause/${orgId}`, data);
}

export async function getWebhookClientSecret() {
  return (await axiosClient.get(`org/webhook-client-secret`)).data;
}

export async function completeOrgDetails(onboarding: RequestPayload) {
  await axiosClient.put("/org/completeorgdetails", {
    onboarding,
  });
}

export async function orgNameAndPhone() {
  const res = await axiosClient.get("/org/orgnameandphone");
  return res.data;
}

/** Response of `GET /org/checklist`; the API defaults both fields when unset. */
export interface OnboardingChecklistResponse {
  onboardingChecklist: OnboardingChecklist;
  onboardingChecklistCompleted: boolean;
}

export async function getChecklist(): Promise<OnboardingChecklistResponse> {
  const res = await axiosClient.get("/org/checklist");
  return res.data;
}

export async function sendDeleteOrgEmail(orgId: string) {
  return await axiosClient.post(`/org/org-deletion-warning-mail/${orgId}`);
}

export async function deleteOrgByAdmin(orgId: string) {
  return await axiosClient.delete(`/org/admin/${orgId}`);
}
