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
}
export const updateOrgDetails = (data: IUpdateOrgDetails) =>
  axiosClient.put("/org/update-details", data);

export async function getAllOrgs() {
  return (await axiosClient.get("/org")).data as Array<
    Org & {
      _count: { members: number; teams: number; invitations: number };
      owner: { id: string; name: string };
    }
  >;
}
export async function getOrgStats(orgId: string) {
  return (await axiosClient.get(`/org/${orgId}`)).data;
}
