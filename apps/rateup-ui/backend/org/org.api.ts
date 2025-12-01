import { WaAssignedChatPermission } from "@/types/enums";

import { axiosClient } from "../apiClient";

export async function getTeamsMembersOfOrg() {
  try {
    let members: MembersResponse = (
      await axiosClient.get("/org/members-with-teams")
    ).data;
    return members;
  } catch (e) {
    console.error(e);
    //return { error: "Error Occured!" };
  }
}

export async function getAllTeamsMembersOfOrg() {
  try {
    let members = (
      await axiosClient.get("/org/members-with-teams-and-invitation")
    ).data;
    return members;
  } catch (e) {
    console.error(e);
    //return { error: "Error Occured!" };
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
}
export const updateOrgDetails = (data: Partial<IUpdateOrgDetails>) =>
  axiosClient.put("/org/update-details", data);

export async function getAllOrgs() {
  return (await axiosClient.get("/org")).data as Array<
    Org & {
      _count: { members: number; teams: number; invitations: number };
      owner: { id: string; name: string; email: string };
    }
  >;
}
export async function getOrgStats(orgId: string) {
  return (await axiosClient.get(`/org/${orgId}`)).data;
}

export async function deleteOrg(orgId: string) {
  return await axiosClient.delete(`org/${orgId}`);
}

export async function updateOrgPause({ orgId, data }) {
  return await axiosClient.put(`org/pause/${orgId}`, data);
}

export async function getWebhookClientSecret() {
  return (await axiosClient.get(`org/webhook-client-secret`)).data;
}

export async function completeOrgDetails(onboarding) {
  await axiosClient.put("/org/completeorgdetails", {
    onboarding,
  });
}

export async function orgNameAndPhone() {
  const res = await axiosClient.get("/org/orgnameandphone");
  return res.data;
}
