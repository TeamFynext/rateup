import { axiosClient } from '../apiClient'

export interface ICreateTeam {
    name: string; 
    orgId: string; 
    userId: string;
}


export interface IInviteMember {
    name: string; 
    orgId: string; 
    invitedBy: string;
    teamId: string;
    email: string;

}

export const createTeam = (data: ICreateTeam) => axiosClient({
    url: `/team`,
    method: 'POST',
    data: data
})

export const getTeamsByOrg = (orgId: String) => axiosClient({
    url: `/team/${orgId}`,
    method: 'GET',
})

export const getTeamsByUser = () => axiosClient({
    url: `/team/user`,
    method: 'GET',
})

export const deleteTeamById = (id: String) => axiosClient({
    url: `/team/${id}`,
    method: 'DELETE',
})

export const inviteTeamMember = (data: IInviteMember) => axiosClient({
    url: `/team/invite`,
    method: 'POST',
    data: data
})

export const completeInvite = (inviteToken: String) => axiosClient({
    url: `/team/complete-invite/${inviteToken}`,
    method: 'POST',
})

export const deleteInviteById = (id: String) => axiosClient({
    url: `/team/invite/${id}`,
    method: 'DELETE',
})


export const getTeamMembers= (teamId: String) => axiosClient({
    url: `/team/members/${teamId}`,
    method: 'GET',
})

export const getTeamMembersFromInvitation= (teamId: String) => axiosClient({
    url: `/team/invitation/${teamId}`,
    method: 'GET',
})