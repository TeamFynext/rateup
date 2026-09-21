import type { RequestPayload } from "@/types/api.ts";
import type { WaAssignedChatPermission } from "@/types/enums.ts";

/**
 * The setup wizard's per-step completion flags. Mirrors the API's
 * `onboardingChecklist` zod object; every step is optional.
 */
/** Steps the org has waved off, keyed the same way the checklist is. */
export interface OnboardingChecklistSkips {
  instagram?: boolean;
  messenger?: boolean;
  invite?: boolean;
  hours?: boolean;
  auto?: boolean;
  points?: boolean;
  cmds?: boolean;
}

export interface OnboardingChecklist {
  api?: boolean;
  verify?: boolean;
  payment?: boolean;
  instagram?: boolean;
  messenger?: boolean;
  invite?: boolean;
  hours?: boolean;
  auto?: boolean;
  points?: boolean;
  tiers?: boolean;
  rewards?: boolean;
  referral?: boolean;
  cmds?: boolean;
  loyaltyauto?: boolean;
  /** Nested so skip state travels with the checklist rather than needing a column. */
  skipped?: OnboardingChecklistSkips;
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

/** Either spelling; `roleKey` (src/utils/authz/roles.ts) is the one this app sends. */
export interface IUpdateRole {
  role?: string;
  roleKey?: string;
}

export interface IMemberPermissions {
  grants: string[];
  denies: string[];
}

export const updateMemberPermissions = (memberId: string, data: IMemberPermissions) =>
  axiosClient({ url: `/org/members/${memberId}/permissions`, method: "PUT", data });

export interface MemberActivityItem {
  id: string;
  action: string;
  method: string;
  route: string;
  createdAt: string;
}

export interface MemberActivityPage {
  items: MemberActivityItem[];
  total: number;
  page: number;
  limit: number;
}

export async function getMemberActivity(memberId: string, page: number, limit = 25) {
  const res = await axiosClient.get<MemberActivityPage>(`/org/members/${memberId}/activity`, {
    params: { page, limit },
  });
  return res.data;
}

export const transferOwnership = (userId: string) =>
  axiosClient({ url: "/org/transfer-ownership", method: "POST", data: { userId } });

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

/** Response of `GET /org/orgnameandphone`; each field is null when unset. */
export interface OrgNameAndPhone {
  userPhone: string | null;
  orgName: string | null;
  nameOfUser: string | null;
}

export async function orgNameAndPhone(): Promise<OrgNameAndPhone> {
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
