import { axiosClient } from "../apiClient";

export interface ICreateTeam {
  name: string;
  orgId: string;
  userId: string;
  whatsappAccessToken: string;
}

export interface IInviteMember {
  name: string;
  orgId: string;
  invitedBy: string;
  teamId: string;
  email: string;
}

export interface IEditTeam {
  name?: string;
  googleLink?: string;
  reviewPageLinks?: object;
  code?: string;
  tags?: string[];
  color?: string;
}

export const createTeam = (data: ICreateTeam) =>
  axiosClient({
    url: `/team`,
    method: "POST",
    data: data,
  });

export const editTeam = (teamId: string, data: IEditTeam, onlyTag?: boolean) =>
  axiosClient({
    url: `/team/edit/${teamId}${onlyTag ? `?onlytag=true` : ""}`,
    method: "PUT",
    data: data,
  });

export const getTeamsByOrg = (orgId: String) =>
  axiosClient({
    url: `/team/${orgId}`,
    method: "GET",
  });

export async function getTeamsByUser() {
  let teams: TeamsResponse = (await axiosClient.get("/team/user")).data;
  return teams;
}

export const deleteTeamById = (id: String) =>
  axiosClient({
    url: `/team/${id}`,
    method: "DELETE",
  });

export const inviteTeamMember = async (data: IInviteMember) =>
  axiosClient({
    url: `/team/invite`,
    method: "POST",
    data: data,
  });

export const resendInviteTeamMember = async (id: string) => {
  const Response = await axiosClient.put(`/team/invite/resend/${id}`, {});
  return Response?.data;
};

export const completeInvite = (inviteToken: String) =>
  axiosClient({
    url: `/team/complete-invite/${inviteToken}`,
    method: "POST",
    timeout: 30000,
  });

export const deleteInviteById = (id: String) =>
  axiosClient({
    url: `/team/invite/${id}`,
    method: "DELETE",
  });

export const getTeamMembers = (teamId: String) =>
  axiosClient({
    url: `/team/members/${teamId}`,
    method: "GET",
  });

export const getNotTeamMembers = (teamId: String) =>
  axiosClient({
    url: `/team/notmembers/${teamId}`,
    method: "GET",
  });

export async function getTeamMembersFromInvitation(teamId: String) {
  let teamData: ITeamResponseData = (
    await axiosClient.get(`/team/invitation/${teamId}`)
  ).data;
  return teamData;
}

export const getTeamSurveys = (teamId: String) =>
  axiosClient({
    url: `/survey/team/${teamId}`,
    method: "GET",
  });

export async function getSurveyLanguagesFromTeam(teamId: string) {
  const res = await axiosClient.get(`/team/${teamId}/survey-languages`);
  return res.data as string[];
}

export async function addUsertoTeams({ userId, teamIds, userEmail }) {
  await axiosClient.post(`/team/members/${userId}`, { teamIds, userEmail });
}

export async function removeUserFromTeam({ teamId, userId }) {
  await axiosClient.delete(`/team/member?teamId=${teamId}&userId=${userId}`);
}
