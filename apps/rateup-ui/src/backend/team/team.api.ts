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

export const editTeam = (teamId: string, data: IEditTeam, onlyTag?: boolean) => {
  const query = onlyTag ? "?onlytag=true" : "";
  return axiosClient({
    url: `/team/edit/${teamId}${query}`,
    method: "PUT",
    data: data,
  });
};

const getTeamsByOrg = (orgId: string) =>
  axiosClient({
    url: `/team/${orgId}`,
    method: "GET",
  });

export async function getTeamsByUser() {
  const teams: TeamsResponse = (await axiosClient.get("/team/user")).data;
  return teams;
}

export const deleteTeamById = (id: string) =>
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

export const completeInvite = (inviteToken: string) =>
  axiosClient({
    url: `/team/complete-invite/${inviteToken}`,
    method: "POST",
    timeout: 30000,
  });

export const deleteInviteById = (id: string) =>
  axiosClient({
    url: `/team/invite/${id}`,
    method: "DELETE",
  });

const getTeamMembers = (teamId: string) =>
  axiosClient({
    url: `/team/members/${teamId}`,
    method: "GET",
  });

export const getNotTeamMembers = (teamId: string) =>
  axiosClient({
    url: `/team/notmembers/${teamId}`,
    method: "GET",
  });

export async function getTeamMembersFromInvitation(teamId: string) {
  const teamData = (await axiosClient.get(`/team/invitation/${teamId}`)).data;
  return teamData;
}

export const getTeamSurveys = (teamId: string) =>
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

export async function getTeamById(teamId) {
  const res = await axiosClient.get(`/team/teams/${teamId}`);
  return res.data;
}

// ─── Team Features ────────────────────────────────────────────────────────────

interface TeamFeatureItem {
  id: string;
  feature: string;
  createdAt: string;
}

export interface TeamFeaturesResponse {
  features: TeamFeatureItem[];
}

export async function getTeamFeatures(teamId: string): Promise<TeamFeaturesResponse> {
  const res = await axiosClient.get(`/team/${teamId}/features`);
  return res.data;
}

export async function updateTeamFeatures(
  teamId: string,
  features: string[],
): Promise<TeamFeaturesResponse> {
  const res = await axiosClient.put(`/team/${teamId}/features`, { features });
  return res.data;
}
