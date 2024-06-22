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
  encryptionKeys: EncryptionKeys;
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

export async function getAuthorizationUrl() {
  const res = await axiosClient.get(`org/auth-url`);
  return res.data;
}

export async function createAuthToken(data) {
  const res = await axiosClient.post(`org/auth-token`, data);
  return res.data;
}

type GoogleAuthAccess = {
  isExist: boolean;
  auth: {
    accessToken: string;
    refreshToken: string;
    expiryDate: string;
    scopes: Array<string>;
    userEmail: string;
  };
};
export async function getGoogleAccessToken() {
  const res = await axiosClient.get(`org/google-auth-access`);
  return res.data as GoogleAuthAccess;
}

export async function deleteAuthToken() {
  const res = await axiosClient.delete(`org/auth-token`);
  return res.data;
}

export async function deleteOrg(surveyId: string) {
  return await axiosClient.delete(`org/${surveyId}`);
}
