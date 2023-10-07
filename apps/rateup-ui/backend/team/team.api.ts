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
  name: string;
  googleLink: string;
  code: string;
}

export const createTeam = (data: ICreateTeam) =>
  axiosClient({
    url: `/team`,
    method: "POST",
    data: data,
  });

export const editTeam = (teamId: string, data: IEditTeam) =>
  axiosClient({
    url: `/team/edit/${teamId}`,
    method: "PUT",
    data: data,
  });

export const getTeamsByOrg = (orgId: String) =>
  axiosClient({
    url: `/team/${orgId}`,
    method: "GET",
  });

export const getTeamsByUser = () =>
  axiosClient({
    url: `/team/user`,
    method: "GET",
  });

export const fetchTeamsByUserWithCustomToken = async (token: string) => {
  try {
    const response = await axiosClient.get(`/team/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.log(error);
    if (error?.response?.data?.message) {
      return error?.response?.data?.message;
    } else {
      return [];
    }
  }
};

export const deleteTeamById = (id: String) =>
  axiosClient({
    url: `/team/${id}`,
    method: "DELETE",
  });

export const inviteTeamMember = (data: IInviteMember) =>
  axiosClient({
    url: `/team/invite`,
    method: "POST",
    data: data,
  });

export const completeInvite = (inviteToken: String) =>
  axiosClient({
    url: `/team/complete-invite/${inviteToken}`,
    method: "POST",
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

export const getTeamMembersFromInvitation = (teamId: String) =>
  axiosClient({
    url: `/team/invitation/${teamId}`,
    method: "GET",
  });

export const getTeamSurveys = (teamId: String) =>
  axiosClient({
    url: `/survey/team/${teamId}`,
    method: "GET",
  });
